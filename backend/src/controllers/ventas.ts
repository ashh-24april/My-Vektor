import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middlewares/auth";

/**
 * Genera el siguiente folio correlativo anual para facturas.
 * Formato: FAC-YYYY-0001
 */
const generarSiguienteFolio = async (): Promise<string> => {
  const anioActual = new Date().getFullYear();
  const prefijo = `FAC-${anioActual}-`;

  const ultimaVenta = await prisma.venta.findFirst({
    where: {
      folio_factura: {
        startsWith: prefijo
      }
    },
    orderBy: {
      id_venta: "desc"
    },
    select: {
      folio_factura: true
    }
  });

  if (!ultimaVenta || !ultimaVenta.folio_factura) {
    return `${prefijo}0001`;
  }

  const partes = ultimaVenta.folio_factura.split("-");
  const correlativoStr = partes[partes.length - 1];
  const correlativoNum = parseInt(correlativoStr, 10) || 0;
  const siguiente = (correlativoNum + 1).toString().padStart(4, "0");

  return `${prefijo}${siguiente}`;
};

/**
 * GET /api/ventas/kpis
 * Obtiene métricas en tiempo real para las tarjetas superiores (KPIs):
 * - Total de ventas del mes en curso
 * - Facturas pendientes de cobro (conteo y monto)
 * - Facturas pagadas del mes (conteo y monto)
 * - Facturas anuladas
 */
export const getVentasKPIs = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const ahora = new Date();
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Total del mes (todas las no anuladas emitidas este mes)
    const ventasMes = await prisma.venta.findMany({
      where: {
        activo: true,
        estado_pago: { not: "Anulada" },
        fecha_emision: {
          gte: primerDiaMes,
          lte: ultimoDiaMes
        }
      },
      select: {
        total: true,
        estado_pago: true
      }
    });

    const totalVentasMes = ventasMes.reduce((acc, v) => acc + Number(v.total || 0), 0);

    // 2. Facturas Pendientes (Globales activas)
    const pendientes = await prisma.venta.findMany({
      where: {
        activo: true,
        estado_pago: "Pendiente"
      },
      select: {
        total: true
      }
    });

    const totalPendientesMonto = pendientes.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const totalPendientesCantidad = pendientes.length;

    // 3. Facturas Pagadas (del mes)
    const pagadas = ventasMes.filter(v => v.estado_pago === "Pagada");
    const totalPagadasMonto = pagadas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const totalPagadasCantidad = pagadas.length;

    // 4. Facturas Anuladas del mes
    const anuladasCount = await prisma.venta.count({
      where: {
        estado_pago: "Anulada",
        fecha_emision: {
          gte: primerDiaMes,
          lte: ultimoDiaMes
        }
      }
    });

    return res.status(200).json({
      totalVentasMes,
      totalPendientesMonto,
      totalPendientesCantidad,
      totalPagadasMonto,
      totalPagadasCantidad,
      anuladasCount
    });
  } catch (error: any) {
    console.error("[Ventas] Error en getVentasKPIs:", error);
    return res.status(500).json({ error: "Error al calcular indicadores de ventas." });
  }
};

/**
 * GET /api/ventas
 * Lista de facturas/ventas con filtros dinámicos y paginación.
 */
export const getVentas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      q,
      estado_pago,
      concepto_servicio,
      fecha_desde,
      fecha_hasta,
      page = "1",
      limit = "15"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 15);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {
      activo: true
    };

    // Filtro de búsqueda por texto (Folio, Cliente, NIT)
    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim();
      whereClause.OR = [
        { folio_factura: { contains: term, mode: "insensitive" } },
        { cliente_nombre: { contains: term, mode: "insensitive" } },
        { cliente_nit: { contains: term, mode: "insensitive" } },
        { cliente: { nombre: { contains: term, mode: "insensitive" } } },
        { num_comprobante: { contains: term, mode: "insensitive" } }
      ];
    }

    // Filtro por estado de pago
    if (estado_pago && typeof estado_pago === "string" && estado_pago !== "Todos") {
      whereClause.estado_pago = estado_pago;
    }

    // Filtro por concepto
    if (concepto_servicio && typeof concepto_servicio === "string" && concepto_servicio !== "Todos") {
      whereClause.concepto_servicio = concepto_servicio;
    }

    // Filtro por rango de fechas de emisión
    if (fecha_desde || fecha_hasta) {
      whereClause.fecha_emision = {};
      if (fecha_desde) {
        whereClause.fecha_emision.gte = new Date(`${fecha_desde}T00:00:00.000Z`);
      }
      if (fecha_hasta) {
        whereClause.fecha_emision.lte = new Date(`${fecha_hasta}T23:59:59.999Z`);
      }
    }

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where: whereClause,
        include: {
          cliente: {
            select: {
              id_cliente: true,
              nombre: true,
              nit: true,
              telefono: true,
              correo: true,
              direccion: true
            }
          },
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              usuario: true
            }
          },
          vehiculo: {
            select: {
              id_vehiculo: true,
              placa: true,
              marca: true,
              modelo: true
            }
          }
        },
        orderBy: {
          id_venta: "desc"
        },
        skip,
        take: limitNum
      }),
      prisma.venta.count({ where: whereClause })
    ]);

    // Mapeo seguro con números formateados
    const ventasFormateadas = ventas.map(v => ({
      ...v,
      subtotal: Number(v.subtotal || 0),
      impuesto: Number(v.impuesto || 0),
      descuento: Number(v.descuento || 0),
      total: Number(v.total || 0)
    }));

    return res.status(200).json({
      ventas: ventasFormateadas,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error: any) {
    console.error("[Ventas] Error en getVentas:", error);
    return res.status(500).json({ error: "Error al consultar listado de ventas." });
  }
};

/**
 * GET /api/ventas/:id
 * Retorna el detalle completo de una venta/factura para vista de comprobante.
 */
export const getVentaById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de venta inválido." });
    }

    const venta = await prisma.venta.findUnique({
      where: { id_venta: id },
      include: {
        cliente: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            usuario: true
          }
        },
        vehiculo: true,
        detalles: {
          include: {
            producto: {
              select: {
                id_producto: true,
                codigo: true,
                descripcion: true,
                unidad_medida: true
              }
            }
          }
        }
      }
    });

    if (!venta || !venta.activo) {
      return res.status(404).json({ error: "Venta no encontrada." });
    }

    return res.status(200).json({
      ...venta,
      subtotal: Number(venta.subtotal || 0),
      impuesto: Number(venta.impuesto || 0),
      descuento: Number(venta.descuento || 0),
      total: Number(venta.total || 0),
      detalles: (venta.detalles || []).map(d => ({
        ...d,
        precio_unit: Number(d.precio_unit || 0),
        subtotal: Number(d.subtotal || 0)
      }))
    });
  } catch (error: any) {
    console.error("[Ventas] Error en getVentaById:", error);
    return res.status(500).json({ error: "Error al obtener detalle de la venta." });
  }
};

/**
 * POST /api/ventas
 * Emite una nueva factura / venta de flete o servicio.
 */
export const createVenta = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      id_cliente,
      cliente_nombre,
      cliente_nit,
      cliente_telefono,
      cliente_direccion,
      concepto_servicio = "Flete",
      id_vehiculo,
      monto_subtotal,
      impuesto = 0,
      descuento = 0,
      monto_total,
      fecha_emision,
      fecha_vencimiento,
      estado_pago = "Pendiente",
      metodo_pago,
      observaciones,
      detalles
    } = req.body;

    const subtotalNum = parseFloat(monto_subtotal);
    if (isNaN(subtotalNum) || subtotalNum < 0) {
      return res.status(400).json({ error: "El monto subtotal debe ser un número válido." });
    }

    const impuestoNum = parseFloat(impuesto) || 0;
    const descuentoNum = parseFloat(descuento) || 0;
    const totalCalculado = subtotalNum + impuestoNum - descuentoNum;
    const totalFinal = parseFloat(monto_total) || (totalCalculado > 0 ? totalCalculado : subtotalNum);

    // Obtener datos del cliente si se seleccionó un ID existente
    let nombreFinal = cliente_nombre ? String(cliente_nombre).trim() : "";
    let nitFinal = cliente_nit ? String(cliente_nit).trim().toUpperCase() : "C/F";
    let telFinal = cliente_telefono ? String(cliente_telefono).trim() : null;
    let dirFinal = cliente_direccion ? String(cliente_direccion).trim() : null;

    if (id_cliente) {
      const clienteDb = await prisma.cliente.findUnique({
        where: { id_cliente: Number(id_cliente) }
      });
      if (clienteDb) {
        if (!nombreFinal) nombreFinal = clienteDb.nombre;
        if (nitFinal === "C/F" && clienteDb.nit) nitFinal = clienteDb.nit;
        if (!telFinal && clienteDb.telefono) telFinal = clienteDb.telefono;
        if (!dirFinal && clienteDb.direccion) dirFinal = clienteDb.direccion;
      }
    }

    if (!nombreFinal) {
      return res.status(400).json({ error: "El nombre del cliente es obligatorio." });
    }

    // Generar folio único correlativo
    const folioGenerado = await generarSiguienteFolio();

    const emisionDate = fecha_emision ? new Date(fecha_emision) : new Date();
    const vencimientoDate = fecha_vencimiento ? new Date(fecha_vencimiento) : null;
    const fechaPagoDate = estado_pago === "Pagada" ? new Date() : null;

    // Crear la venta
    const nuevaVenta = await prisma.venta.create({
      data: {
        folio_factura: folioGenerado,
        id_cliente: id_cliente ? Number(id_cliente) : null,
        id_usuario: req.user?.id || 1,
        id_vehiculo: id_vehiculo ? Number(id_vehiculo) : null,
        cliente_nombre: nombreFinal,
        cliente_nit: nitFinal,
        cliente_telefono: telFinal,
        cliente_direccion: dirFinal,
        concepto_servicio: String(concepto_servicio).trim(),
        subtotal: subtotalNum,
        impuesto: impuestoNum,
        descuento: descuentoNum,
        total: totalFinal,
        estado: "Completada",
        estado_pago: estado_pago === "Pagada" ? "Pagada" : "Pendiente",
        metodo_pago: metodo_pago || (estado_pago === "Pagada" ? "Transferencia" : null),
        fecha: emisionDate,
        fecha_emision: emisionDate,
        fecha_vencimiento: vencimientoDate,
        fecha_pago: fechaPagoDate,
        observaciones: observaciones ? String(observaciones).trim() : null,
        activo: true
      },
      include: {
        cliente: true,
        usuario: {
          select: { id_usuario: true, nombre: true }
        },
        vehiculo: true
      }
    });

    // Si vienen detalles de productos adicionales
    if (Array.isArray(detalles) && detalles.length > 0) {
      for (const item of detalles) {
        if (item.id_producto && item.cantidad > 0) {
          const itemCant = Number(item.cantidad);
          const itemPrecio = Number(item.precio_unit || 0);
          await prisma.detalleVenta.create({
            data: {
              id_venta: nuevaVenta.id_venta,
              id_producto: Number(item.id_producto),
              cantidad: itemCant,
              precio_unit: itemPrecio,
              descuento: Number(item.descuento || 0)
            }
          });
        }
      }
    }

    // Registrar en auditoría
    if (req.user?.id) {
      await prisma.auditoria.create({
        data: {
          id_usuario: req.user.id,
          accion: "EMISION_FACTURA_VENTA",
          modulo: "VENTAS",
          descripcion: `Factura ${folioGenerado} emitida a favor de "${nombreFinal}" por monto total de Q${totalFinal.toFixed(2)}.`
        }
      });
    }

    return res.status(201).json({
      message: "Factura emitida exitosamente.",
      venta: {
        ...nuevaVenta,
        subtotal: Number(nuevaVenta.subtotal),
        impuesto: Number(nuevaVenta.impuesto),
        total: Number(nuevaVenta.total)
      }
    });
  } catch (error: any) {
    console.error("[Ventas] Error en createVenta:", error);
    return res.status(500).json({ error: "Error al emitir factura / venta." });
  }
};

/**
 * PATCH /api/ventas/:id/estado
 * Cambia el estado de pago de una factura (ej. marcar como 'Pagada' o 'Anulada').
 */
export const updateEstadoPago = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de venta inválido." });
    }

    const { estado_pago, metodo_pago, fecha_pago, observaciones } = req.body;

    if (!["Pagada", "Pendiente", "Anulada"].includes(estado_pago)) {
      return res.status(400).json({ error: "Estado de pago no reconocido." });
    }

    const ventaExistente = await prisma.venta.findUnique({
      where: { id_venta: id }
    });

    if (!ventaExistente || !ventaExistente.activo) {
      return res.status(404).json({ error: "Venta no encontrada." });
    }

    let finalFechaPago = ventaExistente.fecha_pago;
    if (estado_pago === "Pagada") {
      finalFechaPago = fecha_pago ? new Date(fecha_pago) : new Date();
    } else if (estado_pago === "Pendiente") {
      finalFechaPago = null;
    }

    const ventaActualizada = await prisma.venta.update({
      where: { id_venta: id },
      data: {
        estado_pago,
        metodo_pago: metodo_pago || ventaExistente.metodo_pago,
        fecha_pago: finalFechaPago,
        observaciones: observaciones ? String(observaciones).trim() : ventaExistente.observaciones,
        updated_at: new Date()
      }
    });

    if (req.user?.id) {
      await prisma.auditoria.create({
        data: {
          id_usuario: req.user.id,
          accion: "CAMBIO_ESTADO_PAGO_VENTA",
          modulo: "VENTAS",
          descripcion: `Factura ${ventaExistente.folio_factura || id} actualizada a estado "${estado_pago}".`
        }
      });
    }

    return res.status(200).json({
      message: `Estado de pago actualizado a ${estado_pago}.`,
      venta: ventaActualizada
    });
  } catch (error: any) {
    console.error("[Ventas] Error en updateEstadoPago:", error);
    return res.status(500).json({ error: "Error al actualizar estado de pago." });
  }
};

/**
 * DELETE /api/ventas/:id
 * Anula una venta/factura.
 */
export const anularVenta = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de venta inválido." });
    }

    const ventaExistente = await prisma.venta.findUnique({
      where: { id_venta: id }
    });

    if (!ventaExistente) {
      return res.status(404).json({ error: "Venta no encontrada." });
    }

    const ventaAnulada = await prisma.venta.update({
      where: { id_venta: id },
      data: {
        estado_pago: "Anulada",
        estado: "Anulada",
        updated_at: new Date()
      }
    });

    if (req.user?.id) {
      await prisma.auditoria.create({
        data: {
          id_usuario: req.user.id,
          accion: "ANULACION_FACTURA_VENTA",
          modulo: "VENTAS",
          descripcion: `Factura ${ventaExistente.folio_factura || id} anulada.`
        }
      });
    }

    return res.status(200).json({
      message: "Factura anulada con éxito.",
      venta: ventaAnulada
    });
  } catch (error: any) {
    console.error("[Ventas] Error en anularVenta:", error);
    return res.status(500).json({ error: "Error al anular venta." });
  }
};

/**
 * GET /api/ventas/auxiliares
 * Retorna listado de clientes activos y vehículos para selects en formularios.
 */
export const getVentasAuxiliares = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [clientes, vehiculos, productos] = await Promise.all([
      prisma.cliente.findMany({
        where: { activo: true },
        select: {
          id_cliente: true,
          nombre: true,
          nit: true,
          telefono: true,
          correo: true,
          direccion: true
        },
        orderBy: { nombre: "asc" }
      }),
      prisma.vehiculo.findMany({
        where: { activo: true },
        select: {
          id_vehiculo: true,
          placa: true,
          marca: true,
          modelo: true
        },
        orderBy: { placa: "asc" }
      }),
      prisma.producto.findMany({
        where: { activo: true },
        select: {
          id_producto: true,
          codigo: true,
          descripcion: true,
          precio_venta: true,
          stock: true,
          unidad_medida: true
        },
        orderBy: { descripcion: "asc" }
      })
    ]);

    return res.status(200).json({
      clientes,
      vehiculos,
      productos: productos.map(p => ({
        ...p,
        precio_venta: Number(p.precio_venta)
      }))
    });
  } catch (error: any) {
    console.error("[Ventas] Error en getVentasAuxiliares:", error);
    return res.status(500).json({ error: "Error al obtener datos auxiliares." });
  }
};
