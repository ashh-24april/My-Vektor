-- Migration: Agregar campos numero_factura, rotacion y origen a producto y numero_factura a movimiento_inventario
-- Compatible con PostgreSQL / Supabase

-- 1. Campos en tabla producto (inventario_repuestos)
ALTER TABLE "producto" ADD COLUMN IF NOT EXISTS "numero_factura" VARCHAR(100);
ALTER TABLE "producto" ADD COLUMN IF NOT EXISTS "rotacion" VARCHAR(20) DEFAULT 'Media';
ALTER TABLE "producto" ADD COLUMN IF NOT EXISTS "origen" VARCHAR(30) DEFAULT 'Genérico';

-- Si existe la vista o tabla con alias inventario_repuestos, aplicamos también de forma segura
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventario_repuestos') THEN
        ALTER TABLE "inventario_repuestos" ADD COLUMN IF NOT EXISTS "numero_factura" VARCHAR(100);
        ALTER TABLE "inventario_repuestos" ADD COLUMN IF NOT EXISTS "rotacion" VARCHAR(20) DEFAULT 'Media';
        ALTER TABLE "inventario_repuestos" ADD COLUMN IF NOT EXISTS "origen" VARCHAR(30) DEFAULT 'Genérico';
    END IF;
END $$;

-- 2. Campos en tabla movimiento_inventario (historial_kardex)
ALTER TABLE "movimiento_inventario" ADD COLUMN IF NOT EXISTS "numero_factura" VARCHAR(100);

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historial_kardex') THEN
        ALTER TABLE "historial_kardex" ADD COLUMN IF NOT EXISTS "numero_factura" VARCHAR(100);
    END IF;
END $$;

-- 3. Función RPC opcional en Supabase para obtener el siguiente SKU consecutivo desde 100
CREATE OR REPLACE FUNCTION fn_obtener_siguiente_sku(p_id_categoria INT)
RETURNS TABLE (
    prefijo VARCHAR(10),
    categoria_nombre VARCHAR(80),
    siguiente_codigo VARCHAR(50),
    siguiente_numero INT
) AS $$
DECLARE
    v_nombre VARCHAR(80);
    v_clean VARCHAR(80);
    v_prefix VARCHAR(10);
    v_max_num INT := 99;
    r RECORD;
    v_curr_num INT;
BEGIN
    SELECT nombre INTO v_nombre FROM categoria WHERE id_categoria = p_id_categoria;
    IF v_nombre IS NULL THEN
        RAISE EXCEPTION 'Categoría no encontrada';
    END IF;

    -- Extraer prefijo de 3 caracteres en mayúsculas
    v_clean := UPPER(REGEXP_REPLACE(TRANSLATE(v_nombre, 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouAEIOUnNuU'), '[^A-Z0-9]', '', 'g'));
    IF LENGTH(v_clean) >= 3 THEN
        v_prefix := SUBSTRING(v_clean FROM 1 FOR 3);
    ELSE
        v_prefix := RPAD(v_clean, 3, 'X');
    END IF;

    -- Buscar el correlativo numérico más alto para este prefijo
    FOR r IN 
        SELECT codigo FROM producto 
        WHERE UPPER(codigo) LIKE v_prefix || '-%'
    LOOP
        BEGIN
            v_curr_num := NULL;
            IF r.codigo ~ ('^' || v_prefix || '-[0-9]+$') THEN
                v_curr_num := (SUBSTRING(r.codigo FROM (LENGTH(v_prefix) + 2)))::INT;
                IF v_curr_num IS NOT NULL AND v_curr_num > v_max_num THEN
                    v_max_num := v_curr_num;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar códigos que no sean puramente numéricos
        END;
    END LOOP;

    IF v_max_num < 100 THEN
        siguiente_numero := 100;
    ELSE
        siguiente_numero := v_max_num + 1;
    END IF;

    prefijo := v_prefix;
    categoria_nombre := v_nombre;
    siguiente_codigo := v_prefix || '-' || siguiente_numero;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
