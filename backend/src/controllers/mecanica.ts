import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middlewares/auth";

/**
 * Genera el siguiente número correlativo de Orden de Trabajo (OT).
 * Formato: OT-YYYY-0001
 */
const generarSiguienteOT = async (): Promise<string> => {
  const anioActual = new Date().getFullYear();
  const prefijo = `OT-${anioActual}-`;

  const ultimaOT = await prisma.ordenServicio.findFirst({
    where: {
      numero_ot: {
        startsWith: prefijo
      }
    },
    orderBy: {
      id_orden: "desc"
    },
    select: {
      numero_ot: true
    }
  });

  if (!ultimaOT || !ultimaOT.numero_ot) {
    return `${prefijo}0001`;
  }

  const partes = ultimaOT.numero_ot.split("-");
  const correlativoStr = partes[partes.length - 1];
  const correlativoNum = parseInt(correlativoStr, 10) || 0;
  const siguiente = (correlativoNum + 1).toString().padStart(4, "0");

  return `${prefijo}${siguiente}`;
};

/**
 * GET /api/mecanica/kpis
 * Métricas en tiempo real del taller y servicios de flota.
 */
export const getMecanicaKPIs = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const ahora = new Date();
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Unidades en Taller / En Proceso (Global activo)
    const enProcesoCount = await prisma.ordenServicio.count({
      where: {
        activo: true,
        estado: "En Proceso"
      }
    });

    // 2. Unidades Pendientes de Ingreso/Revisión
    const pendientesCount = await prisma.ordenServicio.count({
      where: {
        activo: true,
        estado: "Pendiente"
      }
    });

    // 3. Órdenes Completadas del Mes
    const completadasMes = await prisma.ordenServicio.findMany({
      where: {
        activo: true,
        estado: "Completada",
        fecha_ingreso: {
          gte: primerDiaMes,
          lte: ultimoDiaMes
        }
      },
      select: {
        costo_total: true,
        tipo_mantenimiento: true
      }
    });

    const completadasCount = completadasMes.length;

    // 4. Mantenimientos Preventivos vs Correctivos este mes
    const preventivosCount = completadasMes.filter(
      o => o.tipo_mantenimiento === "Preventivo"
    ).length;
    const correctivosCount = completadasMes.filter(
      o => o.tipo_mantenimiento === "Correctivo" || o.tipo_mantenimiento === "Emergencia"
    ).length;

    // 5. Inversión Total en Mantenimiento este mes
    const costoTotalMes = completadasMes.reduce((acc, o) => acc + Number(o.costo_total || 0), 0);

    return res.status(200).json({
      enProcesoCount,
      pendientesCount,
      completadasCount,
      preventivosCount,
      correctivosCount,
      costoTotalMes
    });
  } catch (error: any) {
    console.error("[Mecanica] Error en getMecanicaKPIs:", error);
    return res.status(500).json({ error: "Error al calcular indicadores de taller." });
  }
};

/**
 * GET /api/mecanica/ordenes
 * Listado de Órdenes de Trabajo con filtros dinámicos y paginación.
 */
export const getOrdenes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      q,
      estado,
      tipo_mantenimiento,
      id_vehiculo,
      id_mecanico,
      fecha_desde,
      fecha_hasta,
      page = "1",
      limit = "12"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 12);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {
      activo: true
    };

    // Búsqueda por texto (OT, placa, modelo, mecánico, diagnóstico)
    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim();
      whereClause.OR = [
        { numero_ot: { contains: term, mode: "insensitive" } },
        { diagnostico_inicial: { contains: term, mode: "insensitive" } },
        { diagnostico: { contains: term, mode: "insensitive" } },
        { trabajo_realizado: { contains: term, mode: "insensitive" } },
        { vehiculo: { placa: { contains: term, mode: "insensitive" } } },
        { vehiculo: { marca: { contains: term, mode: "insensitive" } } },
        { mecanico: { nombre: { contains: term, mode: "insensitive" } } },
        { mecanico: { apellido: { contains: term, mode: "insensitive" } } }
      ];
    }

    // Filtro por Estado
    if (estado && typeof estado === "string" && estado !== "Todos") {
      whereClause.estado = estado;
    }

    // Filtro por Tipo de Mantenimiento
    if (tipo_mantenimiento && typeof tipo_mantenimiento === "string" && tipo_mantenimiento !== "Todos") {
      whereClause.tipo_mantenimiento = tipo_mantenimiento;
    }

    // Filtro por Vehículo específico
    if (id_vehiculo && typeof id_vehiculo === "string" && id_vehiculo !== "Todos") {
      whereClause.id_vehiculo = parseInt(id_vehiculo, 10);
    }

    // Filtro por Mecánico específico
    if (id_mecanico && typeof id_mecanico === "string" && id_mecanico !== "Todos") {
      whereClause.id_mecanico = parseInt(id_mecanico, 10);
    }

    // Filtro por rango de fechas de ingreso
    if (fecha_desde || fecha_hasta) {
      whereClause.fecha_ingreso = {};
      if (fecha_desde) {
        whereClause.fecha_ingreso.gte = new Date(`${fecha_desde}T00:00:00.000Z`);
      }
      if (fecha_hasta) {
        whereClause.fecha_ingreso.lte = new Date(`${fecha_hasta}T23:59:59.999Z`);
      }
    }

    const [ordenes, total] = await Promise.all([
      prisma.ordenServicio.findMany({
        where: whereClause,
        include: {
          vehiculo: {
            select: {
              id_vehiculo: true,
              placa: true,
              marca: true,
              modelo: true,
              tipo: true,
              kilometraje: true
            }
          },
          mecanico: {
            select: {
              id_mecanico: true,
              nombre: true,
              apellido: true,
              especialidad: true
            }
          },
          piloto: {
            select: {
              id_piloto: true,
              nombre: true,
              apellido: true,
              telefono: true
            }
          },
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              usuario: true
            }
          },
          repuestos: {
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
        },
        orderBy: {
          id_orden: "desc"
        },
        skip,
        take: limitNum
      }),
      prisma.ordenServicio.count({ where: whereClause })
    ]);

    // Formatear números
    const ordenesFormateadas = ordenes.map(o => ({
      ...o,
      costo_mano_obra: Number(o.costo_mano_obra || 0),
      costo_repuestos: Number(o.costo_repuestos || 0),
      costo_total: Number(o.costo_total || 0),
      repuestos: (o.repuestos || []).map(r => ({
        ...r,
        precio_unit: Number(r.precio_unit || 0),
        subtotal: Number(r.subtotal || 0)
      }))
    }));

    return res.status(200).json({
      ordenes: ordenesFormateadas,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error: any) {
    console.error("[Mecanica] Error en getOrdenes:", error);
    return res.status(500).json({ error: "Error al consultar órdenes de trabajo." });
  }
};

/**
 * GET /api/mecanica/ordenes/:id
 * Retorna el detalle completo de una Orden de Trabajo.
 */
export const getOrdenById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de orden inválido." });
    }

    const orden = await prisma.ordenServicio.findUnique({
      where: { id_orden: id },
      include: {
        vehiculo: true,
        mecanico: true,
        piloto: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            usuario: true
          }
        },
        repuestos: {
          include: {
            producto: true
          }
        }
      }
    });

    if (!orden || !orden.activo) {
      return res.status(404).json({ error: "Orden de trabajo no encontrada." });
    }

    return res.status(200).json({
      ...orden,
      costo_mano_obra: Number(orden.costo_mano_obra || 0),
      costo_repuestos: Number(orden.costo_repuestos || 0),
      costo_total: Number(orden.costo_total || 0),
      repuestos: (orden.repuestos || []).map(r => ({
        ...r,
        precio_unit: Number(r.precio_unit || 0),
        subtotal: Number(r.subtotal || 0)
      }))
    });
  } catch (error: any) {
    console.error("[Mecanica] Error en getOrdenById:", error);
    return res.status(500).json({ error: "Error al obtener detalle de la OT." });
  }
};

/**
 * POST /api/mecanica/ordenes
 * Crea una nueva Orden de Trabajo e ingresa la unidad a taller.
 */
export const createOrden = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      id_vehiculo,
      id_mecanico,
      id_piloto,
      tipo_mantenimiento = "Preventivo",
      diagnostico_inicial,
      km_entrada,
      fecha_ingreso,
      fecha_estimada_entrega,
      costo_mano_obra = 0,
      observaciones
    } = req.body;

    if (!id_vehiculo) {
      return res.status(400).json({ error: "El vehículo es obligatorio." });
    }
    if (!id_mecanico) {
      return res.status(400).json({ error: "El mecánico asignado es obligatorio." });
    }

    const numeroOT = await generarSiguienteOT();
    const fechaIngresoDate = fecha_ingreso ? new Date(fecha_ingreso) : new Date();
    const fechaEstDate = fecha_estimada_entrega ? new Date(fecha_estimada_entrega) : null;
    const manoObraNum = parseFloat(costo_mano_obra) || 0;

    // Crear la OT y actualizar el estado del vehículo a 'En Mantenimiento'
    const [nuevaOT] = await prisma.$transaction([
      prisma.ordenServicio.create({
        data: {
          numero_ot: numeroOT,
          id_vehiculo: Number(id_vehiculo),
          id_mecanico: Number(id_mecanico),
          id_piloto: id_piloto ? Number(id_piloto) : null,
          id_usuario: req.user?.id || 1,
          tipo_mantenimiento: String(tipo_mantenimiento).trim(),
          tipo_servicio: String(tipo_mantenimiento).trim(),
          diagnostico_inicial: diagnostico_inicial ? String(diagnostico_inicial).trim() : null,
          diagnostico: diagnostico_inicial ? String(diagnostico_inicial).trim() : null,
          km_entrada: km_entrada ? parseInt(km_entrada, 10) : null,
          costo_mano_obra: manoObraNum,
          costo_repuestos: 0,
          costo_total: manoObraNum,
          estado: "En Proceso",
          fecha_ingreso: fechaIngresoDate,
          fecha_estimada_entrega: fechaEstDate,
          observaciones: observaciones ? String(observaciones).trim() : null,
          activo: true
        },
        include: {
          vehiculo: true,
          mecanico: true,
          piloto: true
        }
      }),
      prisma.vehiculo.update({
        where: { id_vehiculo: Number(id_vehiculo) },
        data: {
          estado: "En Mantenimiento",
          kilometraje: km_entrada ? Math.max(km_entrada, 0) : undefined
        }
      })
    ]);

    // Registrar en auditoría
    if (req.user?.id) {
      await prisma.auditoria.create({
        data: {
          id_usuario: req.user.id,
          accion: "CREACION_ORDEN_TRABAJO",
          modulo: "MECANICA",
          descripcion: `Orden de Trabajo ${numeroOT} creada para vehículo ID ${id_vehiculo} asignada a mecánico ID ${id_mecanico}.`
        }
      });
    }

    return res.status(201).json({
      message: "Orden de Trabajo creada exitosamente.",
      orden: nuevaOT
    });
  } catch (error: any) {
    console.error("[Mecanica] Error en createOrden:", error);
    return res.status(500).json({ error: "Error al crear Orden de Trabajo." });
  }
};

/**
 * POST /api/mecanica/ordenes/:id/repuestos
 * Despacha repuestos de inventario a una OT y descuenta el stock automáticamente.
 */
export const addRepuestosAOrden = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const idOrden = parseInt(req.params.id, 10);
    if (isNaN(idOrden)) {
      return res.status(400).json({ error: "ID de orden inválido." });
    }

    const { items } = req.body; // Array de { id_producto, cantidad, precio_unit? }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Debes incluir al menos un repuesto para despachar." });
    }

    const orden = await prisma.ordenServicio.findUnique({
      where: { id_orden: idOrden }
    });

    if (!orden || !orden.activo) {
      return res.status(404).json({ error: "Orden de trabajo no encontrada." });
    }

    if (orden.estado === "Completada" || orden.estado === "Cancelada") {
      return res.status(400).json({ error: `No se pueden agregar repuestos a una OT en estado ${orden.estado}.` });
    }

    // Validar disponibilidad de stock
    for (const item of items) {
      const prod = await prisma.producto.findUnique({
        where: { id_producto: Number(item.id_producto) }
      });
      if (!prod) {
        return res.status(404).json({ error: `Producto ID ${item.id_producto} no encontrado.` });
      }
      if (prod.stock < Number(item.cantidad)) {
        return res.status(400).json({
          error: `Stock insuficiente para "${prod.descripcion}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}.`
        });
      }
    }

    const numOT = orden.numero_ot || `OT-${orden.id_orden}`;

    // Ejecutar transacción atómica de despacho
    await prisma.$transaction(async tx => {
      let sumaNuevosRepuestos = 0;

      for (const item of items) {
        const prod = await tx.producto.findUnique({
          where: { id_producto: Number(item.id_producto) }
        });
        if (!prod) continue;

        const cant = Number(item.cantidad);
        const precioUnit = item.precio_unit !== undefined ? Number(item.precio_unit) : Number(prod.precio_venta || prod.precio_compra);
        const itemSubtotal = cant * precioUnit;
        sumaNuevosRepuestos += itemSubtotal;

        const stockAntes = prod.stock;
        const stockDespues = Math.max(0, prod.stock - cant);

        // 1. Descontar stock
        await tx.producto.update({
          where: { id_producto: prod.id_producto },
          data: { stock: stockDespues }
        });

        // 2. Registrar salida en kardex
        await tx.movimientoInventario.create({
          data: {
            id_producto: prod.id_producto,
            id_usuario: req.user?.id || orden.id_usuario,
            tipo: "SALIDA",
            cantidad: cant,
            stock_antes: stockAntes,
            stock_despues: stockDespues,
            referencia: numOT,
            motivo: `Despacho de repuestos para OT ${numOT}`
          }
        });

        // 3. Crear o actualizar detalle en OrdenRepuesto
        const detalleExistente = await tx.ordenRepuesto.findUnique({
          where: {
            id_orden_id_producto: {
              id_orden: idOrden,
              id_producto: prod.id_producto
            }
          }
        });

        if (detalleExistente) {
          const nuevaCant = detalleExistente.cantidad + cant;
          const nuevoSub = nuevaCant * Number(detalleExistente.precio_unit);
          await tx.ordenRepuesto.update({
            where: {
              id_orden_id_producto: {
                id_orden: idOrden,
                id_producto: prod.id_producto
              }
            },
            data: {
              cantidad: nuevaCant,
              subtotal: nuevoSub
            }
          });
        } else {
          await tx.ordenRepuesto.create({
            data: {
              id_orden: idOrden,
              id_producto: prod.id_producto,
              cantidad: cant,
              precio_unit: precioUnit,
              subtotal: itemSubtotal
            }
          });
        }
      }

      // Recalcular costo total de repuestos de la orden
      const todosLosRepuestos = await tx.ordenRepuesto.findMany({
        where: { id_orden: idOrden }
      });
      const totalRepuestos = todosLosRepuestos.reduce((acc, r) => acc + Number(r.subtotal), 0);
      const manoObra = Number(orden.costo_mano_obra);

      await tx.ordenServicio.update({
        where: { id_orden: idOrden },
        data: {
          costo_repuestos: totalRepuestos,
          costo_total: manoObra + totalRepuestos
        }
      });
    });

    if (req.user?.id) {
      await prisma.auditoria.create({
        data: {
          id_usuario: req.user.id,
          accion: "DESPACHO_REPUESTOS_OT",
          modulo: "MECANICA",
          descripcion: `Despacho de ${items.length} tipo(s) de repuestos a la Orden de Trabajo ${numOT}.`
        }
      });
    }

    return res.status(200).json({ message: "Repuestos despachados y descontados del inventario correctamente." });
  } catch (error: any) {
    console.error("[Mecanica] Error en addRepuestosAOrden:", error);
    return res.status(500).json({ error: "Error al despachar repuestos a la orden." });
  }
};

/**
 * PATCH /api/mecanica/ordenes/:id/estado
 * Actualiza el estado de la OT (Pendiente, En Proceso, Completada, Cancelada) y libera el vehículo si corresponde.
 */
export const updateEstadoOrden = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de orden inválido." });
    }

    const { estado, trabajo_realizado, costo_mano_obra, observaciones } = req.body;

    if (!["Pendiente", "En Proceso", "Completada", "Cancelada"].includes(estado)) {
      return res.status(400).json({ error: "Estado no reconocido." });
    }

    const ordenExistente = await prisma.ordenServicio.findUnique({
      where: { id_orden: id }
    });

    if (!ordenExistente || !ordenExistente.activo) {
      return res.status(404).json({ error: "Orden de trabajo no encontrada." });
    }

    const manoObraFinal = costo_mano_obra !== undefined ? parseFloat(costo_mano_obra) || 0 : Number(ordenExistente.costo_mano_obra);
    const repuestosFinal = Number(ordenExistente.costo_repuestos);
    const totalFinal = manoObraFinal + repuestosFinal;

    const fechaCierreDate = estado === "Completada" ? new Date() : (estado === "Cancelada" ? null : ordenExistente.fecha_cierre);

    // Transacción para actualizar OT y estado del vehículo
    await prisma.$transaction(async tx => {
      await tx.ordenServicio.update({
        where: { id_orden: id },
        data: {
          estado,
          costo_mano_obra: manoObraFinal,
          costo_total: totalFinal,
          trabajo_realizado: trabajo_realizado ? String(trabajo_realizado).trim() : ordenExistente.trabajo_realizado,
          observaciones: observaciones ? String(observaciones).trim() : ordenExistente.observaciones,
          fecha_cierre: fechaCierreDate,
          fecha_entrega: estado === "Completada" ? new Date() : ordenExistente.fecha_entrega,
          updated_at: new Date()
        }
      });

      // Liberar o bloquear el vehículo según el estado de la OT
      if (estado === "Completada" || estado === "Cancelada") {
        await tx.vehiculo.update({
          where: { id_vehiculo: ordenExistente.id_vehiculo },
          data: { estado: "Disponible" }
        });
      } else if (estado === "En Proceso") {
        await tx.vehiculo.update({
          where: { id_vehiculo: ordenExistente.id_vehiculo },
          data: { estado: "En Mantenimiento" }
        });
      }
    });

    if (req.user?.id) {
      await prisma.auditoria.create({
        data: {
          id_usuario: req.user.id,
          accion: "CAMBIO_ESTADO_OT",
          modulo: "MECANICA",
          descripcion: `Orden de Trabajo ${ordenExistente.numero_ot || id} actualizada al estado "${estado}".`
        }
      });
    }

    return res.status(200).json({ message: `Estado de la OT actualizado a ${estado}.` });
  } catch (error: any) {
    console.error("[Mecanica] Error en updateEstadoOrden:", error);
    return res.status(500).json({ error: "Error al actualizar estado de la orden." });
  }
};

/**
 * GET /api/mecanica/auxiliares
 * Retorna datos auxiliares para selects en formularios (vehículos, mecánicos, pilotos y repuestos de inventario).
 */
export const getMecanicaAuxiliares = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [vehiculos, mecanicos, pilotos, repuestos] = await Promise.all([
      prisma.vehiculo.findMany({
        where: { activo: true },
        select: {
          id_vehiculo: true,
          placa: true,
          marca: true,
          modelo: true,
          tipo: true,
          estado: true,
          kilometraje: true
        },
        orderBy: { placa: "asc" }
      }),
      prisma.mecanico.findMany({
        where: { activo: true },
        select: {
          id_mecanico: true,
          nombre: true,
          apellido: true,
          especialidad: true,
          telefono: true
        },
        orderBy: { nombre: "asc" }
      }),
      prisma.piloto.findMany({
        where: { activo: true },
        select: {
          id_piloto: true,
          nombre: true,
          apellido: true,
          telefono: true
        },
        orderBy: { nombre: "asc" }
      }),
      prisma.producto.findMany({
        where: { activo: true },
        select: {
          id_producto: true,
          codigo: true,
          descripcion: true,
          stock: true,
          precio_venta: true,
          precio_compra: true,
          unidad_medida: true
        },
        orderBy: { descripcion: "asc" }
      })
    ]);

    return res.status(200).json({
      vehiculos,
      mecanicos,
      pilotos,
      repuestos: repuestos.map(r => ({
        ...r,
        precio_venta: Number(r.precio_venta),
        precio_compra: Number(r.precio_compra)
      }))
    });
  } catch (error: any) {
    console.error("[Mecanica] Error en getMecanicaAuxiliares:", error);
    return res.status(500).json({ error: "Error al obtener datos auxiliares de mecánica." });
  }
};
