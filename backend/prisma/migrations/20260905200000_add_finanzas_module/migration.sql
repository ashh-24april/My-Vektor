
-- ==============================================================================
-- MÓDULO DE FINANZAS Y TESORERÍA (FLUJO DE CAJA, RENTABILIDAD Y COBROS)
-- Compatible con PostgreSQL y Supabase
-- ==============================================================================

-- 1. Creación de la Tabla de Transacciones Financieras
CREATE TABLE IF NOT EXISTS "transaccion_finanzas" (
    "id_transaccion" SERIAL PRIMARY KEY,
    "codigo_transaccion" VARCHAR(50) UNIQUE,
    "tipo" VARCHAR(20) NOT NULL, -- 'Ingreso' | 'Egreso'
    "categoria" VARCHAR(80) NOT NULL, 
    "concepto" VARCHAR(200) NOT NULL,
    "monto" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "monto_pagado" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Pendiente', -- 'Pendiente', 'Cobrado Parcial', 'Cobrado Total', 'Pagado', 'Vencido', 'Anulado'
    "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
    "fecha_vencimiento" DATE,
    "fecha_pago" TIMESTAMP(6),
    "metodo_pago" VARCHAR(50), -- 'Transferencia', 'Efectivo', 'Cheque', 'Depósito', 'Tarjeta'
    "num_comprobante" VARCHAR(80),
    "id_cliente" INT REFERENCES "cliente"("id_cliente") ON DELETE SET NULL,
    "id_proveedor" INT REFERENCES "proveedor"("id_proveedor") ON DELETE SET NULL,
    "id_vehiculo" INT REFERENCES "vehiculo"("id_vehiculo") ON DELETE SET NULL,
    "id_viaje" INT REFERENCES "viaje"("id_viaje") ON DELETE SET NULL,
    "id_venta" INT REFERENCES "venta"("id_venta") ON DELETE SET NULL,
    "id_compra" INT REFERENCES "compra"("id_compra") ON DELETE SET NULL,
    "id_usuario" INT NOT NULL REFERENCES "usuario"("id_usuario"),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

-- Índices de Rendimiento para Búsquedas y Filtros Financieros
CREATE INDEX IF NOT EXISTS "idx_transaccion_tipo" ON "transaccion_finanzas"("tipo");
CREATE INDEX IF NOT EXISTS "idx_transaccion_categoria" ON "transaccion_finanzas"("categoria");
CREATE INDEX IF NOT EXISTS "idx_transaccion_estado" ON "transaccion_finanzas"("estado");
CREATE INDEX IF NOT EXISTS "idx_transaccion_fecha" ON "transaccion_finanzas"("fecha");
CREATE INDEX IF NOT EXISTS "idx_transaccion_vehiculo" ON "transaccion_finanzas"("id_vehiculo");
CREATE INDEX IF NOT EXISTS "idx_transaccion_viaje" ON "transaccion_finanzas"("id_viaje");
CREATE INDEX IF NOT EXISTS "idx_transaccion_cliente" ON "transaccion_finanzas"("id_cliente");
CREATE INDEX IF NOT EXISTS "idx_transaccion_proveedor" ON "transaccion_finanzas"("id_proveedor");

-- Habilitar Row Level Security (RLS) en Supabase para proteger datos contables
ALTER TABLE "transaccion_finanzas" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transaccion_finanzas' AND policyname = 'Acceso_Finanzas_Politica'
    ) THEN
        CREATE POLICY "Acceso_Finanzas_Politica" 
        ON "transaccion_finanzas" 
        FOR ALL 
        TO authenticated, service_role 
        USING (true) 
        WITH CHECK (true);
    END IF;
END;
$$;

-- 2. Función Correlativa para Códigos de Transacciones (Desde TRX-100)
CREATE OR REPLACE FUNCTION fn_obtener_siguiente_folio_transaccion()
RETURNS VARCHAR AS $$
DECLARE
    v_max_num INT;
    v_siguiente_num INT;
    v_siguiente_folio VARCHAR;
BEGIN
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN "codigo_transaccion" ~ '^TRX-[0-9]+$' 
                THEN SUBSTRING("codigo_transaccion" FROM 'TRX-([0-9]+)')::INT 
                ELSE 0 
            END
        ), 99
    ) INTO v_max_num FROM "transaccion_finanzas";

    v_siguiente_num := v_max_num + 1;
    IF v_siguiente_num < 100 THEN
        v_siguiente_num := 100;
    END IF;

    v_siguiente_folio := 'TRX-' || v_siguiente_num::TEXT;
    RETURN v_siguiente_folio;
END;
$$ LANGUAGE plpgsql;

-- 3. Vista de Flujo de Caja Mensual (Cash Flow)
CREATE OR REPLACE VIEW v_flujo_caja_mensual AS
SELECT 
    DATE_TRUNC('month', t."fecha")::DATE AS mes,
    COALESCE(SUM(CASE WHEN t."tipo" = 'Ingreso' AND t."estado" IN ('Cobrado Total', 'Cobrado Parcial', 'Pagado') THEN t."monto_pagado" ELSE 0 END), 0) AS total_ingresos_efectivos,
    COALESCE(SUM(CASE WHEN t."tipo" = 'Egreso' AND t."estado" IN ('Pagado', 'Cobrado Total') THEN t."monto" ELSE 0 END), 0) AS total_egresos_efectivos,
    (
        COALESCE(SUM(CASE WHEN t."tipo" = 'Ingreso' AND t."estado" IN ('Cobrado Total', 'Cobrado Parcial', 'Pagado') THEN t."monto_pagado" ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t."tipo" = 'Egreso' AND t."estado" IN ('Pagado', 'Cobrado Total') THEN t."monto" ELSE 0 END), 0)
    ) AS utilidad_neta
FROM "transaccion_finanzas" t
WHERE t."activo" = TRUE AND t."estado" != 'Anulado'
GROUP BY DATE_TRUNC('month', t."fecha")
ORDER BY mes DESC;

-- 4. Vista de Rentabilidad por Vehículo (Ingresos vs Egresos Acumulados)
CREATE OR REPLACE VIEW v_rentabilidad_por_vehiculo AS
SELECT 
    v."id_vehiculo",
    v."placa",
    v."marca",
    v."modelo",
    v."tipo",
    v."estado",
    -- Ingresos por Fletes / Viajes
    COALESCE(
        (SELECT SUM(vi."monto_flete") 
         FROM "viaje" vi 
         WHERE vi."id_vehiculo" = v."id_vehiculo" AND vi."activo" = TRUE AND vi."estado" IN ('Completado', 'Liquidado')), 0
    ) AS total_ingresos_fletes,
    -- Costos de Combustible
    COALESCE(
        (SELECT SUM(g."monto") 
         FROM "gasto" g 
         JOIN "viaje" vi ON g."id_viaje" = vi."id_viaje" 
         WHERE vi."id_vehiculo" = v."id_vehiculo" AND g."categoria" = 'Combustible'), 0
    ) AS costo_combustible,
    -- Costos de Mantenimiento Mecánico (Órdenes de Servicio)
    COALESCE(
        (SELECT SUM(os."costo_total") 
         FROM "orden_servicio" os 
         WHERE os."id_vehiculo" = v."id_vehiculo" AND os."activo" = TRUE AND os."estado" = 'Completado'), 0
    ) AS costo_mecanica,
    -- Otros Gastos de Ruta / Viáticos / Peajes
    COALESCE(
        (SELECT SUM(g."monto") 
         FROM "gasto" g 
         JOIN "viaje" vi ON g."id_viaje" = vi."id_viaje" 
         WHERE vi."id_vehiculo" = v."id_vehiculo" AND g."categoria" != 'Combustible'), 0
    ) AS costo_viaticos_ruta,
    -- Costo Total Acumulado
    (
        COALESCE((SELECT SUM(g."monto") FROM "gasto" g JOIN "viaje" vi ON g."id_viaje" = vi."id_viaje" WHERE vi."id_vehiculo" = v."id_vehiculo"), 0) +
        COALESCE((SELECT SUM(os."costo_total") FROM "orden_servicio" os WHERE os."id_vehiculo" = v."id_vehiculo" AND os."activo" = TRUE AND os."estado" = 'Completado'), 0)
    ) AS costo_total,
    -- Margen Neto en Quetzales
    (
        COALESCE((SELECT SUM(vi."monto_flete") FROM "viaje" vi WHERE vi."id_vehiculo" = v."id_vehiculo" AND vi."activo" = TRUE AND vi."estado" IN ('Completado', 'Liquidado')), 0) -
        (
            COALESCE((SELECT SUM(g."monto") FROM "gasto" g JOIN "viaje" vi ON g."id_viaje" = vi."id_viaje" WHERE vi."id_vehiculo" = v."id_vehiculo"), 0) +
            COALESCE((SELECT SUM(os."costo_total") FROM "orden_servicio" os WHERE os."id_vehiculo" = v."id_vehiculo" AND os."activo" = TRUE AND os."estado" = 'Completado'), 0)
        )
    ) AS margen_neto
FROM "vehiculo" v
WHERE v."activo" = TRUE;

-- 5. Función de KPIs Financieros Consolidados
CREATE OR REPLACE FUNCTION fn_obtener_kpis_finanzas()
RETURNS TABLE (
    ingresos_mes NUMERIC,
    gastos_mes NUMERIC,
    utilidad_neta_mes NUMERIC,
    cuentas_por_cobrar NUMERIC,
    cuentas_por_pagar NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Ingresos del mes en curso
        COALESCE(
            (SELECT SUM("monto_pagado") FROM "transaccion_finanzas" 
             WHERE "activo" = TRUE AND "tipo" = 'Ingreso' AND "estado" IN ('Cobrado Total', 'Cobrado Parcial', 'Pagado') 
             AND "fecha" >= DATE_TRUNC('month', CURRENT_DATE)), 0
        )::NUMERIC AS ingresos_mes,

        -- Gastos operativos del mes en curso
        COALESCE(
            (SELECT SUM("monto") FROM "transaccion_finanzas" 
             WHERE "activo" = TRUE AND "tipo" = 'Egreso' AND "estado" IN ('Pagado', 'Cobrado Total') 
             AND "fecha" >= DATE_TRUNC('month', CURRENT_DATE)), 0
        )::NUMERIC AS gastos_mes,

        -- Utilidad neta (Ingresos - Gastos)
        (
            COALESCE((SELECT SUM("monto_pagado") FROM "transaccion_finanzas" WHERE "activo" = TRUE AND "tipo" = 'Ingreso' AND "estado" IN ('Cobrado Total', 'Cobrado Parcial', 'Pagado') AND "fecha" >= DATE_TRUNC('month', CURRENT_DATE)), 0) -
            COALESCE((SELECT SUM("monto") FROM "transaccion_finanzas" WHERE "activo" = TRUE AND "tipo" = 'Egreso' AND "estado" IN ('Pagado', 'Cobrado Total') AND "fecha" >= DATE_TRUNC('month', CURRENT_DATE)), 0)
        )::NUMERIC AS utilidad_neta_mes,

        -- Cuentas por cobrar (Facturas/Fletes pendientes o parciales)
        COALESCE(
            (SELECT SUM("monto" - "monto_pagado") FROM "transaccion_finanzas" 
             WHERE "activo" = TRUE AND "tipo" = 'Ingreso' AND "estado" IN ('Pendiente', 'Cobrado Parcial', 'Vencido')), 0
        )::NUMERIC AS cuentas_por_cobrar,

        -- Cuentas por pagar a proveedores/compras
        COALESCE(
            (SELECT SUM("monto" - "monto_pagado") FROM "transaccion_finanzas" 
             WHERE "activo" = TRUE AND "tipo" = 'Egreso' AND "estado" IN ('Pendiente', 'Cobrado Parcial')), 0
        )::NUMERIC AS cuentas_por_pagar;
END;
$$ LANGUAGE plpgsql;
