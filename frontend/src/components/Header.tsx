import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useAuth } from "../hooks/useAuth";
import { Menu, User, ChevronDown, UserPlus, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import NotificationBell from "./NotificationBell";

// Logo oficial MyVektor desde Supabase Storage
const LOGO_MYVEKTOR_URL = import.meta.env.VITE_LOGO_URL || "";

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú desplegable al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Determinar si el usuario tiene rol de Administrador o Superadministrador
  const rolClean = (user?.rol || "").toLowerCase();
  const isAdmin =
    rolClean === "administrador" ||
    rolClean === "superadministrador" ||
    rolClean.includes("admin");

  return (
    <header
      className="px-4 md:px-6 py-3 flex items-center justify-between shadow-md z-40 relative border-b border-blue-900/40 text-white select-none"
      style={{ background: "#041954" }}
    >
      {/* Izquierda: Botón Hamburguesa e Isotipo MyVektor */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Alternar navegación lateral"
          className="p-1.5 rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img
          src={LOGO_MYVEKTOR_URL}
          alt="MyVektor Logo"
          className="w-7 h-7 object-contain ml-0.5"
        />
        <span className="font-bold text-white text-base tracking-tight hidden sm:block">
          MyVektor
        </span>
      </div>

      {/* Derecha: Campana de Notificaciones y Píldora de Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
          >
          {/* Foto o Icono de Avatar */}
          {user?.foto_url ? (
            <img
              src={user.foto_url}
              alt={user.nombre}
              className="w-7 h-7 rounded-full object-cover border border-white/30 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/20 shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}

          <span className="text-xs font-semibold text-white tracking-wide">
            MyVektor
          </span>

          <ChevronDown
            className={`w-4 h-4 text-blue-200 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {/* Panel del Menú Desplegable (User Profile Dropdown) */}
        {isDropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-72 bg-white text-gray-800 border border-[#041954]/20 rounded-2xl shadow-xl z-50 divide-y divide-[#041954]/10 transition-all duration-200 overflow-hidden"
            style={{
              animation: "dropdown-fade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Encabezado de Usuario (Header Block) */}
            <div className="p-4 bg-gray-50/70">
              <div className="flex items-center gap-3">
                {user?.foto_url ? (
                  <img
                    src={user.foto_url}
                    alt={user.nombre}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#041954]/10 flex items-center justify-center text-[#041954] border border-[#041954]/20 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.nombre || "Usuario"}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {user?.email || user?.correo || "usuario@myvektor.com"}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-200/60">
                <Link
                  to="/perfil"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-xs font-semibold text-[#092C92] hover:text-[#041954] hover:underline flex items-center gap-1.5 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Perfil y preferencias</span>
                </Link>
              </div>
            </div>

            {/* Sección de Acciones Rápidas (Condicional por Rol Administrador/Superadministrador) */}
            {isAdmin && (
              <div className="py-2 px-3">
                <Link
                  to="/admin/usuarios"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#041954]/5 hover:text-[#092C92] rounded-xl transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-[#092C92]" />
                  <span>Crea un usuario</span>
                </Link>
              </div>
            )}

            {/* Pie del Menú (Footer Block) */}
            <div className="p-3 space-y-2 bg-gray-50/40">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Cerrar sesión</span>
              </button>

              <div className="pt-1 text-center border-t border-gray-200/50">
                <Link
                  to="/privacidad"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Política de privacidad
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      <style>{`
        @keyframes dropdown-fade {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  );
};

export default Header;
