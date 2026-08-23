import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Package,
  Receipt,
  Wrench,
  ShieldCheck,
  Info,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  type NotificacionItem
} from "../api/notificaciones";

const NOTIF_ICONS: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  inventario: {
    icon: <Package className="w-4 h-4" />,
    bg: "bg-rose-50",
    text: "text-rose-600"
  },
  ventas: {
    icon: <Receipt className="w-4 h-4" />,
    bg: "bg-blue-50",
    text: "text-blue-600"
  },
  mecanica: {
    icon: <Wrench className="w-4 h-4" />,
    bg: "bg-amber-50",
    text: "text-amber-600"
  },
  auditoria: {
    icon: <ShieldCheck className="w-4 h-4" />,
    bg: "bg-purple-50",
    text: "text-purple-600"
  },
  sistema: {
    icon: <Info className="w-4 h-4" />,
    bg: "bg-gray-100",
    text: "text-gray-600"
  }
};

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"todas" | "no_leidas">("todas");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await getNotificaciones();
      setNotificaciones(data.notificaciones || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silencioso para no interrumpir
    }
  }, []);

  // Polling automático cada 20 segundos
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Click outside para cerrar el popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarcarTodas = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClickItem = async (notif: NotificacionItem) => {
    if (!notif.leida) {
      marcarNotificacionLeida(notif.id_notificacion).catch(() => {});
      setNotificaciones(prev =>
        prev.map(n => (n.id_notificacion === notif.id_notificacion ? { ...n, leida: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  const formatRelativeTime = (dateInput: string | Date) => {
    try {
      const d = new Date(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Ahora mismo";
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return "Ayer";
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return d.toLocaleDateString("es-GT", { month: "short", day: "numeric" });
    } catch {
      return "Reciente";
    }
  };

  const filteredNotifs = filter === "no_leidas" ? notificaciones.filter(n => !n.leida) : notificaciones;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana con Badge Rojo Dinámico */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) fetchNotifs();
        }}
        className="relative p-2.5 rounded-full hover:bg-white/10 text-white transition-colors focus:outline-none"
        title="Notificaciones y Alertas"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-black text-[10px] rounded-full border-2 border-[#041954] shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Flotante */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-up text-xs font-normal">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px]">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodas}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          {/* Filtros de Pestaña */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter("todas")}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${
                filter === "todas" ? "bg-[#041954] text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Todas ({notificaciones.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("no_leidas")}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${
                filter === "no_leidas" ? "bg-[#041954] text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              No leídas ({unreadCount})
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {filteredNotifs.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                <p className="font-semibold text-gray-600">No hay notificaciones</p>
                <p className="text-[11px] text-gray-400">Estás al día con todas las alertas del sistema.</p>
              </div>
            ) : (
              filteredNotifs.map(notif => {
                const conf = NOTIF_ICONS[notif.tipo] || NOTIF_ICONS.sistema;

                return (
                  <div
                    key={notif.id_notificacion}
                    onClick={() => handleClickItem(notif)}
                    className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notif.leida ? "bg-blue-50/30" : ""
                    }`}
                  >
                    {/* Icono del Módulo */}
                    <div className={`w-8 h-8 rounded-xl ${conf.bg} ${conf.text} flex items-center justify-center shrink-0 mt-0.5`}>
                      {conf.icon}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`font-bold truncate text-xs ${!notif.leida ? "text-gray-900" : "text-gray-700"}`}>
                          {notif.titulo}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {formatRelativeTime(notif.fecha)}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                        {notif.mensaje}
                      </p>

                      {notif.link && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 font-semibold">
                          <span>Ver detalle</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Punto indicador de no leída */}
                    {!notif.leida && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
