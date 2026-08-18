import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("❌ JWT_SECRET no está definido en las variables de entorno.");


// Diccionario para mapear roles simplificados del frontend a los nombres en la base de datos (PostgreSQL)
export const ROLE_MAPPING: Record<string, string> = {
  "superadmin": "Superadministrador",
  "gerente": "Gerente",
  "jefe_operaciones": "Jefe de Operaciones",
  "bodeguero": "Encargado de Bodega",
  "recepcionista": "Recepcionista",
  "mecanico": "Mecanico",
  "piloto": "Piloto",
  "contador": "Contador"
};

// Interface que extiende Request para incluir la información del usuario autenticado
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    rol: string; // Rol tal y como viene en la base de datos
  };
}

/**
 * Middleware para autenticar la petición mediante un JSON Web Token (Access Token).
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Espera formato "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      error: "Acceso denegado. Token no suministrado."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      rol: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token vencido o inválido."
    });
  }
};

/**
 * Middleware para autorizar a ciertos roles específicos (RBAC).
 * Permite usar tanto el alias corto (e.g. 'superadmin') como el nombre exacto de la base de datos (e.g. 'Superadministrador').
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "No autenticado."
      });
    }

    const userRole = req.user.rol;

    // Normalizar la lista de roles permitidos para aceptar ambos nombres (alias y nombre exacto de base de datos)
    const normalizedAllowedRoles = allowedRoles.flatMap(role => {
      const dbName = ROLE_MAPPING[role];
      return dbName ? [role, dbName] : [role];
    });

    const hasRole = normalizedAllowedRoles.includes(userRole);

    if (!hasRole) {
      return res.status(403).json({
        error: `Acceso prohibido. Su rol (${userRole}) no cuenta con autorización para este recurso.`
      });
    }

    next();
  };
};
