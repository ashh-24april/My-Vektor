import React, { useState } from "react";
import { Package, Tag, Building2, ShoppingCart } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { hasPermission } from "../../types/auth";
import ProductosTab  from "./tabs/ProductosTab";
import CategoriasTab from "./tabs/CategoriasTab";
import ProveedoresTab from "./tabs/ProveedoresTab";
import ComprasTab    from "./tabs/ComprasTab";

type TabId = "productos" | "categorias" | "proveedores" | "compras";

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "productos",   label: "Productos",   icon: Package },
  { id: "categorias",  label: "Categorías",  icon: Tag },
  { id: "proveedores", label: "Proveedores", icon: Building2 },
  { id: "compras",     label: "Compras",     icon: ShoppingCart },
];

const InventarioPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>("productos");

  // Verificar permiso de vista en Inventario
  if (!hasPermission(user, "Inventario", "ver")) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tienes acceso a este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all
                ${isActive
                  ? "bg-[#041954] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la tab activa */}
      <div>
        {activeTab === "productos"   && <ProductosTab />}
        {activeTab === "categorias"  && <CategoriasTab />}
        {activeTab === "proveedores" && <ProveedoresTab />}
        {activeTab === "compras"     && <ComprasTab />}
      </div>
    </div>
  );
};

export default InventarioPage;
