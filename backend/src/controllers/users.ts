import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data/settings.json");

const getAdminProtectionKey = (): string => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      if (data.adminProtectionKey) {
        return data.adminProtectionKey;
      }
    }
  } catch (error) {
    console.error("Error reading settings.json:", error);
  }
  const key = process.env.ADMIN_PROTECTION_KEY;
  if (!key) {
    throw new Error("ADMIN_PROTECTION_KEY no está definida en las variables de entorno.");
  }
  return key;
};

const saveAdminProtectionKey = (newKey: string): void => {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = fs.existsSync(SETTINGS_FILE) 
      ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
      : {};
    data.adminProtectionKey = newKey;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving settings.json:", error);
    throw new Error("No se pudo guardar la clave de protección.");
  }
};

const isProtectedAdmin = async (id: number): Promise<boolean> => {
  const protectedAdmins = await prisma.usuario.findMany({
    where: {
      rol: {
        nombre: {
          in: ["Superadministrador", "Gerente"]
        }
      }
    },
    orderBy: {
      id_usuario: "asc"
    },
    take: 2,
    select: { id_usuario: true }
  });
  return protectedAdmins.some(u => u.id_usuario === id);
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id_usuario: true,
        nombre: true,
        usuario: true,
        correo: true,
        correo_recuperacion: true,
        permitir_cambio_password: true,
        activo: true,
        en_linea: true,
        ultima_conexion: true,
        ultimo_cambio_password: true,
        intentos_fallidos: true,
        max_intentos_fallidos: true,
        dias_cambio_password: true,
        foto_url: true,
        telefono: true,
        created_at: true,
        rol: {
          select: {
            id_rol: true,
            nombre: true
          }
        },
        permisos_modulos: {
          select: {
            modulo: true,
            permitido: true
          }
        }
      } as any,
      orderBy: { id_usuario: 'asc' }
    });
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error getUsers:", error);
    return res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nombre: true,
        usuario: true,
        correo: true,
        correo_recuperacion: true,
        permitir_cambio_password: true,
        activo: true,
        en_linea: true,
        ultima_conexion: true,
        ultimo_cambio_password: true,
        intentos_fallidos: true,
        max_intentos_fallidos: true,
        dias_cambio_password: true,
        foto_url: true,
        telefono: true,
        created_at: true,
        rol: { select: { id_rol: true, nombre: true } },
        permisos_modulos: { select: { modulo: true, permitido: true } },
        auditorias: {
          take: 10,
          orderBy: { fecha_hora: 'desc' }
        }
      } as any
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error getUserById:", error);
    return res.status(500).json({ error: "Error al obtener usuario." });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const {
    nombres,
    apellidos,
    nombre: nombreDirecto,
    correo,
    correo_recuperacion,
    telefono,
    contrasena,
    id_rol,
    permitir_cambio_password = true,
    max_intentos_fallidos = 5,
    dias_cambio_password = 90,
    modulosPermitidos = []
  } = req.body;

  try {
    const nombre = nombres && apellidos ? `${nombres.trim()} ${apellidos.trim()}` : (nombreDirecto || "");
    const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    
    const words = nombre.trim().split(/\s+/);
    const primerNombre = words[0] || "";
    const primerApellido = words.length > 1 ? words[words.length - 1] : "";
    
    const firstLetter = normalizeStr(primerNombre.charAt(0));
    const baseUsername = firstLetter + normalizeStr(primerApellido || primerNombre);
    let generatedUsuario = baseUsername;
    let counter = 1;

    while (true) {
      const existing = await prisma.usuario.findUnique({ where: { usuario: generatedUsuario } });
      if (!existing) break;
      generatedUsuario = `${baseUsername}${counter.toString().padStart(2, '0')}`;
      counter++;
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        usuario: generatedUsuario,
        correo,
        correo_recuperacion: correo_recuperacion ? correo_recuperacion.trim().toLowerCase() : null,
        telefono: telefono ? telefono.trim() : null,
        contrasena: hash,
        id_rol,
        permitir_cambio_password: Boolean(permitir_cambio_password),
        max_intentos_fallidos: parseInt(max_intentos_fallidos) || 5,
        dias_cambio_password: parseInt(dias_cambio_password) || 90,
        ultimo_cambio_password: new Date(),
        permisos_modulos: Array.isArray(modulosPermitidos) && modulosPermitidos.length > 0 ? {
          create: modulosPermitidos.map((m: string) => ({ modulo: m, permitido: true }))
        } : undefined
      } as any
    });
    
    await prisma.auditoria.create({
      data: {
        id_usuario: (req as any).user?.id || newUser.id_usuario,
        accion: "CREAR_USUARIO",
        modulo: "USUARIOS",
        descripcion: `Usuario creado: ${generatedUsuario}`
      }
    });

    return res.status(201).json({ message: "Usuario creado exitosamente", id: newUser.id_usuario, usuario: generatedUsuario });
  } catch (error: any) {
    console.error("Error createUser:", error);
    if (error?.code === 'P2002' || error?.code === '23505') {
      return res.status(409).json({ error: "Error: El usuario o correo especificado ya existe en el sistema.", code: "23505" });
    }
    return res.status(500).json({ error: "Error al crear usuario." });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    nombres,
    apellidos,
    nombre: nombreDirecto,
    correo,
    correo_recuperacion,
    telefono,
    foto_url,
    id_rol,
    activo,
    adminKey,
    permitir_cambio_password,
    max_intentos_fallidos,
    dias_cambio_password,
    modulosPermitidos
  } = req.body;
  const currentUserId = (req as any).user?.id;

  try {
    const isSensitiveChange = nombres !== undefined || apellidos !== undefined || nombreDirecto !== undefined || correo !== undefined || id_rol !== undefined || activo !== undefined;
    if (isSensitiveChange && currentUserId !== id && await isProtectedAdmin(id)) {
      const systemAdminKey = getAdminProtectionKey();
      if (adminKey !== systemAdminKey) {
        return res.status(403).json({
          error: "Clave de protección administrativa incorrecta o no proporcionada. No tienes permiso para editar este administrador principal."
        });
      }
    }
    const updateData: any = {};
    if (nombres !== undefined || apellidos !== undefined) {
      const n = (nombres || "").trim();
      const a = (apellidos || "").trim();
      updateData.nombre = `${n} ${a}`.trim();
    } else if (nombreDirecto !== undefined) {
      updateData.nombre = nombreDirecto;
    }
    if (correo !== undefined) updateData.correo = correo;
    if (correo_recuperacion !== undefined) updateData.correo_recuperacion = correo_recuperacion ? correo_recuperacion.trim().toLowerCase() : null;
    if (telefono !== undefined) updateData.telefono = telefono ? telefono.trim() : null;
    if (foto_url !== undefined) updateData.foto_url = foto_url;
    if (id_rol !== undefined) updateData.id_rol = id_rol;
    if (activo !== undefined) updateData.activo = activo;
    if (permitir_cambio_password !== undefined) updateData.permitir_cambio_password = Boolean(permitir_cambio_password);
    if (max_intentos_fallidos !== undefined) updateData.max_intentos_fallidos = parseInt(max_intentos_fallidos);
    if (dias_cambio_password !== undefined) updateData.dias_cambio_password = parseInt(dias_cambio_password);

    const updated = await prisma.usuario.update({
      where: { id_usuario: id },
      data: updateData
    });

    if (Array.isArray(modulosPermitidos)) {
      await prisma.usuarioPermisoModulo.deleteMany({ where: { id_usuario: id } });
      if (modulosPermitidos.length > 0) {
        await prisma.usuarioPermisoModulo.createMany({
          data: modulosPermitidos.map((m: string) => ({
            id_usuario: id,
            modulo: m,
            permitido: true
          }))
        });
      }
    }

    if ((req as any).user) {
       await prisma.auditoria.create({
        data: {
          id_usuario: (req as any).user.id,
          accion: "EDITAR_USUARIO",
          modulo: "USUARIOS",
          descripcion: `Usuario actualizado: ${updated.usuario}`
        }
      });
    }

    return res.status(200).json({ message: "Usuario actualizado", user: updated });
  } catch (error: any) {
    console.error("Error updateUser:", error);
    if (error?.code === 'P2002' || error?.code === '23505') {
      return res.status(409).json({ error: "Error: El usuario o correo especificado ya existe en el sistema.", code: "23505" });
    }
    return res.status(500).json({ error: "Error al actualizar usuario." });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { contrasena, adminKey } = req.body;
  const currentUserId = (req as any).user?.id;

  try {
    const targetUser = await prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!targetUser) return res.status(404).json({ error: "Usuario no encontrado." });

    if (!targetUser.permitir_cambio_password) {
      return res.status(403).json({
        error: "Este usuario no tiene permitido cambiar su contraseña."
      });
    }

    if (currentUserId !== id && await isProtectedAdmin(id)) {
      const systemAdminKey = getAdminProtectionKey();
      if (adminKey !== systemAdminKey) {
        return res.status(403).json({
          error: "Clave de protección administrativa incorrecta o no proporcionada. No tienes permiso para cambiar la contraseña de este administrador principal."
        });
      }
    }
    const hash = await bcrypt.hash(contrasena, 10);
    await prisma.usuario.update({
      where: { id_usuario: id },
      data: {
        contrasena: hash,
        ultimo_cambio_password: new Date(),
        intentos_fallidos: 0
      }
    });

    if ((req as any).user) {
      await prisma.auditoria.create({
        data: {
          id_usuario: (req as any).user.id,
          accion: "CAMBIO_CONTRASENA",
          modulo: "USUARIOS",
          descripcion: `Contraseña cambiada para usuario ID: ${id}`
        }
      });
    }
    return res.status(200).json({ message: "Contraseña actualizada" });
  } catch (error) {
    console.error("Error changePassword:", error);
    return res.status(500).json({ error: "Error al cambiar contraseña." });
  }
};

export const updateAdminProtectionKey = async (req: Request, res: Response) => {
  const { currentKey, newKey } = req.body;
  try {
    const systemAdminKey = getAdminProtectionKey();
    if (currentKey !== systemAdminKey) {
      return res.status(400).json({ error: "La clave de protección actual es incorrecta." });
    }

    if (!newKey || newKey.trim().length < 6) {
      return res.status(400).json({ error: "La nueva clave debe tener al menos 6 caracteres." });
    }

    saveAdminProtectionKey(newKey.trim());

    // Auditoria
    if ((req as any).user) {
      await prisma.auditoria.create({
        data: {
          id_usuario: (req as any).user.id,
          accion: "CAMBIO_CLAVE_PROTECCION",
          modulo: "USUARIOS",
          descripcion: "Clave de protección de administradores principales actualizada"
        }
      });
    }

    return res.status(200).json({ message: "Clave de protección actualizada exitosamente." });
  } catch (error) {
    console.error("Error updateAdminProtectionKey:", error);
    return res.status(500).json({ error: "Error al actualizar la clave de protección." });
  }
};
