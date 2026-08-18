import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPasswordWithToken,
  requestSupabasePasswordReset,
  syncPasswordWithSupabase,
  lookupUserEmail
} from "../controllers/auth";

const router = Router();

// Límite de intentos configurable vía variables de entorno (por defecto 30 en 15 min)
const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "20", 10);
const windowMinutes = parseInt(process.env.LOGIN_WINDOW_MINUTES || "15", 10);

const loginLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000, // Convierte minutos a milisegundos
  max: maxAttempts,
  message: {
    error: `Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en ${windowMinutes} minutos.`
  },
  standardHeaders: true, // Retorna información de RateLimit en los headers estándar
  legacyHeaders: false // Deshabilita headers X-RateLimit obsoletos
});

/**
 * POST /api/auth/login
 * Autentica al usuario. Incluye rate limiting y validación de campos.
 */
router.post(
  "/login",
  loginLimiter,
  [
    body("usuario").notEmpty().withMessage("El nombre de usuario es requerido.").isLength({ min: 3, max: 50 }).withMessage("El usuario debe tener entre 3 y 50 caracteres.").matches(/^[a-z0-9_.]+$/).withMessage("El usuario solo puede contener letras minúsculas, números, puntos y guiones bajos."),
    body("contrasena").notEmpty().withMessage("La contraseña es requerida.")
  ],
  login
);

/**
 * POST /api/auth/refresh
 * Genera un nuevo Access Token a partir de un Refresh Token válido (Rotación de Tokens).
 */
router.post("/refresh", refresh);

/**
 * POST /api/auth/logout
 * Elimina la sesión del usuario (Refresh Token en BD y limpia cookies).
 */
router.post("/logout", logout);

/**
 * POST /api/auth/forgot-password
 * Genera un token de recuperación con vigencia de 5 minutos si tiene permiso.
 */
router.post("/forgot-password", requestPasswordReset);

/**
 * POST /api/auth/reset-password
 * Valida el token de 5 minutos y actualiza la contraseña.
 */
router.post("/reset-password", resetPasswordWithToken);

/**
 * POST /api/auth/forgot-password-supabase
 * Solicita el correo de recuperación nativo con Supabase Auth.
 */
router.post("/forgot-password-supabase", requestSupabasePasswordReset);

/**
 * POST /api/auth/sync-password-supabase
 * Sincroniza la nueva contraseña ingresada en /reset-password con la base de datos local.
 */
router.post("/sync-password-supabase", syncPasswordWithSupabase);

/**
 * POST /api/auth/lookup-email
 * Retorna la información del correo enmascarado del usuario para previsualización en el frontend.
 */
router.post("/lookup-email", lookupUserEmail);

export default router;
