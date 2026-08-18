import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ROLE_ROUTES } from "../types/auth";

/**
 * AuthHistoryGuard
 * Intercepta los eventos 'popstate' (botón Atrás del navegador) para encerrar
 * al usuario autenticado dentro del historial del ERP.
 * La única vía oficial para salir del sistema es el botón 'Cerrar sesión'.
 */
export const AuthHistoryGuard = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const defaultUserRoute = ROLE_ROUTES[user.rol] || "/dashboard";

    // Inyectar marca inicial ficticia en el historial del navegador
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      // Re-inyectar marca en el historial para bloquear la salida a rutas públicas (ej. /login)
      window.history.pushState(null, "", window.location.href);
      // Redirigir inmediatamente a la ruta base por defecto del usuario
      navigate(defaultUserRoute, { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated, user, navigate]);

  return null;
};
