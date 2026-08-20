import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { ROLE_ALIAS } from "../types/auth";
import DashboardShell from "./DashboardShell";
import UnauthorizedPage from "../pages/UnauthorizedPage";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /**
   * Si se especifica, el usuario puede acceder aunque no tenga el rol base,
   * siempre que tenga ver:true para este módulo en sus permisos_modulos.
   */
  requiredModule?: string;
}

/**
 * ProtectedRoute
 * Protege rutas verificando autenticación, rol y/o permisos de módulo.
 * - Mientras inicializa -> Pantalla de carga.
 * - Si no está autenticado -> Redirige a /login.
 * - Si está autenticado: permite acceso si cumple ROL o si tiene ver:true en requiredModule.
 * - Si no cumple ninguna condición -> Renderiza IN-SITU UnauthorizedPage (401).
 */
const ProtectedRoute = ({ children, allowedRoles, requiredModule }: ProtectedRouteProps) => {
  const { isAuthenticated, isInitializing, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/50 text-sm font-medium">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    const normalizedAllowed = allowedRoles.flatMap((role) => {
      const dbName = ROLE_ALIAS[role];
      return dbName ? [role, dbName] : [role];
    });

    const hasRole = normalizedAllowed.includes(user.rol);

    // Segunda vía: permiso explícito de módulo con ver:true
    const hasModulePermission =
      !!requiredModule &&
      Array.isArray(user.permisos_modulos) &&
      user.permisos_modulos.some(
        (p: any) =>
          p.modulo?.toLowerCase() === requiredModule.toLowerCase() &&
          p.ver === true
      );

    if (!hasRole && !hasModulePermission) {
      return (
        <DashboardShell
          title="Acceso No Autorizado"
          subtitle="Sección restringida según la configuración de tu cuenta."
          icon={<ShieldAlert className="w-10 h-10 text-blue-600" />}
        >
          <UnauthorizedPage />
        </DashboardShell>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
