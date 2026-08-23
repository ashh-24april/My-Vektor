-- Migration: Campos completos y triggers para el Módulo de Mecánica y Mantenimiento (Órdenes de Trabajo)
-- Tabla: orden_servicio

ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "numero_ot" VARCHAR(50);
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "id_piloto" INT;
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "tipo_mantenimiento" VARCHAR(50) DEFAULT 'Preventivo';
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "diagnostico_inicial" TEXT;
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "fecha_estimada_entrega" DATE;
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "fecha_cierre" TIMESTAMP(6);
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;
ALTER TABLE "orden_servicio" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT TRUE;

-- Llave foránea hacia piloto (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_orden_servicio_piloto'
    ) THEN
        ALTER TABLE "orden_servicio" 
        ADD CONSTRAINT "fk_orden_servicio_piloto" 
        FOREIGN KEY ("id_piloto") REFERENCES "piloto"("id_piloto") ON DELETE SET NULL;
    END IF;
END $$;

-- Índice único en numero_ot
CREATE UNIQUE INDEX IF NOT EXISTS "idx_orden_servicio_numero_ot" ON "orden_servicio"("numero_ot") WHERE "numero_ot" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_orden_servicio_tipo_mant" ON "orden_servicio"("tipo_mantenimiento");

-- Función y Trigger para descontar stock al despachar repuestos a una OT
CREATE OR REPLACE FUNCTION fn_descontar_stock_repuesto_ot()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual INT;
    v_stock_nuevo INT;
    v_num_ot VARCHAR(50);
    v_id_usuario INT;
BEGIN
    -- Obtener stock actual del repuesto
    SELECT stock INTO v_stock_actual FROM producto WHERE id_producto = NEW.id_producto;
    
    -- Obtener número de OT y usuario responsable
    SELECT COALESCE(numero_ot, 'OT-' || id_orden::text), id_usuario 
    INTO v_num_ot, v_id_usuario 
    FROM orden_servicio WHERE id_orden = NEW.id_orden;

    IF v_stock_actual IS NOT NULL THEN
        v_stock_nuevo := GREATEST(0, v_stock_actual - NEW.cantidad);
        
        -- Actualizar stock en la tabla producto
        UPDATE producto 
        SET stock = v_stock_nuevo, updated_at = CURRENT_TIMESTAMP 
        WHERE id_producto = NEW.id_producto;

        -- Registrar movimiento en kardex (movimiento_inventario) si no fue registrado previamente
        INSERT INTO movimiento_inventario (
            id_producto,
            id_usuario,
            tipo,
            cantidad,
            stock_antes,
            stock_despues,
            referencia,
            motivo,
            fecha
        ) VALUES (
            NEW.id_producto,
            COALESCE(v_id_usuario, 1),
            'SALIDA',
            NEW.cantidad,
            v_stock_actual,
            v_stock_nuevo,
            v_num_ot,
            'Despacho de repuestos para Orden de Trabajo ' || v_num_ot,
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en orden_repuesto
DROP TRIGGER IF EXISTS trg_descontar_stock_repuesto_ot ON orden_repuesto;
CREATE TRIGGER trg_descontar_stock_repuesto_ot
AFTER INSERT ON orden_repuesto
FOR EACH ROW
EXECUTE FUNCTION fn_descontar_stock_repuesto_ot();
