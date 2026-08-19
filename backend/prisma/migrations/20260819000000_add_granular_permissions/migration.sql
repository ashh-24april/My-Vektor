-- AlterTable: Agregar columnas de permisos granulares a usuario_permiso_modulo
-- Ejecutar en la base de datos de Supabase (PostgreSQL)
ALTER TABLE "usuario_permiso_modulo" ADD COLUMN IF NOT EXISTS "ver"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuario_permiso_modulo" ADD COLUMN IF NOT EXISTS "crear"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuario_permiso_modulo" ADD COLUMN IF NOT EXISTS "editar"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuario_permiso_modulo" ADD COLUMN IF NOT EXISTS "eliminar" BOOLEAN NOT NULL DEFAULT false;
