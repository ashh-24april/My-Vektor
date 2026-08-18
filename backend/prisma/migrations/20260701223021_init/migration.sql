-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "contrasena" VARCHAR(255) NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "expira_en" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" VARCHAR(100) NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "ip_origen" VARCHAR(45),
    "fecha_hora" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "vehiculo" (
    "id_vehiculo" SERIAL NOT NULL,
    "placa" VARCHAR(20) NOT NULL,
    "marca" VARCHAR(80) NOT NULL,
    "modelo" VARCHAR(80) NOT NULL,
    "anio" INTEGER NOT NULL,
    "tipo" VARCHAR(50),
    "color" VARCHAR(30),
    "num_motor" VARCHAR(50),
    "num_chasis" VARCHAR(50),
    "capacidad_carga" DECIMAL(10,2),
    "kilometraje" INTEGER NOT NULL DEFAULT 0,
    "rendimiento_km_l" DECIMAL(5,2),
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Disponible',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculo_pkey" PRIMARY KEY ("id_vehiculo")
);

-- CreateTable
CREATE TABLE "documento_vehiculo" (
    "id_documento" SERIAL NOT NULL,
    "id_vehiculo" INTEGER NOT NULL,
    "tipo_documento" VARCHAR(80) NOT NULL,
    "numero" VARCHAR(50),
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE NOT NULL,
    "url_archivo" TEXT,
    "alerta_enviada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_vehiculo_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "piloto" (
    "id_piloto" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dpi" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),
    "num_licencia" VARCHAR(30) NOT NULL,
    "tipo_licencia" VARCHAR(10) NOT NULL,
    "venc_licencia" DATE NOT NULL,
    "alerta_enviada" BOOLEAN NOT NULL DEFAULT false,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "foto_url" TEXT,
    "foto_dpi_url" TEXT,
    "foto_lic_url" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "piloto_pkey" PRIMARY KEY ("id_piloto")
);

-- CreateTable
CREATE TABLE "mecanico" (
    "id_mecanico" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dpi" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(20),
    "especialidad" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "foto_url" TEXT,
    "foto_dpi_url" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mecanico_pkey" PRIMARY KEY ("id_mecanico")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id_cliente" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "nit" VARCHAR(20),
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),
    "direccion" TEXT,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'Externo',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id_proveedor" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "nit" VARCHAR(20),
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),
    "direccion" TEXT,
    "tipo_producto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "contacto_proveedor" (
    "id_contacto" SERIAL NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "cargo" VARCHAR(80),
    "telefono" VARCHAR(20),
    "correo" VARCHAR(150),

    CONSTRAINT "contacto_proveedor_pkey" PRIMARY KEY ("id_contacto")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "producto" (
    "id_producto" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "id_proveedor" INTEGER,
    "ubicacion" VARCHAR(80),
    "unidad_medida" VARCHAR(20) NOT NULL DEFAULT 'Unidad',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "precio_compra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precio_venta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id_movimiento" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_antes" INTEGER NOT NULL,
    "stock_despues" INTEGER NOT NULL,
    "referencia" VARCHAR(100),
    "motivo" TEXT,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "compra" (
    "id_compra" SERIAL NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "num_factura" VARCHAR(50),
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id_compra")
);

-- CreateTable
CREATE TABLE "detalle_compra" (
    "id_detalle_compra" SERIAL NOT NULL,
    "id_compra" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unit" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalle_compra_pkey" PRIMARY KEY ("id_detalle_compra")
);

-- CreateTable
CREATE TABLE "orden_servicio" (
    "id_orden" SERIAL NOT NULL,
    "id_vehiculo" INTEGER NOT NULL,
    "id_mecanico" INTEGER NOT NULL,
    "id_cliente" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "tipo_servicio" VARCHAR(50) NOT NULL DEFAULT 'Correctivo',
    "diagnostico" TEXT,
    "trabajo_realizado" TEXT,
    "km_entrada" INTEGER,
    "costo_mano_obra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costo_repuestos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costo_total" DECIMAL(10,2) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    "fecha_ingreso" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orden_servicio_pkey" PRIMARY KEY ("id_orden")
);

-- CreateTable
CREATE TABLE "orden_repuesto" (
    "id_orden" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unit" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "orden_repuesto_pkey" PRIMARY KEY ("id_orden","id_producto")
);

-- CreateTable
CREATE TABLE "viaje" (
    "id_viaje" SERIAL NOT NULL,
    "id_vehiculo" INTEGER NOT NULL,
    "id_piloto" INTEGER NOT NULL,
    "id_cliente" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "origen" VARCHAR(150) NOT NULL,
    "destino" VARCHAR(150) NOT NULL,
    "descripcion_carga" TEXT,
    "fecha_salida" DATE NOT NULL,
    "fecha_llegada" DATE,
    "km_estimado" DECIMAL(10,2),
    "km_real" DECIMAL(10,2),
    "comb_estimado" DECIMAL(10,2),
    "comb_real" DECIMAL(10,2),
    "ingreso_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costo_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'Programado',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viaje_pkey" PRIMARY KEY ("id_viaje")
);

-- CreateTable
CREATE TABLE "gasto" (
    "id_gasto" SERIAL NOT NULL,
    "id_viaje" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "concepto" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL DEFAULT 'Operativo',
    "monto" DECIMAL(10,2) NOT NULL,
    "comprobante" TEXT,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gasto_pkey" PRIMARY KEY ("id_gasto")
);

-- CreateTable
CREATE TABLE "venta" (
    "id_venta" SERIAL NOT NULL,
    "id_cliente" INTEGER,
    "id_usuario" INTEGER NOT NULL,
    "num_comprobante" VARCHAR(30),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'Completada',
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venta_pkey" PRIMARY KEY ("id_venta")
);

-- CreateTable
CREATE TABLE "detalle_venta" (
    "id_detalle" SERIAL NOT NULL,
    "id_venta" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unit" DECIMAL(10,2) NOT NULL,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalle_venta_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "referencia_id" INTEGER,
    "referencia_tipo" VARCHAR(50),
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "idx_usuario_rol" ON "usuario"("id_rol");

-- CreateIndex
CREATE INDEX "idx_usuario_correo" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_auditoria_usuario" ON "auditoria"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_auditoria_fecha" ON "auditoria"("fecha_hora");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculo_placa_key" ON "vehiculo"("placa");

-- CreateIndex
CREATE INDEX "idx_docveh_vehiculo" ON "documento_vehiculo"("id_vehiculo");

-- CreateIndex
CREATE INDEX "idx_docveh_vencimiento" ON "documento_vehiculo"("fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "piloto_dpi_key" ON "piloto"("dpi");

-- CreateIndex
CREATE UNIQUE INDEX "piloto_num_licencia_key" ON "piloto"("num_licencia");

-- CreateIndex
CREATE INDEX "idx_piloto_licencia" ON "piloto"("num_licencia");

-- CreateIndex
CREATE INDEX "idx_piloto_vencimiento" ON "piloto"("venc_licencia");

-- CreateIndex
CREATE UNIQUE INDEX "mecanico_dpi_key" ON "mecanico"("dpi");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_key" ON "categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE INDEX "idx_producto_codigo" ON "producto"("codigo");

-- CreateIndex
CREATE INDEX "idx_producto_categoria" ON "producto"("id_categoria");

-- CreateIndex
CREATE INDEX "idx_producto_proveedor" ON "producto"("id_proveedor");

-- CreateIndex
CREATE INDEX "idx_movimiento_producto" ON "movimiento_inventario"("id_producto");

-- CreateIndex
CREATE INDEX "idx_movimiento_fecha" ON "movimiento_inventario"("fecha");

-- CreateIndex
CREATE INDEX "idx_compra_proveedor" ON "compra"("id_proveedor");

-- CreateIndex
CREATE INDEX "idx_orden_vehiculo" ON "orden_servicio"("id_vehiculo");

-- CreateIndex
CREATE INDEX "idx_orden_mecanico" ON "orden_servicio"("id_mecanico");

-- CreateIndex
CREATE INDEX "idx_orden_estado" ON "orden_servicio"("estado");

-- CreateIndex
CREATE INDEX "idx_orden_fecha" ON "orden_servicio"("fecha_ingreso");

-- CreateIndex
CREATE INDEX "idx_viaje_vehiculo" ON "viaje"("id_vehiculo");

-- CreateIndex
CREATE INDEX "idx_viaje_piloto" ON "viaje"("id_piloto");

-- CreateIndex
CREATE INDEX "idx_viaje_estado" ON "viaje"("estado");

-- CreateIndex
CREATE INDEX "idx_viaje_fecha" ON "viaje"("fecha_salida");

-- CreateIndex
CREATE INDEX "idx_gasto_viaje" ON "gasto"("id_viaje");

-- CreateIndex
CREATE UNIQUE INDEX "venta_num_comprobante_key" ON "venta"("num_comprobante");

-- CreateIndex
CREATE INDEX "idx_venta_cliente" ON "venta"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_venta_fecha" ON "venta"("fecha");

-- CreateIndex
CREATE INDEX "idx_notificacion_usuario" ON "notificacion"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_notificacion_leida" ON "notificacion"("leida");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_vehiculo" ADD CONSTRAINT "documento_vehiculo_id_vehiculo_fkey" FOREIGN KEY ("id_vehiculo") REFERENCES "vehiculo"("id_vehiculo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto_proveedor" ADD CONSTRAINT "contacto_proveedor_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id_proveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedor"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_id_compra_fkey" FOREIGN KEY ("id_compra") REFERENCES "compra"("id_compra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_id_vehiculo_fkey" FOREIGN KEY ("id_vehiculo") REFERENCES "vehiculo"("id_vehiculo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_id_mecanico_fkey" FOREIGN KEY ("id_mecanico") REFERENCES "mecanico"("id_mecanico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_servicio" ADD CONSTRAINT "orden_servicio_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_repuesto" ADD CONSTRAINT "orden_repuesto_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "orden_servicio"("id_orden") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_repuesto" ADD CONSTRAINT "orden_repuesto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_id_vehiculo_fkey" FOREIGN KEY ("id_vehiculo") REFERENCES "vehiculo"("id_vehiculo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_id_piloto_fkey" FOREIGN KEY ("id_piloto") REFERENCES "piloto"("id_piloto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_id_viaje_fkey" FOREIGN KEY ("id_viaje") REFERENCES "viaje"("id_viaje") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "cliente"("id_cliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "venta"("id_venta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
