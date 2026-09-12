
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
        modulo: "Operaciones",
        accion,
        registro_id: registroId,
        descripcion,
        detalles_cambio: detallesCambio ? JSON.stringify(detallesCambio) : null,
        ip_origen: req.ip || req.socket.remoteAddress || "127.0.0.1",
        navegador: req.headers["user-agent"] || "Desconocido",
      },
    });
  } catch (err) {
    console.error("[Audit Error]", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE VEHÍCULOS (FLOTA)
// ─────────────────────────────────────────────────────────────────────────────

export const getVehiculos = async (req: Request, res: Response) => {
  try {
    const { q, estado, tipo, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { activo: true };

    if (estado && estado !== "todos") {
      where.estado = estado as string;
    }

    if (tipo && tipo !== "todos") {
      where.tipo = tipo as string;
    }

    if (q) {
      const search = (q as string).trim();
      where.OR = [
        { placa: { contains: search, mode: "insensitive" } },
        { marca: { contains: search, mode: "insensitive" } },
        { modelo: { contains: search, mode: "insensitive" } },
        { num_chasis: { contains: search, mode: "insensitive" } },
      ];
    }

    const [vehiculos, total] = await Promise.all([
      (prisma.vehiculo as any).findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { placa: "asc" },
        include: {
          piloto_asignado: {
            select: {
              id_piloto: true,
              nombre: true,
              apellido: true,
              telefono: true,
              num_licencia: true,
              tipo_licencia: true,
              venc_licencia: true,
              estado: true,
            },
          },
          documentos: true,
          _count: {
            select: { viajes: true, ordenes_servicio: true },
          },
        },
      }),
      prisma.vehiculo.count({ where }),
    ]);

    return res.status(200).json({ vehiculos, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Error getVehiculos:", err);
    return res.status(500).json({ error: "Error al obtener vehículos." });
  }
};

export const getVehiculoById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de vehículo inválido." });

  try {
    const vehiculo = await (prisma.vehiculo as any).findUnique({
      where: { id_vehiculo: id },
      include: {
        piloto_asignado: true,
        documentos: { orderBy: { fecha_vencimiento: "asc" } },
        ordenes_servicio: {
          take: 5,
          orderBy: { fecha_ingreso: "desc" },
        },
        viajes: {
          take: 5,
          orderBy: { fecha_salida: "desc" },
        },
      },
    });

    if (!vehiculo) return res.status(404).json({ error: "Vehículo no encontrado." });
    return res.status(200).json(vehiculo);
  } catch (err) {
    console.error("Error getVehiculoById:", err);
    return res.status(500).json({ error: "Error al obtener vehículo." });
  }
};

export const createVehiculo = async (req: Request, res: Response) => {
  const {
    placa,
    marca,
    modelo,
    anio,
    tipo,
    color,
    num_motor,
    num_chasis,
    capacidad_carga,
    kilometraje,
    horometro,
    rendimiento_km_l,
    estado = "Disponible",
    venc_circulacion,
    venc_seguro,
    venc_revision,
    id_piloto_asignado,
    foto_url,
  } = req.body;

  if (!placa?.trim()) return res.status(400).json({ error: "La placa es obligatoria." });
  if (!marca?.trim()) return res.status(400).json({ error: "La marca es obligatoria." });
  if (!modelo?.trim()) return res.status(400).json({ error: "El modelo es obligatorio." });
  if (!anio) return res.status(400).json({ error: "El año es obligatorio." });

  const cleanPlaca = placa.trim().toUpperCase();
  const cleanAnio = Math.max(1980, Math.min(2050, parseInt(anio, 10) || new Date().getFullYear()));
  const cleanKm = Math.max(0, parseInt(kilometraje, 10) || 0);
  const cleanHorometro = Math.max(0, parseInt(horometro, 10) || 0);

  try {
    const existing = await prisma.vehiculo.findUnique({ where: { placa: cleanPlaca } });
    if (existing) return res.status(409).json({ error: `La placa '${cleanPlaca}' ya está registrada.` });

    const vehiculo = await (prisma.vehiculo as any).create({
      data: {
        placa: cleanPlaca,
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: cleanAnio,
        tipo: tipo?.trim() || "Cabezal",
        color: color?.trim() || null,
        num_motor: num_motor?.trim() || null,
        num_chasis: num_chasis?.trim() || null,
        capacidad_carga: capacidad_carga ? parseFloat(capacidad_carga) : null,
        kilometraje: cleanKm,
        horometro: cleanHorometro,
        rendimiento_km_l: rendimiento_km_l ? parseFloat(rendimiento_km_l) : null,
        estado: estado || "Disponible",
        venc_circulacion: venc_circulacion ? new Date(venc_circulacion) : null,
        venc_seguro: venc_seguro ? new Date(venc_seguro) : null,
        venc_revision: venc_revision ? new Date(venc_revision) : null,
        id_piloto_asignado: id_piloto_asignado ? parseInt(id_piloto_asignado, 10) : null,
        foto_url: foto_url || null,
      },
      include: { piloto_asignado: true },
    });

    await logAudit(req, "Creación", vehiculo.id_vehiculo, `Unidad vehicular creada: ${cleanPlaca} (${marca} ${modelo})`, vehiculo);

    return res.status(201).json(vehiculo);
  } catch (err: any) {
    console.error("Error createVehiculo:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "Placa duplicada." });
    return res.status(500).json({ error: "Error al crear vehículo." });
  }
};

export const updateVehiculo = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de vehículo inválido." });

  const {
    placa,
    marca,
    modelo,
    anio,
    tipo,
    color,
    num_motor,
    num_chasis,
    capacidad_carga,
    kilometraje,
    horometro,
    rendimiento_km_l,
    estado,
    venc_circulacion,
    venc_seguro,
    venc_revision,
    id_piloto_asignado,
    foto_url,
  } = req.body;

  try {
    const prev = await (prisma.vehiculo as any).findUnique({ where: { id_vehiculo: id } });
    if (!prev) return res.status(404).json({ error: "Vehículo no encontrado." });

    const cleanPlaca = placa ? placa.trim().toUpperCase() : prev.placa;
    const cleanAnio = anio ? Math.max(1980, Math.min(2050, parseInt(anio, 10) || prev.anio)) : prev.anio;
    const cleanKm = kilometraje !== undefined ? Math.max(0, parseInt(kilometraje, 10) || 0) : prev.kilometraje;
    const cleanHorometro = horometro !== undefined ? Math.max(0, parseInt(horometro, 10) || 0) : (prev.horometro || 0);

    const vehiculo = await (prisma.vehiculo as any).update({
      where: { id_vehiculo: id },
      data: {
        placa: cleanPlaca,
        marca: marca ? marca.trim() : prev.marca,
        modelo: modelo ? modelo.trim() : prev.modelo,
        anio: cleanAnio,
        tipo: tipo ? tipo.trim() : prev.tipo,
        color: color !== undefined ? (color ? color.trim() : null) : prev.color,
        num_motor: num_motor !== undefined ? (num_motor ? num_motor.trim() : null) : prev.num_motor,
        num_chasis: num_chasis !== undefined ? (num_chasis ? num_chasis.trim() : null) : prev.num_chasis,
        capacidad_carga: capacidad_carga !== undefined ? (capacidad_carga ? parseFloat(capacidad_carga) : null) : prev.capacidad_carga,
        kilometraje: cleanKm,
        horometro: cleanHorometro,
        rendimiento_km_l: rendimiento_km_l !== undefined ? (rendimiento_km_l ? parseFloat(rendimiento_km_l) : null) : prev.rendimiento_km_l,
        estado: estado || prev.estado,
        venc_circulacion: venc_circulacion !== undefined ? (venc_circulacion ? new Date(venc_circulacion) : null) : prev.venc_circulacion,
        venc_seguro: venc_seguro !== undefined ? (venc_seguro ? new Date(venc_seguro) : null) : prev.venc_seguro,
        venc_revision: venc_revision !== undefined ? (venc_revision ? new Date(venc_revision) : null) : prev.venc_revision,
        id_piloto_asignado: id_piloto_asignado !== undefined ? (id_piloto_asignado ? parseInt(id_piloto_asignado, 10) : null) : prev.id_piloto_asignado,
        foto_url: foto_url !== undefined ? foto_url : prev.foto_url,
      },
      include: { piloto_asignado: true },
    });

    await logAudit(req, "Actualización", vehiculo.id_vehiculo, `Unidad vehicular actualizada: ${cleanPlaca}`, { antes: prev, despues: vehiculo });

    return res.status(200).json(vehiculo);
  } catch (err: any) {
    console.error("Error updateVehiculo:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "Placa duplicada con otro vehículo." });
    return res.status(500).json({ error: "Error al actualizar vehículo." });
  }
};

export const deleteVehiculo = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de vehículo inválido." });

  try {
    const vehiculo = await prisma.vehiculo.update({
      where: { id_vehiculo: id },
      data: { activo: false },
    });

    await logAudit(req, "Eliminación", id, `Unidad vehicular desactivada: ${vehiculo.placa}`);

    return res.status(200).json({ message: "Vehículo desactivado correctamente.", vehiculo });
  } catch (err) {
    console.error("Error deleteVehiculo:", err);
    return res.status(500).json({ error: "Error al desactivar vehículo." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE PILOTOS
// ─────────────────────────────────────────────────────────────────────────────

export const getPilotos = async (req: Request, res: Response) => {
  try {
    const { q, estado, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { activo: true };

    if (estado && estado !== "todos") {
      where.estado = estado as string;
    }

    if (q) {
      const search = (q as string).trim();
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { apellido: { contains: search, mode: "insensitive" } },
        { dpi: { contains: search, mode: "insensitive" } },
        { num_licencia: { contains: search, mode: "insensitive" } },
        { telefono: { contains: search, mode: "insensitive" } },
      ];
    }

    const [pilotos, total] = await Promise.all([
      (prisma.piloto as any).findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { nombre: "asc" },
        include: {
          vehiculos_asignados: {
            where: { activo: true },
            select: { id_vehiculo: true, placa: true, marca: true, modelo: true, estado: true },
          },
          _count: { select: { viajes: true } },
        },
      }),
      prisma.piloto.count({ where }),
    ]);

    return res.status(200).json({ pilotos, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Error getPilotos:", err);
    return res.status(500).json({ error: "Error al obtener pilotos." });
  }
};

export const getPilotoById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de piloto inválido." });

  try {
    const piloto = await (prisma.piloto as any).findUnique({
      where: { id_piloto: id },
      include: {
        vehiculos_asignados: true,
        viajes: {
          take: 5,
          orderBy: { fecha_salida: "desc" },
        },
      },
    });

    if (!piloto) return res.status(404).json({ error: "Piloto no encontrado." });
    return res.status(200).json(piloto);
  } catch (err) {
    console.error("Error getPilotoById:", err);
    return res.status(500).json({ error: "Error al obtener piloto." });
  }
};

export const createPiloto = async (req: Request, res: Response) => {
  const {
    nombre,
    apellido,
    dpi,
    telefono,
    correo,
    num_licencia,
    tipo_licencia,
    venc_licencia,
    estado = "Disponible",
    foto_url,
    foto_dpi_url,
    foto_lic_url,
  } = req.body;

  if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
  if (!apellido?.trim()) return res.status(400).json({ error: "El apellido es obligatorio." });
  if (!dpi?.trim()) return res.status(400).json({ error: "El DPI es obligatorio." });
  if (!num_licencia?.trim()) return res.status(400).json({ error: "El número de licencia es obligatorio." });
  if (!venc_licencia) return res.status(400).json({ error: "La fecha de vencimiento de licencia es obligatoria." });

  const cleanDpi = dpi.trim();
  const cleanLicencia = num_licencia.trim().toUpperCase();

  try {
    const existingDpi = await prisma.piloto.findUnique({ where: { dpi: cleanDpi } });
    if (existingDpi) return res.status(409).json({ error: "Ya existe un piloto con este DPI." });

    const existingLic = await prisma.piloto.findUnique({ where: { num_licencia: cleanLicencia } });
    if (existingLic) return res.status(409).json({ error: "Ya existe un piloto con este número de licencia." });

    const piloto = await (prisma.piloto as any).create({
      data: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dpi: cleanDpi,
        telefono: telefono?.trim() || null,
        correo: correo?.trim() || null,
        num_licencia: cleanLicencia,
        tipo_licencia: tipo_licencia?.trim() || "Tipo A",
        venc_licencia: new Date(venc_licencia),
        estado: estado || "Disponible",
        disponible: estado === "Disponible",
        foto_url: foto_url || null,
        foto_dpi_url: foto_dpi_url || null,
        foto_lic_url: foto_lic_url || null,
      },
    });

    await logAudit(req, "Creación", piloto.id_piloto, `Piloto registrado: ${nombre} ${apellido} (${cleanLicencia})`, piloto);

    return res.status(201).json(piloto);
  } catch (err: any) {
    console.error("Error createPiloto:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "DPI o Licencia duplicada." });
    return res.status(500).json({ error: "Error al crear piloto." });
  }
};

export const updatePiloto = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de piloto inválido." });

  const {
    nombre,
    apellido,
    dpi,
    telefono,
    correo,
    num_licencia,
    tipo_licencia,
    venc_licencia,
    estado,
    foto_url,
    foto_dpi_url,
    foto_lic_url,
  } = req.body;

  try {
    const prev = await (prisma.piloto as any).findUnique({ where: { id_piloto: id } });
    if (!prev) return res.status(404).json({ error: "Piloto no encontrado." });

    const cleanDpi = dpi ? dpi.trim() : prev.dpi;
    const cleanLicencia = num_licencia ? num_licencia.trim().toUpperCase() : prev.num_licencia;
    const nuevoEstado = estado || prev.estado;

    const piloto = await (prisma.piloto as any).update({
      where: { id_piloto: id },
      data: {
        nombre: nombre ? nombre.trim() : prev.nombre,
        apellido: apellido ? apellido.trim() : prev.apellido,
        dpi: cleanDpi,
        telefono: telefono !== undefined ? (telefono ? telefono.trim() : null) : prev.telefono,
        correo: correo !== undefined ? (correo ? correo.trim() : null) : prev.correo,
        num_licencia: cleanLicencia,
        tipo_licencia: tipo_licencia ? tipo_licencia.trim() : prev.tipo_licencia,
        venc_licencia: venc_licencia ? new Date(venc_licencia) : prev.venc_licencia,
        estado: nuevoEstado,
        disponible: nuevoEstado === "Disponible",
        foto_url: foto_url !== undefined ? foto_url : prev.foto_url,
        foto_dpi_url: foto_dpi_url !== undefined ? foto_dpi_url : prev.foto_dpi_url,
        foto_lic_url: foto_lic_url !== undefined ? foto_lic_url : prev.foto_lic_url,
      },
    });

    await logAudit(req, "Actualización", piloto.id_piloto, `Piloto actualizado: ${piloto.nombre} ${piloto.apellido}`, { antes: prev, despues: piloto });

    return res.status(200).json(piloto);
  } catch (err: any) {
    console.error("Error updatePiloto:", err);
    if (err?.code === "P2002") return res.status(409).json({ error: "DPI o Licencia duplicada con otro piloto." });
    return res.status(500).json({ error: "Error al actualizar piloto." });
  }
};

export const deletePiloto = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID de piloto inválido." });

  try {
    const piloto = await (prisma.piloto as any).update({
      where: { id_piloto: id },
      data: { activo: false },
    });

    // Desasignar de cualquier vehículo activo
    await (prisma.vehiculo as any).updateMany({
      where: { id_piloto_asignado: id },
      data: { id_piloto_asignado: null },
    });

    await logAudit(req, "Eliminación", id, `Piloto desactivado: ${piloto.nombre} ${piloto.apellido}`);

    return res.status(200).json({ message: "Piloto desactivado correctamente.", piloto });
  } catch (err) {
    console.error("Error deletePiloto:", err);
    return res.status(500).json({ error: "Error al desactivar piloto." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ASIGNACIÓN RÁPIDA DE PILOTO A VEHÍCULO
// ─────────────────────────────────────────────────────────────────────────────

export const asignarPilotoVehiculo = async (req: Request, res: Response) => {
  const { id_vehiculo, id_piloto } = req.body;
  if (!id_vehiculo) return res.status(400).json({ error: "ID de vehículo es requerido." });

  try {
    const vehiculo = await (prisma.vehiculo as any).findUnique({ where: { id_vehiculo: Number(id_vehiculo) } });
    if (!vehiculo) return res.status(404).json({ error: "Vehículo no encontrado." });

    let pilotoInfo: any = null;
    if (id_piloto) {
      pilotoInfo = await (prisma.piloto as any).findUnique({ where: { id_piloto: Number(id_piloto) } });
      if (!pilotoInfo) return res.status(404).json({ error: "Piloto no encontrado." });
    }

    const updatedVehiculo = await (prisma.vehiculo as any).update({
      where: { id_vehiculo: Number(id_vehiculo) },
      data: { id_piloto_asignado: id_piloto ? Number(id_piloto) : null },
      include: { piloto_asignado: true },
    });

    await logAudit(
      req,
      "Asignación",
      updatedVehiculo.id_vehiculo,
      id_piloto
        ? `Piloto ${pilotoInfo?.nombre} ${pilotoInfo?.apellido} asignado a unidad ${updatedVehiculo.placa}`
        : `Piloto desasignado de unidad ${updatedVehiculo.placa}`
    );

    return res.status(200).json(updatedVehiculo);
  } catch (err) {
    console.error("Error asignarPilotoVehiculo:", err);
    return res.status(500).json({ error: "Error al asignar piloto." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KPIS Y TABLERO DE DISPONIBILIDAD (DISPATCH BOARD)
// ─────────────────────────────────────────────────────────────────────────────

export const getOperacionesKPIs = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const [
      totalVehiculos,
      vehiculosDisponibles,
      vehiculosEnRuta,
      vehiculosEnTaller,
      vehiculosFueraServicio,
      totalPilotos,
      pilotosDisponibles,
      pilotosEnViaje,
      pilotosLicenciaProxima,
      alertasDocsVehiculos,
    ] = await Promise.all([
      prisma.vehiculo.count({ where: { activo: true } }),
      prisma.vehiculo.count({ where: { activo: true, estado: "Disponible" } }),
      prisma.vehiculo.count({ where: { activo: true, estado: "En Ruta" } }),
      prisma.vehiculo.count({ where: { activo: true, estado: { in: ["En Mantenimiento", "En Taller"] } } }),
      prisma.vehiculo.count({ where: { activo: true, estado: "Fuera de Servicio" } }),
      prisma.piloto.count({ where: { activo: true } }),
      (prisma.piloto as any).count({ where: { activo: true, estado: "Disponible" } }),
      (prisma.piloto as any).count({ where: { activo: true, estado: "En Viaje" } }),
      prisma.piloto.count({ where: { activo: true, venc_licencia: { lte: in30Days } } }),
      (prisma.vehiculo as any).count({
        where: {
          activo: true,
          OR: [
            { venc_circulacion: { lte: in30Days } },
            { venc_seguro: { lte: in30Days } },
            { venc_revision: { lte: in30Days } },
          ],
        },
      }),
    ]);

    const tasaDisponibilidad = totalVehiculos > 0
      ? Math.round((vehiculosDisponibles / totalVehiculos) * 100)
      : 0;

    return res.status(200).json({
      kpis: {
        totalVehiculos,
        vehiculosDisponibles,
        vehiculosEnRuta,
        vehiculosEnTaller,
        vehiculosFueraServicio,
        tasaDisponibilidad,
        totalPilotos,
        pilotosDisponibles,
        pilotosEnViaje,
        pilotosLicenciaProxima,
        alertasDocsVehiculos,
      },
    });
  } catch (err) {
    console.error("Error getOperacionesKPIs:", err);
    return res.status(500).json({ error: "Error al calcular KPIs de operaciones." });
  }
};
