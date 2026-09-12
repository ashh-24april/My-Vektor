-- Migration: Agregar campo opcional sitio_web a la tabla proveedor
ALTER TABLE "proveedor" ADD COLUMN IF NOT EXISTS "sitio_web" VARCHAR(255);
