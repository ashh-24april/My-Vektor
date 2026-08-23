-- Migration: Vistas y Funciones RPC optimizadas para el Dashboard Principal de MyVektor

-- 1. Vista de Resumen de Flota en Tiempo Real
CREATE OR REPLACE VIEW vista_resumen_flota AS
SELECT 
    COUNT(*) FILTER (WHERE activo = true) AS total_vehiculos,
    COUNT(*) FILTER (WHERE activo = true AND estado = 'En Ruta') AS en_ruta,
    COUNT(*) FILTER (WHERE activo = true AND estado = 'Disponible') AS disponibles,
    COUNT(*) FILTER (WHERE activo = true AND estado = 'En Mantenimiento') AS en_taller,
    COUNT(*) FILTER (WHERE activo = false OR estado = 'Fuera de Servicio') AS fuera_servicio
FROM vehiculo;

-- 2. Vista de Repuestos Críticos (Bajo Stock)
CREATE OR REPLACE VIEW vista_repuestos_criticos AS
SELECT 
    p.id_producto,
    p.codigo,
    p.descripcion,
    p.stock AS stock_actual,
    p.stock_minimo,
    p.precio_compra,
    p.precio_venta,
    c.nombre AS categoria
FROM producto p
LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
WHERE p.activo = true AND p.stock <= p.stock_minimo
ORDER BY (p.stock_minimo - p.stock) DESC, p.stock ASC;

-- 3. Función RPC para obtener métricas consolidadas del Dashboard
CREATE OR REPLACE FUNCTION fn_obtener_kpis_dashboard(p_dias INT DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    v_fecha_inicio TIMESTAMP;
    v_resultado JSON;
BEGIN
    v_fecha_inicio := CURRENT_TIMESTAMP - (p_dias || ' days')::INTERVAL;

    SELECT json_build_object(
        'total_vehiculos', (SELECT COUNT(*) FROM vehiculo WHERE activo = true),
        'vehiculos_en_taller', (SELECT COUNT(*) FROM vehiculo WHERE activo = true AND estado = 'En Mantenimiento'),
        'vehiculos_disponibles', (SELECT COUNT(*) FROM vehiculo WHERE activo = true AND estado = 'Disponible'),
        'vehiculos_en_ruta', (SELECT COUNT(*) FROM vehiculo WHERE activo = true AND estado = 'En Ruta'),
        'pilotos_activos', (SELECT COUNT(*) FROM piloto WHERE activo = true),
        'pilotos_disponibles', (SELECT COUNT(*) FROM piloto WHERE activo = true AND disponible = true),
        'ventas_periodo', COALESCE((SELECT SUM(total) FROM venta WHERE activo = true AND estado_pago != 'Anulada' AND fecha_emision >= v_fecha_inicio), 0),
        'facturas_pendientes_monto', COALESCE((SELECT SUM(total) FROM venta WHERE activo = true AND estado_pago = 'Pendiente'), 0),
        'facturas_pendientes_count', (SELECT COUNT(*) FROM venta WHERE activo = true AND estado_pago = 'Pendiente'),
        'costos_mantenimiento_periodo', COALESCE((SELECT SUM(costo_total) FROM orden_servicio WHERE activo = true AND estado = 'Completada' AND fecha_ingreso >= v_fecha_inicio), 0),
        'ots_en_proceso', (SELECT COUNT(*) FROM orden_servicio WHERE activo = true AND estado = 'En Proceso'),
        'repuestos_criticos_count', (SELECT COUNT(*) FROM producto WHERE activo = true AND stock <= stock_minimo)
    ) INTO v_resultado;

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;
