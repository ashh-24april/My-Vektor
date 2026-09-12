
-- ==============================================================================
-- MÓDULO DE VIAJES Y FLETES (DESPACHO LOGÍSTICO Y RUTAS)
-- Compatible con PostgreSQL y Supabase
-- ==============================================================================

-- 1. Actualización de tabla VIAJE
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "codigo_viaje" VARCHAR(50);
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "id_remolque" INT;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "tipo_carga" VARCHAR(80) DEFAULT 'Carga Seca';
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "monto_flete" DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "anticipo_viaticos" DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "fecha_estimada_llegada" DATE;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "fecha_llegada_real" TIMESTAMP(6);
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "km_inicial" INT;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "km_final" INT;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "galones_combustible" DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "costo_combustible" DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "rendimiento_calculado" DECIMAL(6, 2) DEFAULT 0;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "escala_puntos" TEXT;
ALTER TABLE "viaje" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_viaje_codigo" ON "viaje"("codigo_viaje");
CREATE INDEX IF NOT EXISTS "idx_viaje_estado" ON "viaje"("estado");
CREATE INDEX IF NOT EXISTS "idx_viaje_vehiculo" ON "viaje"("id_vehiculo");
CREATE INDEX IF NOT EXISTS "idx_viaje_piloto" ON "viaje"("id_piloto");
CREATE INDEX IF NOT EXISTS "idx_viaje_fecha" ON "viaje"("fecha_salida");

-- 2. Actualización de tabla GASTO (Gastos y Liquidación de Viajes)
ALTER TABLE "gasto" ADD COLUMN IF NOT EXISTS "categoria" VARCHAR(50) DEFAULT 'Combustible';
ALTER TABLE "gasto" ADD COLUMN IF NOT EXISTS "galones" DECIMAL(8, 2);
ALTER TABLE "gasto" ADD COLUMN IF NOT EXISTS "odometro_km" INT;
ALTER TABLE "gasto" ADD COLUMN IF NOT EXISTS "num_comprobante" VARCHAR(80);

CREATE INDEX IF NOT EXISTS "idx_gasto_viaje" ON "gasto"("id_viaje");
CREATE INDEX IF NOT EXISTS "idx_gasto_categoria" ON "gasto"("categoria");

-- 3. Función Correlativa para Códigos de Viaje (Desde VIA-100)
CREATE OR REPLACE FUNCTION fn_obtener_siguiente_folio_viaje()
RETURNS VARCHAR AS $$
DECLARE
    v_max_num INT;
    v_siguiente_num INT;
    v_siguiente_folio VARCHAR;
BEGIN
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN "codigo_viaje" ~ '^VIA-[0-9]+$' 
                THEN SUBSTRING("codigo_viaje" FROM 'VIA-([0-9]+)')::INT 
                ELSE 0 
            END
        ), 99
    ) INTO v_max_num FROM "viaje";

    v_siguiente_num := v_max_num + 1;
    IF v_siguiente_num < 100 THEN
        v_siguiente_num := 100;
    END IF;

    v_siguiente_folio := 'VIA-' || v_siguiente_num::TEXT;
    RETURN v_siguiente_folio;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger de Sincronización Automática entre Estados de Viaje, Vehículos y Pilotos
CREATE OR REPLACE FUNCTION fn_sincronizar_viaje_operaciones()
RETURNS TRIGGER AS $$
BEGIN
    -- Al iniciar viaje ('En Ruta' o 'En Carga/Descarga')
    IF NEW.estado IN ('En Ruta', 'En Carga/Descarga') THEN
        UPDATE "vehiculo" 
        SET "estado" = 'En Ruta', "updated_at" = NOW()
        WHERE "id_vehiculo" = NEW.id_vehiculo;

        UPDATE "piloto" 
        SET "estado" = 'En Viaje', "disponible" = FALSE, "updated_at" = NOW()
        WHERE "id_piloto" = NEW.id_piloto;

    -- Al culminar o liquidar viaje ('Completado', 'Liquidado', 'Cancelado')
    ELSIF NEW.estado IN ('Completado', 'Liquidado', 'Cancelado') THEN
        UPDATE "vehiculo" 
        SET "estado" = 'Disponible', "updated_at" = NOW()
        WHERE "id_vehiculo" = NEW.id_vehiculo;

        UPDATE "piloto" 
        SET "estado" = 'Disponible', "disponible" = TRUE, "updated_at" = NOW()
        WHERE "id_piloto" = NEW.id_piloto;

        -- Actualizar odómetro acumulado del vehículo si se reportó KM final
        IF NEW.km_final IS NOT NULL AND NEW.km_final > 0 THEN
            UPDATE "vehiculo" 
            SET "kilometraje" = NEW.km_final, "updated_at" = NOW()
            WHERE "id_vehiculo" = NEW.id_vehiculo AND "kilometraje" < NEW.km_final;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sincronizar_viaje_operaciones ON "viaje";
CREATE TRIGGER trg_sincronizar_viaje_operaciones
AFTER INSERT OR UPDATE OF estado, km_final ON "viaje"
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_viaje_operaciones();

-- 5. Función de KPIs y Métricas de Viajes
CREATE OR REPLACE FUNCTION fn_obtener_kpis_viajes()
RETURNS TABLE (
    viajes_en_ruta INT,
    viajes_programados INT,
    viajes_completados_mes INT,
    fletes_totales_mes NUMERIC,
    total_galones_mes NUMERIC,
    rendimiento_promedio_flota NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INT FROM "viaje" WHERE "activo" = TRUE AND "estado" IN ('En Ruta', 'En Carga/Descarga')) AS viajes_en_ruta,
        (SELECT COUNT(*)::INT FROM "viaje" WHERE "activo" = TRUE AND "estado" = 'Programado') AS viajes_programados,
        (SELECT COUNT(*)::INT FROM "viaje" WHERE "activo" = TRUE AND "estado" IN ('Completado', 'Liquidado') AND "fecha_salida" >= DATE_TRUNC('month', CURRENT_DATE)) AS viajes_completados_mes,
        (SELECT COALESCE(SUM("monto_flete"), 0)::NUMERIC FROM "viaje" WHERE "activo" = TRUE AND "estado" IN ('Completado', 'Liquidado') AND "fecha_salida" >= DATE_TRUNC('month', CURRENT_DATE)) AS fletes_totales_mes,
        (SELECT COALESCE(SUM("galones_combustible"), 0)::NUMERIC FROM "viaje" WHERE "activo" = TRUE AND "fecha_salida" >= DATE_TRUNC('month', CURRENT_DATE)) AS total_galones_mes,
        (SELECT COALESCE(AVG("rendimiento_calculado"), 0)::NUMERIC FROM "viaje" WHERE "activo" = TRUE AND "rendimiento_calculado" > 0 AND "fecha_salida" >= DATE_TRUNC('month', CURRENT_DATE)) AS rendimiento_promedio_flota;
END;
$$ LANGUAGE plpgsql;
