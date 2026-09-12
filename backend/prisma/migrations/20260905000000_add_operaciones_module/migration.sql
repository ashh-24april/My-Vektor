
-- ==============================================================================
-- MÓDULO DE OPERACIONES: GESTIÓN DE FLOTA Y ASIGNACIÓN DE PILOTOS
-- Compatible con PostgreSQL y Supabase
-- ==============================================================================

-- 1. Actualización de tabla VEHICULO
ALTER TABLE "vehiculo" ADD COLUMN IF NOT EXISTS "horometro" INT DEFAULT 0;
ALTER TABLE "vehiculo" ADD COLUMN IF NOT EXISTS "venc_circulacion" DATE;
ALTER TABLE "vehiculo" ADD COLUMN IF NOT EXISTS "venc_seguro" DATE;
ALTER TABLE "vehiculo" ADD COLUMN IF NOT EXISTS "venc_revision" DATE;
ALTER TABLE "vehiculo" ADD COLUMN IF NOT EXISTS "id_piloto_asignado" INT;

-- Foreign key opcional de vehículo a piloto asignado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vehiculo_piloto_asignado' AND table_name = 'vehiculo'
    ) THEN
        ALTER TABLE "vehiculo" 
        ADD CONSTRAINT "fk_vehiculo_piloto_asignado" 
        FOREIGN KEY ("id_piloto_asignado") REFERENCES "piloto"("id_piloto") ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_vehiculo_placa" ON "vehiculo"("placa");
CREATE INDEX IF NOT EXISTS "idx_vehiculo_estado" ON "vehiculo"("estado");
CREATE INDEX IF NOT EXISTS "idx_vehiculo_piloto_asig" ON "vehiculo"("id_piloto_asignado");

-- 2. Actualización de tabla PILOTO
ALTER TABLE "piloto" ADD COLUMN IF NOT EXISTS "estado" VARCHAR(30) DEFAULT 'Disponible';

CREATE INDEX IF NOT EXISTS "idx_piloto_estado" ON "piloto"("estado");
CREATE INDEX IF NOT EXISTS "idx_piloto_licencia" ON "piloto"("num_licencia");
CREATE INDEX IF NOT EXISTS "idx_piloto_vencimiento" ON "piloto"("venc_licencia");

-- 3. Trigger para sincronizar disponibilidad de piloto y vehículo
CREATE OR REPLACE FUNCTION fn_sincronizar_estado_operativo()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el vehículo cambia a 'En Ruta', el piloto asignado pasa a 'En Viaje'
    IF NEW.estado = 'En Ruta' AND NEW.id_piloto_asignado IS NOT NULL THEN
        UPDATE "piloto" 
        SET "estado" = 'En Viaje', "disponible" = FALSE, "updated_at" = NOW()
        WHERE "id_piloto" = NEW.id_piloto_asignado;
    -- Si el vehículo queda 'Disponible' y el piloto estaba en viaje con esta unidad, liberarlo
    ELSIF NEW.estado = 'Disponible' AND NEW.id_piloto_asignado IS NOT NULL THEN
        UPDATE "piloto" 
        SET "estado" = 'Disponible', "disponible" = TRUE, "updated_at" = NOW()
        WHERE "id_piloto" = NEW.id_piloto_asignado AND "estado" = 'En Viaje';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sincronizar_estado_operativo ON "vehiculo";
CREATE TRIGGER trg_sincronizar_estado_operativo
AFTER UPDATE OF estado, id_piloto_asignado ON "vehiculo"
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_estado_operativo();

-- 4. Función de Métricas de Operaciones (Dispatch Board KPIs)
CREATE OR REPLACE FUNCTION fn_obtener_kpis_operaciones()
RETURNS TABLE (
    total_unidades INT,
    unidades_disponibles INT,
    unidades_en_ruta INT,
    unidades_en_taller INT,
    unidades_fuera_servicio INT,
    total_pilotos INT,
    pilotos_disponibles INT,
    pilotos_en_viaje INT,
    pilotos_licencia_proxima INT,
    alertas_documentos_vehiculos INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INT FROM "vehiculo" WHERE "activo" = TRUE) AS total_unidades,
        (SELECT COUNT(*)::INT FROM "vehiculo" WHERE "activo" = TRUE AND "estado" = 'Disponible') AS unidades_disponibles,
        (SELECT COUNT(*)::INT FROM "vehiculo" WHERE "activo" = TRUE AND "estado" = 'En Ruta') AS unidades_en_ruta,
        (SELECT COUNT(*)::INT FROM "vehiculo" WHERE "activo" = TRUE AND "estado" = 'En Mantenimiento') AS unidades_en_taller,
        (SELECT COUNT(*)::INT FROM "vehiculo" WHERE "activo" = TRUE AND "estado" = 'Fuera de Servicio') AS unidades_fuera_servicio,
        (SELECT COUNT(*)::INT FROM "piloto" WHERE "activo" = TRUE) AS total_pilotos,
        (SELECT COUNT(*)::INT FROM "piloto" WHERE "activo" = TRUE AND "estado" = 'Disponible') AS pilotos_disponibles,
        (SELECT COUNT(*)::INT FROM "piloto" WHERE "activo" = TRUE AND "estado" = 'En Viaje') AS pilotos_en_viaje,
        (SELECT COUNT(*)::INT FROM "piloto" WHERE "activo" = TRUE AND "venc_licencia" <= (CURRENT_DATE + INTERVAL '30 days')) AS pilotos_licencia_proxima,
        (SELECT COUNT(*)::INT FROM "vehiculo" WHERE "activo" = TRUE AND (
            "venc_circulacion" <= (CURRENT_DATE + INTERVAL '30 days') OR 
            "venc_seguro" <= (CURRENT_DATE + INTERVAL '30 days') OR 
            "venc_revision" <= (CURRENT_DATE + INTERVAL '30 days')
        )) AS alertas_documentos_vehiculos;
END;
$$ LANGUAGE plpgsql;
