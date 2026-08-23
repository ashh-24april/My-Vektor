import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middlewares/auth";

/**
 * GET /api/notificaciones
 * Retorna las notificaciones y alertas en tiempo real contextualizadas al rol del usuario.
 */
export const getNotificaciones = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id_usuario;
    const userRole = req.user?.rol?.toLowerCase() || "";

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    // 1. Obtener notificaciones guardadas en la base de datos para este usuario
    const dbNotifs = await prisma.notificacion.findMany({
      where: { id_usuario: userId },
      orderBy: { fecha: "desc" },
      take: 20
    });

    // 2. Alertas dinámicas del sistema basadas en reglas de negocio y permisos
    const dynamicAlerts: Array<{
      id_notificacion: string;
      tipo: "inventario" | "ventas" | "mecanica" | "auditoria" | "sistema";
      titulo: string;
      mensaje: string;
      fecha: Date;
      leida: boolean;
      link?: string;
      prioridad?: "alta" | "media" | "normal";
    }> = [];

    // A. Alertas de Inventario (Bajo stock)
    const repuestosBajoStock = await prisma.producto.findMany({
      where: {
        activo: true,
        stock: { lte: prisma.producto.fields.stock_minimo }
      },
      select: {
        id_producto: true,
        descripcion: true,
        codigo: true,
        stock: true,
        stock_minimo: true
      },
      take: 5
    });

    for (const r of repuestosBajoStock) {
      dynamicAlerts.push({
        id_notificacion: `stock-${r.id_producto}`,
        tipo: "inventario",
        titulo: "Stock Mínimo Alcanzado",
        mensaje: `El repuesto "${r.descripcion}" (${r.codigo}) cuenta con solo ${r.stock} unidades (Mínimo: ${r.stock_minimo}).`,
        fecha: new Date(),
        leida: false,
        link: "/inventario",
        prioridad: r.stock === 0 ? "alta" : "media"
      });
    }

    // B. Alertas de Ventas (Facturas pendientes de cobro)
    if (userRole === "superadmin" || userRole === "gerente" || userRole.includes("admin")) {
      const facturasPendientes = await prisma.venta.findMany({
        where: {
          activo: true,
          estado_pago: "Pendiente"
        },
        include: {
          cliente: { select: { nombre: true } }
        },
        orderBy: { fecha_emision: "desc" },
        take: 3
      });

      for (const f of facturasPendientes) {
        dynamicAlerts.push({
          id_notificacion: `fac-${f.id_venta}`,
          tipo: "ventas",
          titulo: "Factura Pendiente de Cobro",
          mensaje: `Factura ${f.folio_factura || `#${f.id_venta}`} por Q${Number(f.total).toFixed(2)} (${f.cliente?.nombre || "Cliente General"}) pendiente.`,
          fecha: f.fecha_emision,
          leida: false,
          link: "/ventas",
          prioridad: "normal"
        });
      }
    }

    // C. Alertas de Mecánica (Órdenes en proceso o pendientes)
    const otsActivas = await prisma.ordenServicio.findMany({
      where: {
        activo: true,
        estado: { in: ["Pendiente", "En Proceso"] }
      },
      include: {
        vehiculo: { select: { placa: true } },
        mecanico: { select: { nombre: true, apellido: true } }
      },
      orderBy: { fecha_ingreso: "desc" },
      take: 3
    });

    for (const ot of otsActivas) {
      dynamicAlerts.push({
        id_notificacion: `ot-${ot.id_orden}`,
        tipo: "mecanica",
        titulo: `Orden de Trabajo ${ot.estado}`,
        mensaje: `OT ${ot.numero_ot || `#${ot.id_orden}`} para unidad ${ot.vehiculo?.placa || "N/A"} a cargo de ${ot.mecanico?.nombre || "Taller"}.`,
        fecha: ot.fecha_ingreso,
        leida: false,
        link: "/mecanica",
        prioridad: "normal"
      });
    }

    // D. Unificar notificaciones de DB y dinámicas
    const formattedDbNotifs = dbNotifs.map(n => ({
      id_notificacion: `db-${n.id_notificacion}`,
      tipo: (n.tipo || "sistema") as any,
      titulo: n.referencia_tipo ? `Alerta de ${n.referencia_tipo}` : "Notificación del Sistema",
      mensaje: n.mensaje,
      fecha: n.fecha,
      leida: n.leida,
      link: n.referencia_tipo === "Inventario" ? "/inventario" : n.referencia_tipo === "Ventas" ? "/ventas" : n.referencia_tipo === "Mecanica" ? "/mecanica" : undefined,
      prioridad: "normal" as const
    }));

    const todas = [...formattedDbNotifs, ...dynamicAlerts].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    const unreadCount = todas.filter(n => !n.leida).length;

    return res.status(200).json({
      notificaciones: todas,
      unreadCount
    });
  } catch (error: any) {
    console.error("[Notificaciones] Error en getNotificaciones:", error);
    return res.status(500).json({ error: "Error al obtener notificaciones." });
  }
};

/**
 * PATCH /api/notificaciones/:id/leida
 * Marca una notificación como leída
 */
export const marcarNotificacionLeida = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id_usuario;

    if (id.startsWith("db-")) {
      const dbId = parseInt(id.replace("db-", ""), 10);
      if (!isNaN(dbId)) {
        await prisma.notificacion.updateMany({
          where: { id_notificacion: dbId, id_usuario: userId },
          data: { leida: true }
        });
      }
    }

    return res.status(200).json({ message: "Notificación marcada como leída." });
  } catch (error: any) {
    console.error("[Notificaciones] Error en marcarNotificacionLeida:", error);
    return res.status(500).json({ error: "Error al actualizar estado de la notificación." });
  }
};

/**
 * POST /api/notificaciones/marcar-todas-leidas
 * Marca todas las notificaciones del usuario como leídas
 */
export const marcarTodasLeidas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id_usuario;

    if (userId) {
      await prisma.notificacion.updateMany({
        where: { id_usuario: userId, leida: false },
        data: { leida: true }
      });
    }

    return res.status(200).json({ message: "Todas las notificaciones han sido marcadas como leídas." });
  } catch (error: any) {
    console.error("[Notificaciones] Error en marcarTodasLeidas:", error);
    return res.status(500).json({ error: "Error al marcar notificaciones como leídas." });
  }
};

/**
 * POST /api/notificaciones/auditoria-exportacion
 * Registra en el log de auditoría y notifica la exportación de un reporte
 */
export const registrarAuditoriaExportacion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id_usuario;
    const userName = req.user?.nombre || req.user?.usuario || "Usuario";
    const { modulo, formato = "XLSX", totalRegistros = 0 } = req.body;

    if (!userId || !modulo) {
      return res.status(400).json({ error: "Parámetros requeridos incompletos." });
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const descripcion = `Exportación de reporte de ${modulo} en formato .${String(formato).toUpperCase()} (${totalRegistros} registros).`;

    // 1. Guardar en tabla auditoria
    await prisma.auditoria.create({
      data: {
        id_usuario: userId,
        accion: "EXPORTAR_REPORTE",
        modulo: String(modulo),
        descripcion,
        ip_origen: typeof ip === "string" ? ip : String(ip)
      }
    });

    // 2. Crear notificación para administradores
    const admins = await prisma.usuario.findMany({
      where: {
        activo: true,
        rol: { nombre: { in: ["Superadministrador", "superadmin", "Gerente", "gerente"] } }
      },
      select: { id_usuario: true }
    });

    for (const adm of admins) {
      if (adm.id_usuario !== userId) {
        await prisma.notificacion.create({
          data: {
            id_usuario: adm.id_usuario,
            tipo: "auditoria",
            referencia_tipo: String(modulo),
            mensaje: `El usuario ${userName} exportó el reporte de ${modulo} (.${String(formato).toUpperCase()}).`
          }
        });
      }
    }

    return res.status(201).json({ message: "Auditoría de exportación registrada exitosamente." });
  } catch (error: any) {
    console.error("[Notificaciones] Error en registrarAuditoriaExportacion:", error);
    return res.status(500).json({ error: "Error al registrar la auditoría de exportación." });
  }
};
