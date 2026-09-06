import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  BarChart3, Package, Users, Truck, Receipt, Wrench, Navigation, Calculator, User as UserIcon, ShieldAlert, SearchX, ShieldCheck,
} from "lucide-react";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import DashboardShell from "./components/DashboardShell";
import AuthInitializer from "./components/AuthInitializer";
import { AuthHistoryGuard } from "./components/AuthHistoryGuard";
import UsersList from "./pages/Users/UsersList";
import ProfilePage from "./pages/ProfilePage";
import InventarioPage from "./pages/Inventario/InventarioPage";
import VentasPage from "./pages/Ventas/VentasPage";
import MecanicaPage from "./pages/Mecanica/MecanicaPage";
import DashboardOverview from "./pages/Dashboard/DashboardOverview";
import AuditoriaPage from "./pages/Auditoria/AuditoriaPage";
import ErrorBoundary from "./components/ErrorBoundary";

const ADMIN_MANAGEMENT_ROLES = [
  "superadmin", "Superadministrador",
  "administrador", "Administrador",
  "gerente", "Gerente"
];

function App() {
  return (
    <ErrorBoundary fallbackTitle="Error en la aplicación MyVektor">
      <BrowserRouter>
        <AuthInitializer>
          <AuthHistoryGuard />
          <Routes>
            {/* Rutas públicas protegidas por PublicRoute / GuestGuard */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/recuperar-password"
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              }
            />

            {/* Página de error 403 (Acceso No Autorizado) */}
            <Route
              path="/no-autorizado"
              element={
                <ProtectedRoute>
                  <DashboardShell
                    title="Acceso No Autorizado"
                    subtitle="Sección restringida según la configuración de tu cuenta."
                    icon={<ShieldAlert className="w-10 h-10 text-blue-600" />}
                  >
                    <UnauthorizedPage />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* ── Rutas protegidas por rol ─────────────────────────────────── */}

            {/* Superadministrador / Administrador */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={ADMIN_MANAGEMENT_ROLES} requiredModule="Dashboard">
                  <DashboardShell
                    title="Panel de Control General"
                    subtitle="Métricas operativas, financieras y de inventario en tiempo real."
                    icon={<BarChart3 className="w-10 h-10 text-primary-light" />}
                  >
                    <DashboardOverview />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* Gestión de Usuarios */}
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute allowedRoles={ADMIN_MANAGEMENT_ROLES} requiredModule="Usuarios">
                  <DashboardShell
                    title="Gestión de Usuarios"
                    subtitle="Administra los accesos y roles del sistema."
                    icon={<Users className="w-10 h-10 text-primary-light" />}
                  >
                    <UsersList />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* Gerente */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={ADMIN_MANAGEMENT_ROLES} requiredModule="Dashboard">
                  <DashboardShell
                    title="Dashboard Ejecutivo"
                    subtitle="Resumen operativo, KPIs y reportes de la empresa."
                    icon={<BarChart3 className="w-10 h-10 text-primary-light" />}
                  >
                    <DashboardOverview />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* Jefe de Operaciones */}
            <Route
              path="/operaciones"
              element={
                <ProtectedRoute allowedRoles={["jefe_operaciones", "Jefe de Operaciones", ...ADMIN_MANAGEMENT_ROLES]} requiredModule="Operaciones">
                  <DashboardShell
                    title="Gestión de Operaciones"
                    subtitle="Control de flota, pilotos y programación de viajes."
                    icon={<Truck className="w-10 h-10 text-primary-light" />}
                  />
                </ProtectedRoute>
              }
            />

            {/* Encargado de Bodega / Inventario */}
            <Route
              path="/inventario"
              element={
                <ProtectedRoute allowedRoles={["bodeguero", "Encargado de Bodega", ...ADMIN_MANAGEMENT_ROLES]} requiredModule="Inventario">
                  <DashboardShell
                    title="Control de Inventario"
                    subtitle="Gestión de productos, entradas, salidas y proveedores."
                    icon={<Package className="w-10 h-10 text-primary-light" />}
                  >
                    <InventarioPage />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* Recepcionista / Ventas */}
            <Route
              path="/ventas"
              element={
                <ProtectedRoute allowedRoles={["recepcionista", "Recepcionista", ...ADMIN_MANAGEMENT_ROLES]} requiredModule="Ventas">
                  <DashboardShell
                    title="Ventas y Facturación"
                    subtitle="Solicitudes de servicio, venta de repuestos y clientes."
                    icon={<Receipt className="w-10 h-10 text-primary-light" />}
                  >
                    <VentasPage />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* Mecánico */}
            <Route
              path="/mecanica"
              element={
                <ProtectedRoute allowedRoles={["mecanico", "Mecanico", ...ADMIN_MANAGEMENT_ROLES]} requiredModule="Mecánica">
                  <DashboardShell
                    title="Órdenes de Trabajo"
                    subtitle="Órdenes de servicio asignadas y registro de trabajos realizados."
                    icon={<Wrench className="w-10 h-10 text-primary-light" />}
                  >
                    <MecanicaPage />
                  </DashboardShell>
                </ProtectedRoute>
              }
            />

            {/* Piloto */}
            <Route
              path="/viajes"
              element={
                <ProtectedRoute allowedRoles={["piloto", "Piloto", ...ADMIN_MANAGEMENT_ROLES]} requiredModule="Viajes">
                  <DashboardShell
                    title="Mis Viajes"
                    subtitle="Viajes asignados, incidentes y documentos de tu unidad."
                    icon={<Navigation className="w-10 h-10 text-primary-light" />}
                  />
                </ProtectedRoute>
              }
            />

            {/* Contador */}
            <Route
              path="/finanzas"
              element={
                <ProtectedRoute allowedRoles={["contador", "Contador", ...ADMIN_MANAGEMENT_ROLES]} requiredModule="Finanzas">
                  <DashboardShell
                    title="Módulo Financiero"
                    subtitle="Reportes contables, estados financieros y análisis de costos."
                    icon={<Calculator className="w-10 h-10 text-primary-light" />}
                  />
                </ProtectedRoute>
              }
            />

          {/* Perfil y Preferencias (Accesible para cualquier usuario autenticado) */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <DashboardShell
                  title="Perfil y Preferencias"
                  subtitle="Estas preferencias solo se aplican a tu cuenta de usuario."
                  icon={<UserIcon className="w-10 h-10 text-primary-light" />}
                >
                  <ProfilePage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          {/* Bitácora de Auditoría (Exclusivo Administradores y Gerencia) */}
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "Superadministrador", "gerente", "Gerente", "administrador", "Administrador"]}>
                <DashboardShell
                  title="Bitácora de Auditoría"
                  subtitle="Registro y trazabilidad de seguridad de eventos y cambios del sistema."
                  icon={<ShieldCheck className="w-10 h-10 text-primary-light" />}
                >
                  <AuditoriaPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />

          {/* Ruta raíz → Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 (Not Found) dentro del Dashboard Shell para usuarios autenticados */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <DashboardShell
                  title="Página No Encontrada"
                  subtitle="La sección a la que intentas acceder no existe."
                  icon={<SearchX className="w-10 h-10 text-blue-600" />}
                >
                  <NotFoundPage />
                </DashboardShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  </ErrorBoundary>
);
}

export default App;
