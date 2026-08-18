import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { validationResult } from "express-validator";
import prisma from "../config/prisma";
import supabase from "../config/supabase";
import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/token";
import { maskEmail, sendRecoveryEmail } from "../utils/mailer";

// Hash dummy pre-generado para mitigar ataques de temporización (evitar enumeración de usuarios)
const DUMMY_BCRYPT_HASH = "$2b$12$K.z2mBqA2wF2nZ3XpD3d1.tUf/3r/z6G08NlG0C2KqO.u.k7FwQkG";

/**
 * POST /api/auth/login
 * Autentica al usuario, actualiza el estado de conexión (en_linea = true),
 * controla el límite de intentos fallidos y retorna los módulos permitidos.
 */
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { usuario, contrasena } = req.body;
  const rawIp = req.ip || req.socket.remoteAddress || "0.0.0.0";
  const ip = (typeof rawIp === "string" ? rawIp : "0.0.0.0").substring(0, 45);

  try {
    const inputClean = (usuario || "").trim().toLowerCase();

    // Búsqueda flexible e insensible a mayúsculas por usuario o correo electrónico
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { usuario: { equals: inputClean, mode: "insensitive" } },
          { correo: { equals: inputClean, mode: "insensitive" } }
        ]
      },
      include: { rol: true, permisos_modulos: true }
    });

    if (user && user.intentos_fallidos >= user.max_intentos_fallidos) {
      return res.status(403).json({
        error: `Acceso bloqueado: Ha superado el límite de intentos fallidos (${user.max_intentos_fallidos}). Solicite ayuda al administrador.`
      });
    }

    const hashToCompare = user ? user.contrasena : DUMMY_BCRYPT_HASH;
    const isPasswordValid = await bcrypt.compare(contrasena, hashToCompare);

    if (!user || !isPasswordValid || !user.activo) {
      if (user) {
        await prisma.usuario.update({
          where: { id_usuario: user.id_usuario },
          data: { intentos_fallidos: user.intentos_fallidos + 1 }
        });

        await prisma.auditoria.create({
          data: {
            id_usuario: user.id_usuario,
            accion: "LOGIN_FALLIDO",
            modulo: "AUTENTICACION",
            descripcion: `Contraseña incorrecta para el usuario '${user.usuario}'. Intento ${user.intentos_fallidos + 1}/${user.max_intentos_fallidos}`,
            ip_origen: ip
          }
        });
      }
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // Actualizar usuario: conectado, última conexión y reiniciar intentos fallidos
    await prisma.usuario.update({
      where: { id_usuario: user.id_usuario },
      data: {
        en_linea: true,
        ultima_conexion: new Date(),
        intentos_fallidos: 0
      }
    });

    // Generar tokens de acceso y renovación (JWT)
    const accessToken = generateAccessToken({
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol.nombre
    });

    const refreshToken = generateRefreshToken({
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol.nombre
    });

    const refreshTokenHash = hashToken(refreshToken);
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token_hash: refreshTokenHash,
        id_usuario: user.id_usuario,
        expira_en: expiraEn
      }
    });

    await prisma.auditoria.create({
      data: {
        id_usuario: user.id_usuario,
        accion: "LOGIN_EXITOSO",
        modulo: "AUTENTICACION",
        descripcion: "Inicio de sesión exitoso.",
        ip_origen: ip
      }
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Parseo de nombres y apellidos limpios
    const parts = (user.nombre || "").trim().split(/\s+/).filter(Boolean);
    let nombres = user.nombre;
    let apellidos = "";
    if (parts.length >= 4) {
      const mid = Math.floor(parts.length / 2);
      nombres = parts.slice(0, mid).join(" ");
      apellidos = parts.slice(mid).join(" ");
    } else if (parts.length === 3) {
      nombres = `${parts[0]} ${parts[1]}`;
      apellidos = parts[2];
    } else if (parts.length === 2) {
      nombres = parts[0];
      apellidos = parts[1];
    }

    const allowedModules = user.permisos_modulos.filter(m => m.permitido).map(m => m.modulo);

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id_usuario,
        nombre: user.nombre,
        nombres,
        apellidos,
        usuario: user.usuario,
        email: user.correo,
        correo: user.correo,
        rol: user.rol.nombre,
        telefono: (user as any).telefono || null,
        avatar_url: user.foto_url || null,
        foto_url: user.foto_url || null,
        en_linea: true,
        permitir_cambio_password: user.permitir_cambio_password,
        ultimo_cambio_password: user.ultimo_cambio_password,
        permisos_modulos: allowedModules
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ error: "Ocurrió un error en el servidor." });
  }
};

/**
 * POST /api/auth/refresh
 * Rotación y reemisión de tokens.
 */
export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "Refresh token requerido." });
  }

  try {
    const hashed = hashToken(token);

    const dbToken = await prisma.refreshToken.findUnique({
      where: { token_hash: hashed },
      include: { usuario: { include: { rol: true, permisos_modulos: true } } }
    });

    if (!dbToken || dbToken.expira_en < new Date() || !dbToken.usuario.activo) {
      if (dbToken) {
        await prisma.refreshToken.deleteMany({
          where: { id_usuario: dbToken.id_usuario }
        });
      }
      return res.status(401).json({ error: "Refresh token vencido o inválido." });
    }

    await prisma.refreshToken.delete({
      where: { id: dbToken.id }
    });

    // Actualizar actividad y estado en línea
    await prisma.usuario.update({
      where: { id_usuario: dbToken.usuario.id_usuario },
      data: { en_linea: true, ultima_conexion: new Date() }
    });

    const newAccessToken = generateAccessToken({
      id_usuario: dbToken.usuario.id_usuario,
      correo: dbToken.usuario.correo,
      rol: dbToken.usuario.rol.nombre
    });

    const newRefreshToken = generateRefreshToken({
      id_usuario: dbToken.usuario.id_usuario,
      correo: dbToken.usuario.correo,
      rol: dbToken.usuario.rol.nombre
    });

    const newHashed = hashToken(newRefreshToken);
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token_hash: newHashed,
        id_usuario: dbToken.usuario.id_usuario,
        expira_en: expiraEn
      }
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const allowedModules = dbToken.usuario.permisos_modulos.filter(m => m.permitido).map(m => m.modulo);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: dbToken.usuario.id_usuario,
        nombre: dbToken.usuario.nombre,
        email: dbToken.usuario.correo,
        rol: dbToken.usuario.rol.nombre,
        en_linea: true,
        permitir_cambio_password: dbToken.usuario.permitir_cambio_password,
        ultimo_cambio_password: dbToken.usuario.ultimo_cambio_password,
        permisos_modulos: allowedModules
      }
    });

  } catch (error) {
    console.error("Error en refresh token:", error);
    return res.status(500).json({ error: "Error en el servidor." });
  }
};

/**
 * POST /api/auth/logout
 * Marca el usuario como desconectado (en_linea = false) y limpia tokens.
 */
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  try {
    if (token) {
      const hashed = hashToken(token);
      const dbToken = await prisma.refreshToken.findUnique({
        where: { token_hash: hashed }
      });

      if (dbToken) {
        await prisma.usuario.update({
          where: { id_usuario: dbToken.id_usuario },
          data: { en_linea: false }
        });

        await prisma.refreshToken.deleteMany({
          where: { id_usuario: dbToken.id_usuario }
        });
      }
    }

    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax"
    });

    return res.status(200).json({ message: "Sesión cerrada correctamente." });
  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({ error: "Error al cerrar sesión." });
  }
};

/**
 * POST /api/auth/forgot-password
 * Genera un token de recuperación con validez exacta de 5 minutos.
 * Verifica si el usuario tiene activado 'permitir_cambio_password'.
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  const { correo } = req.body;
  if (!correo) {
    return res.status(400).json({ error: "El correo electrónico es requerido." });
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { correo: correo.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ error: "No se encontró ningún usuario con ese correo electrónico." });
    }

    if (!user.permitir_cambio_password) {
      return res.status(403).json({
        error: "Este usuario no tiene permitido solicitar o realizar cambios de contraseña. Contacte al administrador."
      });
    }

    const rawToken = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(rawToken);
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({
      where: { id_usuario: user.id_usuario }
    });

    await prisma.passwordResetToken.create({
      data: {
        token_hash: tokenHash,
        id_usuario: user.id_usuario,
        expira_en: expiraEn
      }
    });

    await prisma.auditoria.create({
      data: {
        id_usuario: user.id_usuario,
        accion: "SOLICITUD_RESET_PASSWORD",
        modulo: "AUTENTICACION",
        descripcion: "Solicitud de recuperación de contraseña generada (Token 5 min)."
      }
    });

    return res.status(200).json({
      message: "Se ha generado el token de recuperación. Válido durante 5 minutos.",
      token: rawToken,
      expiraEn
    });
  } catch (error) {
    console.error("Error requestPasswordReset:", error);
    return res.status(500).json({ error: "Error al procesar la solicitud de recuperación." });
  }
};

/**
 * POST /api/auth/reset-password
 * Valida el token de 5 minutos y actualiza la contraseña del usuario.
 */
export const resetPasswordWithToken = async (req: Request, res: Response) => {
  const { correo, token, nuevaContrasena } = req.body;

  if (!correo || !token || !nuevaContrasena) {
    return res.status(400).json({ error: "Todos los campos son requeridos." });
  }

  if (nuevaContrasena.length < 6) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { correo: correo.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    if (!user.permitir_cambio_password) {
      return res.status(403).json({
        error: "Este usuario no tiene permitido cambiar la contraseña."
      });
    }

    const hashedToken = hashToken(token.trim());

    const dbToken = await prisma.passwordResetToken.findUnique({
      where: { token_hash: hashedToken }
    });

    if (!dbToken || dbToken.id_usuario !== user.id_usuario || dbToken.usado) {
      return res.status(400).json({ error: "Token de recuperación inválido o ya fue utilizado." });
    }

    if (dbToken.expira_en < new Date()) {
      return res.status(400).json({ error: "El token de recuperación ha expirado (límite de 5 minutos). Solicite uno nuevo." });
    }

    const newHash = await bcrypt.hash(nuevaContrasena, 10);

    await prisma.usuario.update({
      where: { id_usuario: user.id_usuario },
      data: {
        contrasena: newHash,
        ultimo_cambio_password: new Date(),
        intentos_fallidos: 0
      }
    });

    await prisma.passwordResetToken.update({
      where: { id: dbToken.id },
      data: { usado: true }
    });

    await prisma.auditoria.create({
      data: {
        id_usuario: user.id_usuario,
        accion: "RESET_PASSWORD_EXITOSO",
        modulo: "AUTENTICACION",
        descripcion: "Restablecimiento de contraseña completado con token de 5 min."
      }
    });

    return res.status(200).json({ message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error resetPasswordWithToken:", error);
    return res.status(500).json({ error: "Error al restablecer la contraseña." });
  }
};

/**
 * POST /api/auth/lookup-email
 * Retorna la información de enmascaramiento previa para dar retroalimentación visual al usuario mientras escribe.
 */
export const lookupUserEmail = async (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    return res.status(400).json({ error: "Identificador requerido." });
  }

  try {
    const inputClean = identifier.trim().toLowerCase();
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { usuario: { equals: inputClean, mode: 'insensitive' } },
          { correo: { equals: inputClean, mode: 'insensitive' } },
          { correo_recuperacion: { equals: inputClean, mode: 'insensitive' } },
          { correo: { startsWith: `${inputClean}@`, mode: 'insensitive' } },
          { nombre: { contains: inputClean, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ exists: false, error: "Usuario no encontrado." });
    }

    const destEmail = user.correo_recuperacion || user.correo;
    const isGmail = destEmail.toLowerCase().endsWith("@gmail.com");

    return res.status(200).json({
      exists: true,
      usuario: user.usuario,
      nombre: user.nombre,
      destEmail,
      maskedEmail: maskEmail(destEmail),
      isGmail,
      permitirCambio: user.permitir_cambio_password
    });
  } catch (error) {
    return res.status(500).json({ error: "Error al consultar usuario." });
  }
};

/**
 * POST /api/auth/forgot-password-supabase
 * Solicita el envío de un correo de recuperación nativo mediante Supabase Auth
 * apuntando a la ruta /reset-password del front-end.
 * Cumple con los estándares de ciberseguridad OWASP para mitigar la enumeración de usuarios.
 */
export const requestSupabasePasswordReset = async (req: Request, res: Response) => {
  const { correo, frontendUrl } = req.body;
  
  // Mensaje genérico estándar recomendado por OWASP
  const GENERIC_SUCCESS_MSG = "Si el correo electrónico coincide con una cuenta registrada, recibirás un mensaje con las instrucciones en unos minutos.";

  if (!correo || typeof correo !== "string" || !correo.trim()) {
    return res.status(400).json({ error: "El correo electrónico o usuario es requerido." });
  }

  try {
    const inputClean = correo.trim().toLowerCase();

    // Búsqueda del usuario en la BD de la aplicación
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { usuario: { equals: inputClean, mode: 'insensitive' } },
          { correo: { equals: inputClean, mode: 'insensitive' } },
          { correo_recuperacion: { equals: inputClean, mode: 'insensitive' } },
          { correo: { startsWith: `${inputClean}@`, mode: 'insensitive' } }
        ]
      }
    });

    // Si el usuario no existe o no tiene permitido cambiar contraseña, responder con el mensaje genérico (OWASP)
    if (!user || !user.permitir_cambio_password) {
      console.log(`[OWASP] Solicitud de recuperación procesada en modo seguro para input: ${inputClean}`);
      return res.status(200).json({ message: GENERIC_SUCCESS_MSG });
    }

    let destEmail = user.correo_recuperacion || user.correo;

    if (inputClean.includes("@gmail.com")) {
      destEmail = inputClean;
    }

    // El dominio receptor debe ser @gmail.com según los requerimientos del proyecto
    if (!destEmail.toLowerCase().endsWith("@gmail.com")) {
      console.log(`[OWASP] El usuario ID ${user.id_usuario} no posee un correo @gmail.com válido (${destEmail}).`);
      return res.status(200).json({ message: GENERIC_SUCCESS_MSG });
    }

    const redirectOrigin = frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectTo = `${redirectOrigin.replace(/\/$/, "")}/reset-password`;

    // 1. Asegurar que la cuenta exista en Supabase Auth (auth.users)
    try {
      await supabase.auth.admin.createUser({
        email: destEmail,
        email_confirm: true,
        user_metadata: { nombre: user.nombre, usuario: user.usuario }
      });
    } catch (createErr: any) {
      // Si la cuenta ya existe en Supabase Auth, se ignora el error
    }

    // 2. Generar el enlace seguro mediante Supabase Admin SDK
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: destEmail,
      options: { redirectTo }
    });

    if (linkError) {
      console.error("[Auth] Error en Supabase generateLink:", linkError.message);
    }

    const actionLink = linkData?.properties?.action_link || null;

    // 3. Despachar el correo nativo mediante Supabase Auth
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(destEmail, {
      redirectTo
    });

    if (supabaseError) {
      console.warn("[Auth] Advertencia en Supabase resetPasswordForEmail:", supabaseError.message);
    }

    // 4. Envío directo secundario vía Nodemailer si SMTP está configurado en .env
    if (actionLink) {
      sendRecoveryEmail(destEmail, actionLink, user.nombre).catch((e) => {
        console.error("Error envío secundario SMTP:", e);
      });
    }

    // Registrar en auditoría de seguridad
    await prisma.auditoria.create({
      data: {
        id_usuario: user.id_usuario,
        accion: "SOLICITUD_RESET_PASSWORD_SUPABASE",
        modulo: "AUTENTICACION",
        descripcion: `Solicitud de recuperación de contraseña procesada con éxito.`
      }
    });

    // Retornar la respuesta genérica de seguridad recomendada por OWASP
    return res.status(200).json({ message: GENERIC_SUCCESS_MSG });
  } catch (error: any) {
    console.error("[Auth] Error requestSupabasePasswordReset:", error);
    return res.status(500).json({ error: "Ocurrió un error interno al procesar la solicitud." });
  }
};

/**
 * POST /api/auth/sync-password-supabase
 * Sincroniza la nueva contraseña en la BD local cuando el usuario completa el flujo en /reset-password.
 */
export const syncPasswordWithSupabase = async (req: Request, res: Response) => {
  const { correo, nuevaContrasena } = req.body;

  if (!correo || !nuevaContrasena) {
    return res.status(400).json({ error: "Todos los campos son requeridos para la sincronización." });
  }

  if (nuevaContrasena.length < 6) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
  }

  try {
    const inputClean = correo.trim().toLowerCase();

    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { correo: inputClean },
          { correo_recuperacion: inputClean }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado para sincronizar la contraseña." });
    }

    const hash = await bcrypt.hash(nuevaContrasena, 10);

    await prisma.usuario.update({
      where: { id_usuario: user.id_usuario },
      data: {
        contrasena: hash,
        ultimo_cambio_password: new Date(),
        intentos_fallidos: 0
      }
    });

    await prisma.auditoria.create({
      data: {
        id_usuario: user.id_usuario,
        accion: "RESET_PASSWORD_EXITOSO_SUPABASE",
        modulo: "AUTENTICACION",
        descripcion: "Sincronización exitosa de contraseña tras recuperación nativa con Supabase."
      }
    });

    return res.status(200).json({ message: "Contraseña sincronizada correctamente en la base de datos." });
  } catch (error) {
    console.error("Error syncPasswordWithSupabase:", error);
    return res.status(500).json({ error: "Error al sincronizar la contraseña en el sistema." });
  }
};
