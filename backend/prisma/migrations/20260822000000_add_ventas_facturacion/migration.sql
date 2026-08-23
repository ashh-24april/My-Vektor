-- Migration: Campos completos para el Módulo de Ventas y Facturación de Fletes/Servicios
-- Tabla: venta

ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "folio_factura" VARCHAR(50);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "id_vehiculo" INT;
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "cliente_nombre" VARCHAR(150);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "cliente_nit" VARCHAR(30);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "cliente_telefono" VARCHAR(30);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "cliente_direccion" VARCHAR(200);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "concepto_servicio" VARCHAR(100) DEFAULT 'Flete';
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "impuesto" NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "estado_pago" VARCHAR(20) DEFAULT 'Pendiente';
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "metodo_pago" VARCHAR(50);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "fecha_emision" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "fecha_vencimiento" DATE;
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP(6);
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT TRUE;
ALTER TABLE "venta" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;

-- Llave foránea hacia vehículo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_venta_vehiculo'
    ) THEN
        ALTER TABLE "venta" 
        ADD CONSTRAINT "fk_venta_vehiculo" 
        FOREIGN KEY ("id_vehiculo") REFERENCES "vehiculo"("id_vehiculo") ON DELETE SET NULL;
    END IF;
END $$;

-- Índices optimizados para búsquedas rápidas y reportes
CREATE UNIQUE INDEX IF NOT EXISTS "idx_venta_folio_factura" ON "venta"("folio_factura") WHERE "folio_factura" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_venta_estado_pago" ON "venta"("estado_pago");
CREATE INDEX IF NOT EXISTS "idx_venta_fecha_emision" ON "venta"("fecha_emision");
