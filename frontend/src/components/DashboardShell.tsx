import React, { useState } from "react";
import Header from "./Header";
import { Truck, Users, BarChart3, Package, Receipt, Wrench, Navigation, Calculator } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface DashboardShellProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const DashboardShell = ({ title, subtitle, icon, children }: DashboardShellProps) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Módulos visibles en el menú lateral para permitir navegación continua
  const modules = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <BarChart3 className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Usuarios', path: '/admin/usuarios', icon: <Users className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Operaciones', path: '/operaciones', icon: <Truck className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Inventario', path: '/inventario', icon: <Package className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Ventas', path: '/ventas', icon: <Receipt className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Mecánica', path: '/mecanica', icon: <Wrench className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Viajes', path: '/viajes', icon: <Navigation className="w-6 h-6 flex-shrink-0"/> },
    { name: 'Finanzas', path: '/finanzas', icon: <Calculator className="w-6 h-6 flex-shrink-0"/> },
  ];

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Componente Header de Navegación Superior con Menú Desplegable (User Profile Dropdown) */}
      <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay para móviles */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar (Menú Izquierdo) */}
        <aside 
          className={`absolute md:relative z-30 h-full flex flex-col border-r border-blue-900/40 shadow-xl transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-60 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
          }`}
          style={{ background: "#041954" }}
        >
          <div className="p-3 space-y-1 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar-light">
            {isSidebarOpen ? (
              <div className="text-[16px] font-bold text-blue-300/80 uppercase tracking-widest mb-2 ml-2">Módulos</div>
            ) : (
              <div className="h-2 mb-2"></div>
            )}
            
            {modules.map(mod => {
              const isActive = location.pathname === mod.path;
              return (
                <Link
                  key={mod.name}
                  to={mod.path}
                  title={!isSidebarOpen ? mod.name : undefined}
                  onClick={() => {
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  style={isActive ? { backgroundColor: "#092C92" } : undefined}
                  className={`flex items-center text-sm font-medium transition-all whitespace-nowrap ${
                    isSidebarOpen
                      ? "px-3.5 py-2.5 rounded-full gap-3"
                      : "w-9 h-9 rounded-full justify-center mx-auto"
                  } ${
                    isActive
                      ? "text-white font-semibold"
                      : "text-blue-100/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {mod.icon}
                  <span className={`${!isSidebarOpen ? "hidden" : "block"}`}>
                    {mod.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 bg-white p-4 md:p-6 overflow-y-auto relative z-10 w-full">
          {/* Migajas de pan (Breadcrumbs) */}
          <nav className="text-sm font-medium text-gray-500 mb-6 flex items-center space-x-2">
            <Link to="/admin/dashboard" className="hover:text-blue-600">Inicio</Link>
            <span>/</span>
            <span className="text-gray-800">{title}</span>
          </nav>

          {children ? (
            children
          ) : (
            <div className="flex items-center justify-center h-full pb-20">
              <div className="text-center animate-fade-in-up mt-10">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,8,200,0.1), rgba(9,44,146,0.1))",
                    border: "1px solid rgba(0,8,200,0.2)",
                  }}
                >
                  {icon || <Truck className="w-10 h-10 text-blue-700" />}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
                <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto">{subtitle}</p>
                <div
                  className="mt-6 flex flex-col items-center justify-center p-6 rounded-xl border-dashed border-2"
                  style={{
                    borderColor: "rgba(0,8,200,0.3)",
                    background: "rgba(0,8,200,0.02)",
                  }}
                >
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                    style={{
                      background: "rgba(0,8,200,0.1)",
                      color: "#0008C8",
                    }}
                  >
                    <Wrench className="w-4 h-4" />
                    Módulo en Stand-by
                  </div>
                  <p className="text-gray-600 text-sm mt-3 max-w-sm mx-auto font-medium">
                    Esta sección aún no ha sido creada. Las funcionalidades correspondientes estarán disponibles en próximas actualizaciones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
