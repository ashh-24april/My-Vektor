import { Request, Response } from "express";
import prisma from "../config/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORÍAS
// ─────────────────────────────────────────────────────────────────────────────

export const getCategorias = async (req: Request, res: Response) => {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } }
    });
    return res.status(200).json(categorias);
  } catch (err) {
    console.error("Error getCategorias:", err);
    return res.status(500).json({ error: "Error al obtener categorías." });
  }
};

export const createCategoria = async (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es requerido." });
  try {
    const existing = await prisma.categoria.findUnique({ where: { nombre: nombre.trim() } });
    if (existing) return res.status(409).json({ error: "Ya existe una categoría con ese nombre." });
    const cat = await prisma.categoria.create({ data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null } });
    return res.status(201).json(cat);
  } catch (err) {
    console.error("Error createCategoria:", err);
    return res.status(500).json({ error: "Error al crear categoría." });
  }
};

export const updateCategoria = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { nombre, descripcion } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es requerido." });
  try {
    const cat = await prisma.categoria.update({
      where: { id_categoria: id },
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null }
    });
    return res.status(200).json(cat);
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "Ya existe una categoría con ese nombre." });
    return res.status(500).json({ error: "Error al actualizar categoría." });
  }
};

export const deleteCategoria = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const count = await prisma.producto.count({ where: { id_categoria: id } });
    if (count > 0) return res.status(409).json({ error: `No puedes eliminar esta categoría: tiene ${count} producto(s) asociado(s).` });
    await prisma.categoria.delete({ where: { id_categoria: id } });
    return res.status(200).json({ message: "Categoría eliminada." });
  } catch (err) {
    console.error("Error deleteCategoria:", err);
    return res.status(500).json({ error: "Error al eliminar categoría." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDORES
// ─────────────────────────────────────────────────────────────────────────────

export const getProveedores = async (req: Request, res: Response) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        contactos: true,
        _count: { select: { productos: true } }
      }
    });
    return res.status(200).json(proveedores);
  } catch (err) {
    console.error("Error getProveedores:", err);
    return res.status(500).json({ error: "Error al obtener proveedores." });
  }
};

export const createProveedor = async (req: Request, res: Response) => {
  const { nombre, nit, telefono, correo, direccion, tipo_producto, contactos = [] } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es requerido." });
  try {
    const prov = await prisma.proveedor.create({
      data: {
        nombre: nombre.trim(),
        nit: nit?.trim() || null,
        telefono: telefono?.trim() || null,
        correo: correo?.trim() || null,
        direccion: direccion?.trim() || null,
        tipo_producto: tipo_producto?.trim() || null,
        contactos: contactos.length > 0 ? {
          create: contactos.map((c: any) => ({
            nombre: c.nombre?.trim(),
            cargo: c.cargo?.trim() || null,
            telefono: c.telefono?.trim() || null,
            correo: c.correo?.trim() || null,
          }))
        } : undefined
      },
      include: { contactos: true }
    });
    return res.status(201).json(prov);
  } catch (err) {
    console.error("Error createProveedor:", err);
    return res.status(500).json({ error: "Error al crear proveedor." });
  }
};

export const updateProveedor = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { nombre, nit, telefono, correo, direccion, tipo_producto, activo } = req.body;
  try {
    const prov = await prisma.proveedor.update({
      where: { id_proveedor: id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(nit !== undefined && { nit: nit?.trim() || null }),
        ...(telefono !== undefined && { telefono: telefono?.trim() || null }),
        ...(correo !== undefined && { correo: correo?.trim() || null }),
        ...(direccion !== undefined && { direccion: direccion?.trim() || null }),
        ...(tipo_producto !== undefined && { tipo_producto: tipo_producto?.trim() || null }),
        ...(activo !== undefined && { activo }),
      },
      include: { contactos: true }
    });
    return res.status(200).json(prov);
  } catch (err) {
    console.error("Error updateProveedor:", err);
    return res.status(500).json({ error: "Error al actualizar proveedor." });
  }
};

export const deleteProveedor = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.proveedor.update({ where: { id_proveedor: id }, data: { activo: false } });
    return res.status(200).json({ message: "Proveedor desactivado." });
  } catch (err) {
    console.error("Error deleteProveedor:", err);
    return res.status(500).json({ error: "Error al desactivar proveedor." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────────────────────────────────────

export const getProductos = async (req: Request, res: Response) => {
  try {
    const { q, categoria, stock_bajo, activo = "true", page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, parseInt(limit as string) || 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (activo !== "all") where.activo = activo === "true";
    if (categoria) where.id_categoria = parseInt(categoria as string);
    if (stock_bajo === "true") where.stock = { lte: prisma.producto.fields.stock_minimo as any };
    if (q) {
      where.OR = [
        { codigo: { contains: q as string, mode: "insensitive" } },
        { descripcion: { contains: q as string, mode: "insensitive" } },
      ];
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { descripcion: "asc" },
        include: {
          categoria: { select: { id_categoria: true, nombre: true } },
          proveedor: { select: { id_proveedor: true, nombre: true } },
        },
      }),
      prisma.producto.count({ where }),
    ]);

    return res.status(200).json({ productos, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Error getProductos:", err);
    return res.status(500).json({ error: "Error al obtener productos." });
  }
};

export const getProductoById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const producto = await prisma.producto.findUnique({
      where: { id_producto: id },
      include: {
        categoria: true,
        proveedor: true,
        movimientos_inventario: {
          orderBy: { fecha: "desc" },
          take: 20,
          include: { usuario: { select: { nombre: true, usuario: true } } },
        },
      },
    });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado." });
    return res.status(200).json(producto);
  } catch (err) {
    console.error("Error getProductoById:", err);
    return res.status(500).json({ error: "Error al obtener producto." });
  }
};

export const createProducto = async (req: Request, res: Response) => {
  const {
    codigo, descripcion, id_categoria, id_proveedor,
    ubicacion, unidad_medida = "Unidad", stock = 0,
    stock_minimo = 0, precio_compra = 0, precio_venta = 0, foto_url
  } = req.body;

  if (!codigo?.trim()) return res.status(400).json({ error: "El código es requerido." });
  if (!descripcion?.trim()) return res.status(400).json({ error: "La descripción es requerida." });
  if (!id_categoria) return res.status(400).json({ error: "La categoría es requerida." });

  try {
    const producto = await prisma.producto.create({
      data: {
        codigo: codigo.trim().toUpperCase(),
        descripcion: descripcion.trim(),
        id_categoria: parseInt(id_categoria),
        id_proveedor: id_proveedor ? parseInt(id_proveedor) : null,
        ubicacion: ubicacion?.trim() || null,
        unidad_medida: unidad_medida?.trim() || "Unidad",
        stock: parseInt(stock) || 0,
        stock_minimo: parseInt(stock_minimo) || 0,
        precio_compra: parseFloat(precio_compra) || 0,
        precio_venta: parseFloat(precio_venta) || 0,
        foto_url: foto_url || null,
      },
      include: {
        categoria: { select: { id_categoria: true, nombre: true } },
        proveedor: { select: { id_proveedor: true, nombre: true } },
      },
    });

    // Registrar movimiento inicial si tiene stock
    if (producto.stock > 0) {
      await prisma.movimientoInventario.create({
        data: {
          id_producto: producto.id_producto,
          id_usuario: (req as any).user?.id || 1,
          tipo: "ENTRADA",
          cantidad: producto.stock,
          stock_antes: 0,
          stock_despues: producto.stock,
          referencia: "STOCK_INICIAL",
          motivo: "Stock inicial al crear producto",
        },
      });
    }

    return res.status(201).json(producto);
  } catch (err: any) {
    console.error("Error createProducto:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "Ya existe un producto con ese código." });
    return res.status(500).json({ error: "Error al crear producto." });
  }
};

export const updateProducto = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    codigo, descripcion, id_categoria, id_proveedor,
    ubicacion, unidad_medida, stock_minimo,
    precio_compra, precio_venta, activo, foto_url
  } = req.body;

  try {
    const producto = await prisma.producto.update({
      where: { id_producto: id },
      data: {
        ...(codigo !== undefined && { codigo: codigo.trim().toUpperCase() }),
        ...(descripcion !== undefined && { descripcion: descripcion.trim() }),
        ...(id_categoria !== undefined && { id_categoria: parseInt(id_categoria) }),
        ...(id_proveedor !== undefined && { id_proveedor: id_proveedor ? parseInt(id_proveedor) : null }),
        ...(ubicacion !== undefined && { ubicacion: ubicacion?.trim() || null }),
        ...(unidad_medida !== undefined && { unidad_medida: unidad_medida.trim() }),
        ...(stock_minimo !== undefined && { stock_minimo: parseInt(stock_minimo) }),
        ...(precio_compra !== undefined && { precio_compra: parseFloat(precio_compra) }),
        ...(precio_venta !== undefined && { precio_venta: parseFloat(precio_venta) }),
        ...(activo !== undefined && { activo }),
        ...(foto_url !== undefined && { foto_url }),
      },
      include: {
        categoria: { select: { id_categoria: true, nombre: true } },
        proveedor: { select: { id_proveedor: true, nombre: true } },
      },
    });
    return res.status(200).json(producto);
  } catch (err: any) {
    console.error("Error updateProducto:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "Ya existe un producto con ese código." });
    return res.status(500).json({ error: "Error al actualizar producto." });
  }
};

export const deleteProducto = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.producto.update({ where: { id_producto: id }, data: { activo: false } });
    return res.status(200).json({ message: "Producto desactivado del inventario." });
  } catch (err) {
    console.error("Error deleteProducto:", err);
    return res.status(500).json({ error: "Error al desactivar producto." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MOVIMIENTOS DE INVENTARIO
// ─────────────────────────────────────────────────────────────────────────────

export const getMovimientos = async (req: Request, res: Response) => {
  const id = parseInt(req.params.productoId);
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      where: { id_producto: id },
      orderBy: { fecha: "desc" },
      take: 50,
      include: { usuario: { select: { nombre: true, usuario: true } } },
    });
    return res.status(200).json(movimientos);
  } catch (err) {
    console.error("Error getMovimientos:", err);
    return res.status(500).json({ error: "Error al obtener movimientos." });
  }
};

export const registrarMovimiento = async (req: Request, res: Response) => {
  const { id_producto, tipo, cantidad, referencia, motivo } = req.body;
  const userId = (req as any).user?.id;

  if (!id_producto || !tipo || !cantidad) {
    return res.status(400).json({ error: "Faltan campos requeridos: id_producto, tipo, cantidad." });
  }

  const cantidadNum = parseInt(cantidad);
  if (isNaN(cantidadNum) || cantidadNum <= 0) {
    return res.status(400).json({ error: "La cantidad debe ser un número positivo." });
  }

  if (!["ENTRADA", "SALIDA", "AJUSTE"].includes(tipo)) {
    return res.status(400).json({ error: "El tipo debe ser ENTRADA, SALIDA o AJUSTE." });
  }

  try {
    const producto = await prisma.producto.findUnique({ where: { id_producto: parseInt(id_producto) } });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado." });

    const stockAntes = producto.stock;
    let stockDespues: number;

    if (tipo === "ENTRADA") {
      stockDespues = stockAntes + cantidadNum;
    } else if (tipo === "SALIDA") {
      if (stockAntes < cantidadNum) {
        return res.status(409).json({ error: `Stock insuficiente. Stock actual: ${stockAntes}, solicitado: ${cantidadNum}.` });
      }
      stockDespues = stockAntes - cantidadNum;
    } else {
      stockDespues = cantidadNum; // AJUSTE: el valor es el stock final
    }

    // Transacción: actualizar stock + crear movimiento
    const [, movimiento] = await prisma.$transaction([
      prisma.producto.update({
        where: { id_producto: parseInt(id_producto) },
        data: { stock: stockDespues },
      }),
      prisma.movimientoInventario.create({
        data: {
          id_producto: parseInt(id_producto),
          id_usuario: userId,
          tipo,
          cantidad: cantidadNum,
          stock_antes: stockAntes,
          stock_despues: stockDespues,
          referencia: referencia?.trim() || null,
          motivo: motivo?.trim() || null,
        },
      }),
    ]);

    return res.status(201).json({ movimiento, stock_actual: stockDespues });
  } catch (err) {
    console.error("Error registrarMovimiento:", err);
    return res.status(500).json({ error: "Error al registrar movimiento de inventario." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPRAS
// ─────────────────────────────────────────────────────────────────────────────

export const getCompras = async (req: Request, res: Response) => {
  try {
    const { estado, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (estado) where.estado = estado as string;

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: "desc" },
        include: {
          proveedor: { select: { id_proveedor: true, nombre: true } },
          usuario: { select: { nombre: true, usuario: true } },
          _count: { select: { detalles: true } },
        },
      }),
      prisma.compra.count({ where }),
    ]);

    return res.status(200).json({ compras, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Error getCompras:", err);
    return res.status(500).json({ error: "Error al obtener compras." });
  }
};

export const getCompraById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const compra = await prisma.compra.findUnique({
      where: { id_compra: id },
      include: {
        proveedor: true,
        usuario: { select: { nombre: true, usuario: true } },
        detalles: {
          include: {
            producto: { select: { id_producto: true, codigo: true, descripcion: true, unidad_medida: true } },
          },
        },
      },
    });
    if (!compra) return res.status(404).json({ error: "Compra no encontrada." });
    return res.status(200).json(compra);
  } catch (err) {
    console.error("Error getCompraById:", err);
    return res.status(500).json({ error: "Error al obtener compra." });
  }
};

export const createCompra = async (req: Request, res: Response) => {
  const { id_proveedor, num_factura, fecha, observaciones, detalles = [] } = req.body;
  const userId = (req as any).user?.id;

  if (!id_proveedor) return res.status(400).json({ error: "El proveedor es requerido." });
  if (!detalles.length) return res.status(400).json({ error: "La compra debe tener al menos un producto." });

  try {
    // Calcular totales
    let subtotal = 0;
    for (const d of detalles) {
      subtotal += parseFloat(d.precio_unit) * parseInt(d.cantidad);
    }

    const compra = await prisma.$transaction(async (tx) => {
      const nuevaCompra = await tx.compra.create({
        data: {
          id_proveedor: parseInt(id_proveedor),
          id_usuario: userId,
          num_factura: num_factura?.trim() || null,
          fecha: fecha ? new Date(fecha) : new Date(),
          subtotal,
          total: subtotal,
          estado: "Recibida",
          observaciones: observaciones?.trim() || null,
          detalles: {
            create: detalles.map((d: any) => ({
              id_producto: parseInt(d.id_producto),
              cantidad: parseInt(d.cantidad),
              precio_unit: parseFloat(d.precio_unit),
              subtotal: parseFloat(d.precio_unit) * parseInt(d.cantidad),
            })),
          },
        },
        include: { detalles: true, proveedor: { select: { nombre: true } } },
      });

      // Actualizar stock y registrar movimiento por cada producto
      for (const d of detalles) {
        const prod = await tx.producto.findUnique({ where: { id_producto: parseInt(d.id_producto) } });
        if (!prod) continue;
        const nuevoStock = prod.stock + parseInt(d.cantidad);
        await tx.producto.update({
          where: { id_producto: parseInt(d.id_producto) },
          data: { stock: nuevoStock },
        });
        await tx.movimientoInventario.create({
          data: {
            id_producto: parseInt(d.id_producto),
            id_usuario: userId,
            tipo: "ENTRADA",
            cantidad: parseInt(d.cantidad),
            stock_antes: prod.stock,
            stock_despues: nuevoStock,
            referencia: `COMPRA-${nuevaCompra.id_compra}`,
            motivo: `Compra registrada — Proveedor: ${nuevaCompra.proveedor.nombre}`,
          },
        });
      }

      return nuevaCompra;
    });

    return res.status(201).json(compra);
  } catch (err) {
    console.error("Error createCompra:", err);
    return res.status(500).json({ error: "Error al registrar la compra." });
  }
};

export const updateCompraEstado = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { estado } = req.body;
  const ESTADOS = ["Pendiente", "Recibida", "Cancelada"];
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: `Estado inválido. Permitidos: ${ESTADOS.join(", ")}.` });
  try {
    const compra = await prisma.compra.update({ where: { id_compra: id }, data: { estado } });
    return res.status(200).json(compra);
  } catch (err) {
    console.error("Error updateCompraEstado:", err);
    return res.status(500).json({ error: "Error al actualizar estado de compra." });
  }
};
