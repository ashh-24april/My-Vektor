import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) throw new Error("❌ JWT_SECRET no está definido en las variables de entorno.");
if (!JWT_REFRESH_SECRET) throw new Error("❌ JWT_REFRESH_SECRET no está definido en las variables de entorno.");


interface UserPayload {
  id_usuario: number;
  correo: string;
  rol: string;
}

/**
 * Genera un Access Token JWT válido por 15 minutos.
 */
export const generateAccessToken = (user: UserPayload): string => {
  return jwt.sign(
    { id: user.id_usuario, email: user.correo, rol: user.rol },
    JWT_SECRET,
    { expiresIn: "4h" }
  );
};

/**
 * Genera un Refresh Token JWT válido por 7 días.
 */
export const generateRefreshToken = (user: UserPayload): string => {
  return jwt.sign(
    { id: user.id_usuario, email: user.correo, rol: user.rol },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

/**
 * Genera un hash SHA-256 de un token para guardarlo de manera segura en la base de datos.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
