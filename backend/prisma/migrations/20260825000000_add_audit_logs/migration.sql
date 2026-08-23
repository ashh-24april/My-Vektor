-- Migration: Bitácora de Auditoría y Seguridad del Sistema (Audit Logs)
-- Tabla: auditoria

ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "usuario_nombre" VARCHAR(100);
ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "usuario_email" VARCHAR(150);
ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "rol_usuario" VARCHAR(50);
ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "registro_id" VARCHAR(100);
ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "detalles_cambio" TEXT;
ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "navegador" VARCHAR(255);

-- Índices para búsqueda rápida en bitácora
CREATE INDEX IF NOT EXISTS "idx_auditoria_modulo" ON "auditoria"("modulo");
CREATE INDEX IF NOT EXISTS "idx_auditoria_accion" ON "auditoria"("accion");
CREATE INDEX IF NOT EXISTS "idx_auditoria_fecha_hora" ON "auditoria"("fecha_hora" DESC);

-- Función helper para registrar auditorías directamente desde triggers o procedimientos
CREATE OR REPLACE FUNCTION fn_registrar_audit_log(
    p_id_usuario INT,
    p_accion VARCHAR(100),
    p_modulo VARCHAR(50),
    p_descripcion TEXT DEFAULT NULL,
    p_registro_id VARCHAR(100) DEFAULT NULL,
    p_detalles_cambio TEXT DEFAULT NULL,
    p_ip_origen VARCHAR(45) DEFAULT NULL,
    p_navegador VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_nombre VARCHAR(100);
    v_email VARCHAR(150);
    v_rol VARCHAR(50);
BEGIN
    SELECT u.nombre, u.correo, r.nombre 
    INTO v_nombre, v_email, v_rol
    FROM usuario u
    LEFT JOIN rol r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = p_id_usuario;

    INSERT INTO auditoria (
        id_usuario,
        usuario_nombre,
        usuario_email,
        rol_usuario,
        accion,
        modulo,
        registro_id,
        descripcion,
        detalles_cambio,
        ip_origen,
        navegador,
        fecha_hora
    ) VALUES (
        p_id_usuario,
        COALESCE(v_nombre, 'Usuario #' || p_id_usuario),
        v_email,
        v_rol,
        p_accion,
        p_modulo,
        p_registro_id,
        p_descripcion,
        p_detalles_cambio,
        p_ip_origen,
        p_navegador,
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;
