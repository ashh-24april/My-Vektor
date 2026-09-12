
import { Request, Response } from "express";
import prisma from "../config/prisma";

// Helper para registrar eventos de auditoría
const logAudit = async (
  req: Request,
  accion: string,
  registroId: number | null,
  descripcion: string,
  detallesCambio?: any
) => {
  try {
    const user = (req as any).user;
    if (!user) return;
    await (prisma as any).auditoria.create({
      data: {
        id_usuario: user.id,
        usuario_nombre: user.nombre,
        usuario_email: user.email || user.usuario,
        rol_usuario: user.rol,
        modulo: "Viajes",
        accion,
        registro_id: registroId,
        descripcion,
        detalles_cambio: detallesCambio ? JSON.stringify(detallesCambio) : null,
        ip_origen: req.ip || req.socket.remoteAddress || "127.0.0.1",
        navegador: req.headers["user-agent"] || "Desconocido",
      },
    });
  } catch (err) {
    console.error("[Audit Error Viajes]", err);
  }
};

// Generador de siguiente código de viaje (desde VIA-100)
export const getSiguienteFolioViaje = async (req: Request, res: Response) => {
  try {
    const viajes = await (prisma.viaje as any).findMany({
      select: { codigo_viaje: true },
      where: { codigo_viaje: { not: null } },
    });

    let maxNum = 99;
    const regex = /^VIA-(\d+)$/i;

    for (const v of viajes) {
      if (v.codigo_viaje) {
        const match = v.codigo_viaje.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const siguienteFolio = `VIA-${maxNum + 1}`;
    return res.status(200).json({ siguienteFolio });
  } catch (err) {
    console.error("Error getSiguienteFolioViaje:", err);
    return res.status(500).json({ error: "Error al calcular el siguiente folio de viaje." });
  }
};

export const getViajes = async (req: Request, res: Response) => {
  try {
    const { q, estado, id_cliente, id_piloto, id_vehiculo, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { activo: true };

    if (estado && estado !== "todos") {
      where.estado = estado as string;
    }

    if (id_cliente) {
      where.id_cliente = parseInt(id_cliente as string, 10);
    }

    if (id_piloto) {
      where.id_piloto = parseInt(id_piloto as string, 10);
    }

    if (id_vehiculo) {
      where.id_vehiculo = parseInt(id_vehiculo as string, 10);
    }

    if (q) {
      const search = (q as string).trim();
      where.OR = [
        { codigo_viaje: { contains: search, mode: "insensitive" } },
        { origen: { contains: search, mode: "insensitive" } },
        { destino: { contains: search, mode: "insensitive" } },
        { descripcion_carga: { contains: search, mode: "insensitive" } },
        { vehiculo: { placa: { contains: search, mode: "insensitive" } } },
        { piloto: { nombre: { contains: search, mode: "insensitive" } } },
        { piloto: { apellido: { contains: search, mode: "insensitive" } } },
        { cliente: { nombre: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [viajes, total] = await Promise.all([
      (prisma.viaje as any).findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { fecha_salida: "desc" },
        include: {
          vehiculo: {
            select: { id_vehiculo: true, placa: true, marca: true, modelo: true, kilometraje: true, estado: true },
          },
          piloto: {
            select: { id_piloto: true, nombre: true, apellido: true, telefono: true, num_licencia: true, estado: true },
          },
          cliente: {
            select: { id_cliente: true, nombre: true, nit: true, telefono: true },
          },
          usuario: {
            select: { id_usuario: true, nombre: true },
          },
          gastos: true,
        },
      }),
      (prisma.viaje as any).count({ where }),
    ]);

    return res.status(200).json({ viajes, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Error getViajes:", err);
    return res.status(500).json({ error: "Error al obtener los viajes." });
  }
};

export const getViajeById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de viaje inválido." });

  try {
    const viaje = await (prisma.viaje as any).findUnique({
      where: { id_viaje: id },
      include: {
        vehiculo: true,
        piloto: true,
        cliente: true,
        usuario: true,
        gastos: {
          orderBy: { fecha: "desc" },
          include: { usuario: { select: { id_usuario: true, nombre: true } } },
        },
      },
    });

    if (!viaje) return res.status(404).json({ error: "Viaje no encontrado." });
    return res.status(200).json(viaje);
  } catch (err) {
    console.error("Error getViajeById:", err);
    return res.status(500).json({ error: "Error al obtener viaje." });
  }
};

export const createViaje = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    codigo_viaje,
    id_vehiculo,
    id_remolque,
    id_piloto,
    id_cliente,
    tipo_carga = "Carga Seca",
    origen,
    destino,
    escala_puntos,
    descripcion_carga,
    monto_flete = 0,
    anticipo_viaticos = 0,
    fecha_salida,
    fecha_estimada_llegada,
    km_inicial,
    estado = "Programado",
    observaciones,
  } = req.body;

  if (!id_vehiculo) return res.status(400).json({ error: "La unidad vehicular es obligatoria." });
  if (!id_piloto) return res.status(400).json({ error: "El piloto operador es obligatorio." });
  if (!origen?.trim()) return res.status(400).json({ error: "El origen de la ruta es obligatorio." });
  if (!destino?.trim()) return res.status(400).json({ error: "El destino de la ruta es obligatorio." });
  if (!fecha_salida) return res.status(400).json({ error: "La fecha de salida es obligatoria." });

  try {
    let finalCodigo = codigo_viaje?.trim().toUpperCase();
    if (!finalCodigo) {
      const viajes = await (prisma.viaje as any).findMany({
        select: { codigo_viaje: true },
        where: { codigo_viaje: { not: null } },
      });
      let maxNum = 99;
      const regex = /^VIA-(\d+)$/i;
      for (const v of viajes) {
        if (v.codigo_viaje) {
          const m = v.codigo_viaje.match(regex);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      finalCodigo = `VIA-${maxNum + 1}`;
    }

    const cleanMontoFlete = Math.max(0, parseFloat(monto_flete) || 0);
    const cleanAnticipo = Math.max(0, parseFloat(anticipo_viaticos) || 0);
    const cleanKmInicial = km_inicial !== undefined && km_inicial !== null ? Math.max(0, parseInt(km_inicial, 10) || 0) : null;

    const viaje = await (prisma.viaje as any).create({
      data: {
        codigo_viaje: finalCodigo,
        id_vehiculo: Number(id_vehiculo),
        id_remolque: id_remolque ? Number(id_remolque) : null,
        id_piloto: Number(id_piloto),
        id_cliente: id_cliente ? Number(id_cliente) : null,
        id_usuario: user?.id || 1,
        tipo_carga: tipo_carga || "Carga Seca",
        origen: origen.trim(),
        destino: destino.trim(),
        escala_puntos: escala_puntos?.trim() || null,
        descripcion_carga: descripcion_carga?.trim() || null,
        monto_flete: cleanMontoFlete,
        anticipo_viaticos: cleanAnticipo,
        ingreso_total: cleanMontoFlete,
        costo_total: cleanAnticipo,
        fecha_salida: new Date(fecha_salida),
        fecha_estimada_llegada: fecha_estimada_llegada ? new Date(fecha_estimada_llegada) : null,
        km_inicial: cleanKmInicial,
        estado: estado || "Programado",
        observaciones: observaciones?.trim() || null,
      },
      include: {
        vehiculo: true,
        piloto: true,
        cliente: true,
      },
    });

    // Sincronización operativa de estados si arranca en ruta de inmediato
    if (estado === "En Ruta" || estado === "En Carga/Descarga") {
      await (prisma.vehiculo as any).update({
        where: { id_vehiculo: Number(id_vehiculo) },
        data: { estado: "En Ruta" },
      });
      await (prisma.piloto as any).update({
        where: { id_piloto: Number(id_piloto) },
        data: { estado: "En Viaje", disponible: false },
      });
    }

    await logAudit(req, "Creación", viaje.id_viaje, `Orden de viaje generada: ${finalCodigo} (${origen} -> ${destino})`, viaje);

    return res.status(201).json(viaje);
  } catch (err: any) {
    console.error("Error createViaje:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "El código de viaje ya existe." });
    return res.status(500).json({ error: "Error al crear la orden de viaje." });
  }
};

export const updateViaje = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de viaje inválido." });

  const {
    codigo_viaje,
    id_vehiculo,
    id_remolque,
    id_piloto,
    id_cliente,
    tipo_carga,
    origen,
    destino,
    escala_puntos,
    descripcion_carga,
    monto_flete,
    anticipo_viaticos,
    fecha_salida,
    fecha_estimada_llegada,
    fecha_llegada_real,
    km_inicial,
    km_final,
    galones_combustible,
    costo_combustible,
    estado,
    observaciones,
  } = req.body;

  try {
    const prev = await (prisma.viaje as any).findUnique({ where: { id_viaje: id } });
    if (!prev) return res.status(404).json({ error: "Viaje no encontrado." });

    const cleanKmIni = km_inicial !== undefined ? Math.max(0, parseInt(km_inicial, 10) || 0) : prev.km_inicial;
    const cleanKmFin = km_final !== undefined ? Math.max(0, parseInt(km_final, 10) || 0) : prev.km_final;
    const kmReal = (cleanKmFin && cleanKmIni && cleanKmFin >= cleanKmIni) ? (cleanKmFin - cleanKmIni) : prev.km_real;

    const cleanGalones = galones_combustible !== undefined ? Math.max(0, parseFloat(galones_combustible) || 0) : prev.galones_combustible;
    const cleanCostoComb = costo_combustible !== undefined ? Math.max(0, parseFloat(costo_combustible) || 0) : prev.costo_combustible;

    let rendimiento = prev.rendimiento_calculado;
    if (kmReal && cleanGalones && cleanGalones > 0) {
      rendimiento = Math.round((Number(kmReal) / Number(cleanGalones)) * 100) / 100;
    }

    const nuevoEstado = estado || prev.estado;

    const viaje = await (prisma.viaje as any).update({
      where: { id_viaje: id },
      data: {
        codigo_viaje: codigo_viaje ? codigo_viaje.trim().toUpperCase() : prev.codigo_viaje,
        id_vehiculo: id_vehiculo ? Number(id_vehiculo) : prev.id_vehiculo,
        id_remolque: id_remolque !== undefined ? (id_remolque ? Number(id_remolque) : null) : prev.id_remolque,
        id_piloto: id_piloto ? Number(id_piloto) : prev.id_piloto,
        id_cliente: id_cliente !== undefined ? (id_cliente ? Number(id_cliente) : null) : prev.id_cliente,
        tipo_carga: tipo_carga || prev.tipo_carga,
        origen: origen ? origen.trim() : prev.origen,
        destino: destino ? destino.trim() : prev.destino,
        escala_puntos: escala_puntos !== undefined ? escala_puntos : prev.escala_puntos,
        descripcion_carga: descripcion_carga !== undefined ? descripcion_carga : prev.descripcion_carga,
        monto_flete: monto_flete !== undefined ? Math.max(0, parseFloat(monto_flete) || 0) : prev.monto_flete,
        anticipo_viaticos: anticipo_viaticos !== undefined ? Math.max(0, parseFloat(anticipo_viaticos) || 0) : prev.anticipo_viaticos,
        fecha_salida: fecha_salida ? new Date(fecha_salida) : prev.fecha_salida,
        fecha_estimada_llegada: fecha_estimada_llegada ? new Date(fecha_estimada_llegada) : prev.fecha_estimada_llegada,
        fecha_llegada_real: fecha_llegada_real ? new Date(fecha_llegada_real) : prev.fecha_llegada_real,
        km_inicial: cleanKmIni,
        km_final: cleanKmFin,
        km_real: kmReal,
        galones_combustible: cleanGalones,
        costo_combustible: cleanCostoComb,
        rendimiento_calculado: rendimiento,
        estado: nuevoEstado,
        observaciones: observaciones !== undefined ? observaciones : prev.observaciones,
      },
      include: { vehiculo: true, piloto: true, cliente: true },
    });

    // Sincronización operativa de estados
    if (nuevoEstado === "En Ruta" || nuevoEstado === "En Carga/Descarga") {
      await (prisma.vehiculo as any).update({ where: { id_vehiculo: viaje.id_vehiculo }, data: { estado: "En Ruta" } });
      await (prisma.piloto as any).update({ where: { id_piloto: viaje.id_piloto }, data: { estado: "En Viaje", disponible: false } });
    } else if (nuevoEstado === "Completado" || nuevoEstado === "Liquidado" || nuevoEstado === "Cancelado") {
      await (prisma.vehiculo as any).update({ where: { id_vehiculo: viaje.id_vehiculo }, data: { estado: "Disponible" } });
      await (prisma.piloto as any).update({ where: { id_piloto: viaje.id_piloto }, data: { estado: "Disponible", disponible: true } });

      if (cleanKmFin && cleanKmFin > 0) {
        await (prisma.vehiculo as any).update({
          where: { id_vehiculo: viaje.id_vehiculo },
          data: { kilometraje: cleanKmFin },
        });
      }
    }

    await logAudit(req, "Actualización", viaje.id_viaje, `Viaje actualizado: ${viaje.codigo_viaje}`, { antes: prev, despues: viaje });

    return res.status(200).json(viaje);
  } catch (err: any) {
    console.error("Error updateViaje:", err);
    return res.status(500).json({ error: "Error al actualizar el viaje." });
  }
};

export const updateViajeEstado = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { estado, km_final, fecha_llegada_real } = req.body;

  if (!estado) return res.status(400).json({ error: "El estado es requerido." });

  try {
    const viajeActual = await (prisma.viaje as any).findUnique({ where: { id_viaje: id } });
    if (!viajeActual) return res.status(404).json({ error: "Viaje no encontrado." });

    const updateData: any = { estado };
    if (km_final) {
      updateData.km_final = Number(km_final);
      if (viajeActual.km_inicial) {
        updateData.km_real = Number(km_final) - Number(viajeActual.km_inicial);
      }
    }
    if (fecha_llegada_real) {
      updateData.fecha_llegada_real = new Date(fecha_llegada_real);
    } else if (estado === "Completado" && !viajeActual.fecha_llegada_real) {
      updateData.fecha_llegada_real = new Date();
    }

    const viaje = await (prisma.viaje as any).update({
      where: { id_viaje: id },
      data: updateData,
      include: { vehiculo: true, piloto: true },
    });

    if (estado === "En Ruta" || estado === "En Carga/Descarga") {
      await (prisma.vehiculo as any).update({ where: { id_vehiculo: viaje.id_vehiculo }, data: { estado: "En Ruta" } });
      await (prisma.piloto as any).update({ where: { id_piloto: viaje.id_piloto }, data: { estado: "En Viaje", disponible: false } });
    } else if (estado === "Completado" || estado === "Liquidado" || estado === "Cancelado") {
      await (prisma.vehiculo as any).update({ where: { id_vehiculo: viaje.id_vehiculo }, data: { estado: "Disponible" } });
      await (prisma.piloto as any).update({ where: { id_piloto: viaje.id_piloto }, data: { estado: "Disponible", disponible: true } });

      if (km_final && Number(km_final) > 0) {
        await (prisma.vehiculo as any).update({
          where: { id_vehiculo: viaje.id_vehiculo },
          data: { kilometraje: Number(km_final) },
        });
      }
    }

    await logAudit(req, "Cambio Estado", id, `Viaje ${viaje.codigo_viaje} cambió a estado '${estado}'`);

    return res.status(200).json(viaje);
  } catch (err) {
    console.error("Error updateViajeEstado:", err);
    return res.status(500).json({ error: "Error al actualizar estado del viaje." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GASTOS DE VIAJE Y LIQUIDACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export const registrarGastoViaje = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const idViaje = parseInt(req.params.id);
  const { categoria = "Combustible", concepto, monto, galones, odometro_km, num_comprobante, comprobante, fecha } = req.body;

  if (isNaN(idViaje)) return res.status(400).json({ error: "ID de viaje inválido." });
  if (!concepto?.trim()) return res.status(400).json({ error: "El concepto del gasto es obligatorio." });
  if (!monto || parseFloat(monto) <= 0) return res.status(400).json({ error: "El monto debe ser mayor a 0." });

  try {
    const cleanMonto = Math.max(0, parseFloat(monto) || 0);
    const cleanGalones = galones ? Math.max(0, parseFloat(galones) || 0) : null;
    const cleanKm = odometro_km ? Math.max(0, parseInt(odometro_km, 10) || 0) : null;

    const gasto = await (prisma.gasto as any).create({
      data: {
        id_viaje: idViaje,
        id_usuario: user?.id || 1,
        categoria: categoria || "Combustible",
        concepto: concepto.trim(),
        tipo: "Operativo",
        monto: cleanMonto,
        galones: cleanGalones,
        odometro_km: cleanKm,
        num_comprobante: num_comprobante?.trim() || null,
        comprobante: comprobante || null,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
    });

    // Recalcular costo total y galones acumulados en el viaje
    const todosGastos = await (prisma.gasto as any).findMany({ where: { id_viaje: idViaje } });
    const totalGasto = todosGastos.reduce((acc: number, g: any) => acc + (parseFloat(g.monto) || 0), 0);
    const totalGalones = todosGastos.reduce((acc: number, g: any) => acc + (parseFloat(g.galones) || 0), 0);

    const viajeActual = await (prisma.viaje as any).findUnique({ where: { id_viaje: idViaje } });
    let rendimiento = viajeActual?.rendimiento_calculado;
    if (viajeActual?.km_real && totalGalones > 0) {
      rendimiento = Math.round((Number(viajeActual.km_real) / totalGalones) * 100) / 100;
    }

    await (prisma.viaje as any).update({
      where: { id_viaje: idViaje },
      data: {
        costo_total: totalGasto,
        galones_combustible: totalGalones,
        rendimiento_calculado: rendimiento,
      },
    });

    await logAudit(req, "Gasto Registrado", idViaje, `Gasto de Q${cleanMonto.toFixed(2)} (${categoria}) registrado en viaje #${idViaje}`);

    return res.status(201).json(gasto);
  } catch (err) {
    console.error("Error registrarGastoViaje:", err);
    return res.status(500).json({ error: "Error al registrar gasto de viaje." });
  }
};

export const eliminarGastoViaje = async (req: Request, res: Response) => {
  const idGasto = parseInt(req.params.idGasto);
  if (isNaN(idGasto)) return res.status(400).json({ error: "ID de gasto inválido." });

  try {
    const gasto = await (prisma.gasto as any).findUnique({ where: { id_gasto: idGasto } });
    if (!gasto) return res.status(404).json({ error: "Gasto no encontrado." });

    const idViaje = gasto.id_viaje;
    await (prisma.gasto as any).delete({ where: { id_gasto: idGasto } });

    if (idViaje) {
      const todosGastos = await (prisma.gasto as any).findMany({ where: { id_viaje: idViaje } });
      const totalGasto = todosGastos.reduce((acc: number, g: any) => acc + (parseFloat(g.monto) || 0), 0);
      const totalGalones = todosGastos.reduce((acc: number, g: any) => acc + (parseFloat(g.galones) || 0), 0);

      await (prisma.viaje as any).update({
        where: { id_viaje: idViaje },
        data: {
          costo_total: totalGasto,
          galones_combustible: totalGalones,
        },
      });
    }

    return res.status(200).json({ message: "Gasto eliminado correctamente." });
  } catch (err) {
    console.error("Error eliminarGastoViaje:", err);
    return res.status(500).json({ error: "Error al eliminar gasto." });
  }
};

export const deleteViaje = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de viaje inválido." });

  try {
    const viaje = await (prisma.viaje as any).update({
      where: { id_viaje: id },
      data: { activo: false },
    });

    await logAudit(req, "Eliminación", id, `Viaje desactivado: ${viaje.codigo_viaje}`);

    return res.status(200).json({ message: "Viaje desactivado correctamente.", viaje });
  } catch (err) {
    console.error("Error deleteViaje:", err);
    return res.status(500).json({ error: "Error al desactivar viaje." });
  }
};

export const getViajesKPIs = async (req: Request, res: Response) => {
  try {
    const [
      viajesEnRuta,
      viajesProgramados,
      viajesCompletados,
      fletesAgregados,
      combustibleTotal,
    ] = await Promise.all([
      (prisma.viaje as any).count({ where: { activo: true, estado: { in: ["En Ruta", "En Carga/Descarga"] } } }),
      (prisma.viaje as any).count({ where: { activo: true, estado: "Programado" } }),
      (prisma.viaje as any).count({ where: { activo: true, estado: { in: ["Completado", "Liquidado"] } } }),
      (prisma.viaje as any).aggregate({
        _sum: { monto_flete: true },
        where: { activo: true, estado: { in: ["Completado", "Liquidado", "En Ruta"] } },
      }),
      (prisma.viaje as any).aggregate({
        _sum: { galones_combustible: true, costo_total: true },
        where: { activo: true },
      }),
    ]);

    const totalFletes = fletesAgregados._sum.monto_flete ? parseFloat(fletesAgregados._sum.monto_flete) : 0;
    const totalGalones = combustibleTotal._sum.galones_combustible ? parseFloat(combustibleTotal._sum.galones_combustible) : 0;
    const totalCostos = combustibleTotal._sum.costo_total ? parseFloat(combustibleTotal._sum.costo_total) : 0;

    return res.status(200).json({
      kpis: {
        viajesEnRuta,
        viajesProgramados,
        viajesCompletados,
        totalFletes,
        totalGalones,
        totalCostos,
      },
    });
  } catch (err) {
    console.error("Error getViajesKPIs:", err);
    return res.status(500).json({ error: "Error al calcular KPIs de viajes." });
  }
};
