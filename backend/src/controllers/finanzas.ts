
import { Request, Response } from "express";
import prisma from "../config/prisma";

// Helper para registrar eventos en la bitácora de auditoría
const logAudit = async (
  req: Request,
  accion: string,
  registroId: number | string | null,
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
        modulo: "Finanzas",
        accion,
        registro_id: registroId ? String(registroId) : null,
        descripcion,
        detalles_cambio: detallesCambio ? JSON.stringify(detallesCambio) : null,
        ip_origen: req.ip || req.socket.remoteAddress || "127.0.0.1",
        navegador: req.headers["user-agent"] || "Desconocido",
      },
    });
  } catch (err) {
    console.error("[Audit Error Finanzas]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. KPIS FINANCIEROS Y DASHBOARD DE TESORERÍA
// ─────────────────────────────────────────────────────────────────────────────

export const getKPIsFinanzas = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Intentar consulta a función SQL fn_obtener_kpis_finanzas()
    try {
      const dbKpis: any[] = await prisma.$queryRaw`SELECT * FROM fn_obtener_kpis_finanzas()`;
      if (dbKpis && dbKpis.length > 0) {
        return res.json({
          ingresos_mes: Number(dbKpis[0].ingresos_mes || 0),
          gastos_mes: Number(dbKpis[0].gastos_mes || 0),
          utilidad_neta_mes: Number(dbKpis[0].utilidad_neta_mes || 0),
          cuentas_por_cobrar: Number(dbKpis[0].cuentas_por_cobrar || 0),
          cuentas_por_pagar: Number(dbKpis[0].cuentas_por_pagar || 0),
        });
      }
    } catch (sqlErr) {
      console.warn("[Finanzas] Fallback a cálculo por Prisma ORM:", (sqlErr as Error).message);
    }

    // Fallback con Prisma ORM
    const transaccionesMes = await (prisma as any).transaccionFinanzas.findMany({
      where: {
        activo: true,
        fecha: { gte: startOfMonth },
        estado: { not: "Anulado" },
      },
    });

    let ingresos_mes = 0;
    let gastos_mes = 0;

    for (const t of transaccionesMes) {
      if (t.tipo === "Ingreso" && ["Cobrado Total", "Cobrado Parcial", "Pagado"].includes(t.estado)) {
        ingresos_mes += Number(t.monto_pagado || t.monto || 0);
      } else if (t.tipo === "Egreso" && ["Pagado", "Cobrado Total"].includes(t.estado)) {
        gastos_mes += Number(t.monto || 0);
      }
    }

    // Pendientes por cobrar y pagar históricos
    const todasPendientes = await (prisma as any).transaccionFinanzas.findMany({
      where: {
        activo: true,
        estado: { in: ["Pendiente", "Cobrado Parcial", "Vencido"] },
      },
    });

    let cuentas_por_cobrar = 0;
    let cuentas_por_pagar = 0;

    for (const t of todasPendientes) {
      const saldo = Math.max(0, Number(t.monto || 0) - Number(t.monto_pagado || 0));
      if (t.tipo === "Ingreso") {
        cuentas_por_cobrar += saldo;
      } else {
        cuentas_por_pagar += saldo;
      }
    }

    const utilidad_neta_mes = ingresos_mes - gastos_mes;

    return res.json({
      ingresos_mes,
      gastos_mes,
      utilidad_neta_mes,
      cuentas_por_cobrar,
      cuentas_por_pagar,
    });
  } catch (error: any) {
    console.error("[getKPIsFinanzas Error]", error);
    return res.status(500).json({ error: "Error al obtener indicadores financieros." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORRELATIVO AUTOMÁTICO DE FOLIO (DESDE TRX-100)
// ─────────────────────────────────────────────────────────────────────────────

export const getSiguienteFolioTransaccion = async (req: Request, res: Response) => {
  try {
    try {
      const result: any[] = await prisma.$queryRaw`SELECT fn_obtener_siguiente_folio_transaccion() as siguiente_folio`;
      if (result && result.length > 0 && result[0].siguiente_folio) {
        return res.json({ siguiente_folio: result[0].siguiente_folio });
      }
    } catch (sqlErr) {
      // Fallback
    }

    const transacciones = await (prisma as any).transaccionFinanzas.findMany({
      select: { codigo_transaccion: true },
      where: { codigo_transaccion: { startsWith: "TRX-" } },
    });

    let maxNum = 99;
    for (const t of transacciones) {
      if (t.codigo_transaccion) {
        const match = t.codigo_transaccion.match(/TRX-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const siguiente_folio = `TRX-${maxNum + 1}`;
    return res.json({ siguiente_folio });
  } catch (error: any) {
    console.error("[getSiguienteFolioTransaccion Error]", error);
    return res.status(500).json({ error: "Error al generar folio de transacción." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. LISTADO Y DETALLE DE TRANSACCIONES FINANCIERAS
// ─────────────────────────────────────────────────────────────────────────────

export const getTransacciones = async (req: Request, res: Response) => {
  try {
    const {
      q,
      tipo,
      categoria,
      estado,
      fecha_desde,
      fecha_hasta,
      id_vehiculo,
      page = "1",
      limit = "25",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 25));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { activo: true };

    if (tipo && typeof tipo === "string" && tipo !== "Todos") {
      where.tipo = tipo;
    }

    if (categoria && typeof categoria === "string" && categoria !== "Todas") {
      where.categoria = categoria;
    }

    if (estado && typeof estado === "string" && estado !== "Todos") {
      where.estado = estado;
    }

    if (id_vehiculo && typeof id_vehiculo === "string" && id_vehiculo !== "") {
      where.id_vehiculo = parseInt(id_vehiculo, 10);
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha.gte = new Date(fecha_desde as string);
      if (fecha_hasta) where.fecha.lte = new Date(fecha_hasta as string);
    }

    if (q && typeof q === "string" && q.trim() !== "") {
      const term = q.trim();
      where.OR = [
        { codigo_transaccion: { contains: term, mode: "insensitive" } },
        { concepto: { contains: term, mode: "insensitive" } },
        { num_comprobante: { contains: term, mode: "insensitive" } },
        { cliente: { nombre: { contains: term, mode: "insensitive" } } },
        { proveedor: { nombre: { contains: term, mode: "insensitive" } } },
        { vehiculo: { placa: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [total, transacciones] = await Promise.all([
      (prisma as any).transaccionFinanzas.count({ where }),
      (prisma as any).transaccionFinanzas.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { fecha: "desc" },
        include: {
          cliente: { select: { id_cliente: true, nombre: true, nit: true } },
          proveedor: { select: { id_proveedor: true, nombre: true, nit: true } },
          vehiculo: { select: { id_vehiculo: true, placa: true, marca: true, modelo: true } },
          viaje: { select: { id_viaje: true, codigo_viaje: true, origen: true, destino: true } },
          venta: { select: { id_venta: true, folio_factura: true } },
          usuario: { select: { id_usuario: true, nombre: true, usuario: true } },
        },
      }),
    ]);

    return res.json({
      data: transacciones,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("[getTransacciones Error]", error);
    return res.status(500).json({ error: "Error al listar transacciones financieras." });
  }
};

export const getTransaccionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transaccion = await (prisma as any).transaccionFinanzas.findUnique({
      where: { id_transaccion: parseInt(id, 10) },
      include: {
        cliente: true,
        proveedor: true,
        vehiculo: true,
        viaje: true,
        venta: true,
        usuario: { select: { id_usuario: true, nombre: true, usuario: true } },
      },
    });

    if (!transaccion || !transaccion.activo) {
      return res.status(404).json({ error: "Transacción no encontrada." });
    }

    return res.json(transaccion);
  } catch (error: any) {
    console.error("[getTransaccionById Error]", error);
    return res.status(500).json({ error: "Error al obtener transacción." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. CREAR, ACTUALIZAR Y ANULAR TRANSACCIONES
// ─────────────────────────────────────────────────────────────────────────────

export const createTransaccion = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      codigo_transaccion,
      tipo,
      categoria,
      concepto,
      monto,
      monto_pagado,
      estado,
      fecha,
      fecha_vencimiento,
      metodo_pago,
      num_comprobante,
      id_cliente,
      id_proveedor,
      id_vehiculo,
      id_viaje,
      id_venta,
      id_compra,
      observaciones,
    } = req.body;

    if (!tipo || !categoria || !concepto) {
      return res.status(400).json({ error: "Tipo, categoría y concepto son requeridos." });
    }

    const numMonto = Math.max(0, parseFloat(monto) || 0);
    const numMontoPagado = Math.max(0, parseFloat(monto_pagado) || 0);

    if (numMonto <= 0) {
      return res.status(400).json({ error: "El monto debe ser un valor numérico positivo mayor a 0." });
    }

    // Determinar Folio si no viene
    let folioFinal = codigo_transaccion;
    if (!folioFinal || folioFinal.trim() === "") {
      try {
        const result: any[] = await prisma.$queryRaw`SELECT fn_obtener_siguiente_folio_transaccion() as siguiente_folio`;
        if (result && result.length > 0 && result[0].siguiente_folio) {
          folioFinal = result[0].siguiente_folio;
        }
      } catch (e) {
        folioFinal = `TRX-${Date.now().toString().slice(-4)}`;
      }
    }

    // Auto-determinar estado según pagos
    let estadoCalculado = estado || "Pendiente";
    if (tipo === "Ingreso") {
      if (numMontoPagado >= numMonto && numMonto > 0) {
        estadoCalculado = "Cobrado Total";
      } else if (numMontoPagado > 0 && numMontoPagado < numMonto) {
        estadoCalculado = "Cobrado Parcial";
      }
    } else if (tipo === "Egreso") {
      if (numMontoPagado >= numMonto && numMonto > 0) {
        estadoCalculado = "Pagado";
      }
    }

    const nuevaTransaccion = await (prisma as any).transaccionFinanzas.create({
      data: {
        codigo_transaccion: folioFinal,
        tipo,
        categoria,
        concepto: concepto.trim(),
        monto: numMonto,
        monto_pagado: numMontoPagado,
        estado: estadoCalculado,
        fecha: fecha ? new Date(fecha) : new Date(),
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
        fecha_pago: numMontoPagado > 0 ? new Date() : null,
        metodo_pago: metodo_pago || null,
        num_comprobante: num_comprobante?.trim() || null,
        id_cliente: id_cliente ? parseInt(id_cliente, 10) : null,
        id_proveedor: id_proveedor ? parseInt(id_proveedor, 10) : null,
        id_vehiculo: id_vehiculo ? parseInt(id_vehiculo, 10) : null,
        id_viaje: id_viaje ? parseInt(id_viaje, 10) : null,
        id_venta: id_venta ? parseInt(id_venta, 10) : null,
        id_compra: id_compra ? parseInt(id_compra, 10) : null,
        id_usuario: user?.id || 1,
        observaciones: observaciones?.trim() || null,
      },
    });

    await logAudit(
      req,
      "Crear Transacción",
      nuevaTransaccion.id_transaccion,
      `Creación de transacción ${folioFinal} (${tipo} - ${categoria}) por valor de Q${numMonto}`,
      nuevaTransaccion
    );

    return res.status(201).json(nuevaTransaccion);
  } catch (error: any) {
    console.error("[createTransaccion Error]", error);
    return res.status(500).json({ error: "Error al registrar la transacción financiera." });
  }
};

export const updateTransaccion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tipo,
      categoria,
      concepto,
      monto,
      monto_pagado,
      estado,
      fecha,
      fecha_vencimiento,
      metodo_pago,
      num_comprobante,
      id_cliente,
      id_proveedor,
      id_vehiculo,
      id_viaje,
      observaciones,
    } = req.body;

    const numMonto = Math.max(0, parseFloat(monto) || 0);
    const numMontoPagado = Math.max(0, parseFloat(monto_pagado) || 0);

    const transaccionActual = await (prisma as any).transaccionFinanzas.findUnique({
      where: { id_transaccion: parseInt(id, 10) },
    });

    if (!transaccionActual || !transaccionActual.activo) {
      return res.status(404).json({ error: "Transacción no encontrada." });
    }

    const updated = await (prisma as any).transaccionFinanzas.update({
      where: { id_transaccion: parseInt(id, 10) },
      data: {
        tipo: tipo ?? transaccionActual.tipo,
        categoria: categoria ?? transaccionActual.categoria,
        concepto: concepto ? concepto.trim() : transaccionActual.concepto,
        monto: monto !== undefined ? numMonto : transaccionActual.monto,
        monto_pagado: monto_pagado !== undefined ? numMontoPagado : transaccionActual.monto_pagado,
        estado: estado ?? transaccionActual.estado,
        fecha: fecha ? new Date(fecha) : transaccionActual.fecha,
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : transaccionActual.fecha_vencimiento,
        metodo_pago: metodo_pago ?? transaccionActual.metodo_pago,
        num_comprobante: num_comprobante !== undefined ? num_comprobante?.trim() : transaccionActual.num_comprobante,
        id_cliente: id_cliente !== undefined ? (id_cliente ? parseInt(id_cliente, 10) : null) : transaccionActual.id_cliente,
        id_proveedor: id_proveedor !== undefined ? (id_proveedor ? parseInt(id_proveedor, 10) : null) : transaccionActual.id_proveedor,
        id_vehiculo: id_vehiculo !== undefined ? (id_vehiculo ? parseInt(id_vehiculo, 10) : null) : transaccionActual.id_vehiculo,
        id_viaje: id_viaje !== undefined ? (id_viaje ? parseInt(id_viaje, 10) : null) : transaccionActual.id_viaje,
        observaciones: observaciones !== undefined ? observaciones?.trim() : transaccionActual.observaciones,
        updated_at: new Date(),
      },
    });

    await logAudit(
      req,
      "Editar Transacción",
      id,
      `Actualización de transacción ${updated.codigo_transaccion}`,
      { anterior: transaccionActual, nuevo: updated }
    );

    return res.json(updated);
  } catch (error: any) {
    console.error("[updateTransaccion Error]", error);
    return res.status(500).json({ error: "Error al actualizar la transacción financiera." });
  }
};

export const registrarPagoCobro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { monto_abono, metodo_pago, num_comprobante, observaciones } = req.body;

    const abonoNum = Math.max(0, parseFloat(monto_abono) || 0);
    if (abonoNum <= 0) {
      return res.status(400).json({ error: "El monto del abono debe ser mayor a 0." });
    }

    const transaccion = await (prisma as any).transaccionFinanzas.findUnique({
      where: { id_transaccion: parseInt(id, 10) },
    });

    if (!transaccion || !transaccion.activo) {
      return res.status(404).json({ error: "Transacción no encontrada." });
    }

    const montoTotal = Number(transaccion.monto || 0);
    const pagadoAnterior = Number(transaccion.monto_pagado || 0);
    const nuevoTotalPagado = Math.min(montoTotal, pagadoAnterior + abonoNum);

    let nuevoEstado = transaccion.estado;
    if (transaccion.tipo === "Ingreso") {
      nuevoEstado = nuevoTotalPagado >= montoTotal ? "Cobrado Total" : "Cobrado Parcial";
    } else {
      nuevoEstado = nuevoTotalPagado >= montoTotal ? "Pagado" : "Pendiente";
    }

    const updated = await (prisma as any).transaccionFinanzas.update({
      where: { id_transaccion: parseInt(id, 10) },
      data: {
        monto_pagado: nuevoTotalPagado,
        estado: nuevoEstado,
        fecha_pago: new Date(),
        metodo_pago: metodo_pago || transaccion.metodo_pago,
        num_comprobante: num_comprobante?.trim() || transaccion.num_comprobante,
        observaciones: observaciones
          ? `${transaccion.observaciones ? transaccion.observaciones + " | " : ""}Abono Q${abonoNum}: ${observaciones}`
          : transaccion.observaciones,
        updated_at: new Date(),
      },
    });

    await logAudit(
      req,
      "Registrar Cobro/Pago",
      id,
      `Abono de Q${abonoNum} registrado en transacción ${transaccion.codigo_transaccion}. Nuevo saldo pagado: Q${nuevoTotalPagado}`,
      { abono: abonoNum, transaccion: updated }
    );

    return res.json(updated);
  } catch (error: any) {
    console.error("[registrarPagoCobro Error]", error);
    return res.status(500).json({ error: "Error al registrar el cobro/pago." });
  }
};

export const anularTransaccion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transaccion = await (prisma as any).transaccionFinanzas.findUnique({
      where: { id_transaccion: parseInt(id, 10) },
    });

    if (!transaccion) {
      return res.status(404).json({ error: "Transacción no encontrada." });
    }

    const updated = await (prisma as any).transaccionFinanzas.update({
      where: { id_transaccion: parseInt(id, 10) },
      data: {
        estado: "Anulado",
        activo: false,
        updated_at: new Date(),
      },
    });

    await logAudit(
      req,
      "Anular Transacción",
      id,
      `Anulación de transacción financiera ${transaccion.codigo_transaccion}`,
      { anulado: true }
    );

    return res.json({ message: "Transacción anulada correctamente.", transaccion: updated });
  } catch (error: any) {
    console.error("[anularTransaccion Error]", error);
    return res.status(500).json({ error: "Error al anular la transacción." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. RENTABILIDAD POR VEHÍCULO (INGRESOS VS COSTOS ACUMULADOS)
// ─────────────────────────────────────────────────────────────────────────────

export const getRentabilidadPorVehiculo = async (req: Request, res: Response) => {
  try {
    // 1. Intentar vista SQL
    try {
      const rows: any[] = await prisma.$queryRaw`SELECT * FROM v_rentabilidad_por_vehiculo ORDER BY margen_neto DESC`;
      if (rows && rows.length > 0) {
        const formatted = rows.map((r) => {
          const ing = Number(r.total_ingresos_fletes || 0);
          const comb = Number(r.costo_combustible || 0);
          const mec = Number(r.costo_mecanica || 0);
          const viat = Number(r.costo_viaticos_ruta || 0);
          const costTot = comb + mec + viat;
          const margenNeto = ing - costTot;
          const margenPct = ing > 0 ? (margenNeto / ing) * 100 : 0;

          return {
            id_vehiculo: r.id_vehiculo,
            placa: r.placa,
            marca: r.marca,
            modelo: r.modelo,
            tipo: r.tipo,
            estado: r.estado,
            total_ingresos: ing,
            costo_combustible: comb,
            costo_mecanica: mec,
            costo_viaticos_ruta: viat,
            costo_total: costTot,
            margen_neto: margenNeto,
            margen_porcentaje: Math.round(margenPct * 100) / 100,
          };
        });
        return res.json(formatted);
      }
    } catch (sqlErr) {
      console.warn("[Finanzas] Fallback a cálculo de rentabilidad por Prisma ORM:", (sqlErr as Error).message);
    }

    // 2. Fallback ORM con agregaciones
    const vehiculos = await (prisma as any).vehiculo.findMany({
      where: { activo: true },
      include: {
        viajes: {
          where: { activo: true, estado: { in: ["Completado", "Liquidado"] } },
          include: { gastos: true },
        },
        ordenes_servicio: {
          where: { activo: true, estado: "Completado" },
        },
      },
    });

    const rentabilidad = vehiculos.map((v: any) => {
      let total_ingresos = 0;
      let costo_combustible = 0;
      let costo_viaticos_ruta = 0;

      for (const viaje of v.viajes || []) {
        total_ingresos += Number(viaje.monto_flete || 0);
        for (const g of viaje.gastos || []) {
          const montoGasto = Number(g.monto || 0);
          if (g.categoria === "Combustible") {
            costo_combustible += montoGasto;
          } else {
            costo_viaticos_ruta += montoGasto;
          }
        }
      }

      let costo_mecanica = 0;
      for (const os of v.ordenes_servicio || []) {
        costo_mecanica += Number(os.costo_total || 0);
      }

      const costo_total = costo_combustible + costo_mecanica + costo_viaticos_ruta;
      const margen_neto = total_ingresos - costo_total;
      const margen_porcentaje = total_ingresos > 0 ? (margen_neto / total_ingresos) * 100 : 0;

      return {
        id_vehiculo: v.id_vehiculo,
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        tipo: v.tipo,
        estado: v.estado,
        total_ingresos,
        costo_combustible,
        costo_mecanica,
        costo_viaticos_ruta,
        costo_total,
        margen_neto,
        margen_porcentaje: Math.round(margen_porcentaje * 100) / 100,
      };
    });

    // Ordenar de mayor a menor margen neto
    rentabilidad.sort((a: any, b: any) => b.margen_neto - a.margen_neto);

    return res.json(rentabilidad);
  } catch (error: any) {
    console.error("[getRentabilidadPorVehiculo Error]", error);
    return res.status(500).json({ error: "Error al calcular rentabilidad por unidad." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. CUENTAS POR COBRAR (FACTURAS Y FLETES PENDIENTES)
// ─────────────────────────────────────────────────────────────────────────────

export const getCuentasPorCobrar = async (req: Request, res: Response) => {
  try {
    const cuentas = await (prisma as any).transaccionFinanzas.findMany({
      where: {
        activo: true,
        tipo: "Ingreso",
        estado: { in: ["Pendiente", "Cobrado Parcial", "Vencido"] },
      },
      include: {
        cliente: { select: { id_cliente: true, nombre: true, nit: true, telefono: true } },
        viaje: { select: { id_viaje: true, codigo_viaje: true, origen: true, destino: true } },
        venta: { select: { id_venta: true, folio_factura: true } },
      },
      orderBy: { fecha_vencimiento: "asc" },
    });

    const now = new Date();

    const formatted = cuentas.map((c: any) => {
      const total = Number(c.monto || 0);
      const pagado = Number(c.monto_pagado || 0);
      const saldoPendiente = Math.max(0, total - pagado);

      let estadoVencimiento = "Al Día";
      let diasVencido = 0;

      if (c.fecha_vencimiento) {
        const venc = new Date(c.fecha_vencimiento);
        const diffDays = Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          estadoVencimiento = "Vencida";
          diasVencido = Math.abs(diffDays);
        } else if (diffDays <= 5) {
          estadoVencimiento = "Por Vencer";
        }
      }

      return {
        id_transaccion: c.id_transaccion,
        codigo_transaccion: c.codigo_transaccion,
        concepto: c.concepto,
        categoria: c.categoria,
        monto_total: total,
        monto_pagado: pagado,
        saldo_pendiente: saldoPendiente,
        fecha_emision: c.fecha,
        fecha_vencimiento: c.fecha_vencimiento,
        estado: c.estado,
        estado_vencimiento: estadoVencimiento,
        dias_vencido: diasVencido,
        cliente: c.cliente,
        num_comprobante: c.num_comprobante,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    console.error("[getCuentasPorCobrar Error]", error);
    return res.status(500).json({ error: "Error al listar cuentas por cobrar." });
  }
};
