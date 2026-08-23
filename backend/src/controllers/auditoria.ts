import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middlewares/auth";

/**
 * GET /api/auditoria
 * Retorna la lista paginada y filtrada de logs de auditoría.
 */
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      q,
      modulo,
      accion,
      fecha_desde,
      fecha_hasta,
      id_usuario,
      page = "1",
      limit = "15"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Filtro de búsqueda libre (Usuario, descripción, registro_id)
    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim();
      where.OR = [
        { usuario_nombre: { contains: term, mode: "insensitive" } },
        { usuario_email: { contains: term, mode: "insensitive" } },
        { descripcion: { contains: term, mode: "insensitive" } },
        { registro_id: { contains: term, mode: "insensitive" } },
        { accion: { contains: term, mode: "insensitive" } },
        { modulo: { contains: term, mode: "insensitive" } }
      ];
    }

    if (modulo && modulo !== "Todos") {
      where.modulo = String(modulo);
    }

    if (accion && accion !== "Todos") {
      where.accion = String(accion);
    }

    if (id_usuario) {
      where.id_usuario = Number(id_usuario);
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha_hora = {};
      if (fecha_desde) {
        where.fecha_hora.gte = new Date(`${fecha_desde}T00:00:00.000Z`);
      }
      if (fecha_hasta) {
        where.fecha_hora.lte = new Date(`${fecha_hasta}T23:59:59.999Z`);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditoria.findMany({
        where,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              usuario: true,
              correo: true,
              foto_url: true,
              rol: { select: { nombre: true } }
            }
          }
        },
        orderBy: { fecha_hora: "desc" },
        skip,
        take: limitNum
      }),
      prisma.auditoria.count({ where })
    ]);

    const formattedLogs = logs.map(l => ({
      id_auditoria: l.id_auditoria,
      fecha_hora: l.fecha_hora,
      id_usuario: l.id_usuario,
      usuario_nombre: l.usuario?.nombre || l.usuario_nombre || `Usuario #${l.id_usuario}`,
      usuario_email: l.usuario?.correo || l.usuario_email || "N/A",
      usuario_username: l.usuario?.usuario,
      foto_url: l.usuario?.foto_url,
      rol_usuario: l.usuario?.rol?.nombre || l.rol_usuario || "Usuario",
      accion: l.accion,
      modulo: l.modulo,
      registro_id: l.registro_id,
      descripcion: l.descripcion,
      detalles_cambio: l.detalles_cambio,
      ip_origen: l.ip_origen || "127.0.0.1",
      navegador: l.navegador
    }));

    return res.status(200).json({
      logs: formattedLogs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error: any) {
    console.error("[Auditoría] Error en getAuditLogs:", error);
    return res.status(500).json({ error: "Error al obtener la bitácora de auditoría." });
  }
};

/**
 * GET /api/auditoria/kpis
 * Retorna las métricas y KPIs consolidados de auditoría y seguridad.
 */
export const getAuditKPIs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [
      totalAcciones,
      cambiosCriticosMes,
      exportacionesMes,
      usuariosActivos
    ] = await Promise.all([
      prisma.auditoria.count(),
      prisma.auditoria.count({
        where: {
          fecha_hora: { gte: inicioMes },
          accion: {
            in: [
              "ELIMINAR",
              "ANULAR",
              "AJUSTE",
              "CAMBIO_ESTADO",
              "ELIMINAR_USUARIO",
              "ANULAR_VENTA",
              "CANCELAR_OT"
            ]
          }
        }
      }),
      prisma.auditoria.count({
        where: {
          fecha_hora: { gte: inicioMes },
          accion: {
            in: ["EXPORTAR_REPORTE", "EXPORTACION_REPORTE", "EXPORTAR"]
          }
        }
      }),
      prisma.usuario.count({
        where: { activo: true }
      })
    ]);

    return res.status(200).json({
      totalAcciones,
      cambiosCriticosMes,
      exportacionesMes,
      usuariosActivos
    });
  } catch (error: any) {
    console.error("[Auditoría] Error en getAuditKPIs:", error);
    return res.status(500).json({ error: "Error al obtener los KPIs de auditoría." });
  }
};

/**
 * POST /api/auditoria
 * Registra manualmente un evento en la bitácora
 */
export const createAuditLog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id_usuario;
    const userName = req.user?.nombre || req.user?.usuario || "Usuario";
    const userEmail = req.user?.correo;
    const userRole = req.user?.rol || "Usuario";

    const {
      accion,
      modulo,
      descripcion,
      registro_id,
      detalles_cambio
    } = req.body;

    if (!userId || !accion || !modulo) {
      return res.status(400).json({ error: "Datos incompletos para registrar auditoría." });
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";

    const log = await prisma.auditoria.create({
      data: {
        id_usuario: userId,
        usuario_nombre: userName,
        usuario_email: userEmail,
        rol_usuario: userRole,
        accion: String(accion).toUpperCase(),
        modulo: String(modulo),
        registro_id: registro_id ? String(registro_id) : undefined,
        descripcion: descripcion ? String(descripcion) : undefined,
        detalles_cambio: detalles_cambio ? (typeof detalles_cambio === "string" ? detalles_cambio : JSON.stringify(detalles_cambio)) : undefined,
        ip_origen: typeof ip === "string" ? ip : String(ip),
        navegador: userAgent ? String(userAgent).substring(0, 255) : undefined
      }
    });

    return res.status(201).json({ message: "Evento de auditoría registrado.", log });
  } catch (error: any) {
    console.error("[Auditoría] Error en createAuditLog:", error);
    return res.status(500).json({ error: "Error al registrar evento de auditoría." });
  }
};
