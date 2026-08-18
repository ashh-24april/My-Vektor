import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ROLE_ROUTES } from "../types/auth";

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute / GuestGuard
 * Protege rutas públicas como /login, /recuperar-password, etc.
 * - Mientras inicializa la sesión -> Muestra pantalla de carga limpia.
 * - Si el usuario ya está autenticado -> Redirige a su panel principal con { replace: true }
 *   impidiendo que regrese al login usando las flechas del navegador.
 * - Si no está autenticado -> Renderiza la vista pública.
 */
const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, isInitializing, isLoading, user } = useAuthStore();

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-[#041954] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-white/70 text-sm font-medium">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const targetRoute = ROLE_ROUTES[user.rol] || "/dashboard";
    return <Navigate to={targetRoute} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
