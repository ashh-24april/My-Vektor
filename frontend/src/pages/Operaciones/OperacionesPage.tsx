
import React, { useState } from "react";
import { Truck, Users, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { hasPermission } from "../../types/auth";
import DispatchBoardTab from "./tabs/DispatchBoardTab";
import VehiculosTab from "./tabs/VehiculosTab";
import PilotosTab from "./tabs/PilotosTab";

type TabId = "dispatch" | "vehiculos" | "pilotos";

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "dispatch",  label: "Tablero de Disponibilidad", icon: LayoutDashboard },
  { id: "vehiculos", label: "Flota de Vehículos",        icon: Truck },
  { id: "pilotos",   label: "Pilotos y Operadores",       icon: Users },
];

const OperacionesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>("dispatch");

  // Verificar permiso de visualización en Operaciones
  if (!hasPermission(user, "Operaciones", "ver")) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tienes acceso a este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selector de Pestañas (Tab Bar) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 shadow-xs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer
                ${isActive
                  ? "bg-[#041954] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div>
        {activeTab === "dispatch"  && <DispatchBoardTab />}
        {activeTab === "vehiculos" && <VehiculosTab />}
        {activeTab === "pilotos"   && <PilotosTab />}
      </div>
    </div>
  );
};

export default OperacionesPage;
