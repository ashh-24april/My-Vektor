
import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Clock,
  Plus,
  RefreshCw,
  DollarSign,
  Truck,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import {
  getFinanzasKPIs,
  type FinanzasKPIs,
  type TipoTransaccion,
} from "../../api/finanzas";
import { hasPermission } from "../../types/auth";
import { useAuthStore } from "../../store/authStore";
import TransaccionesTab from "./tabs/TransaccionesTab";
import RentabilidadTab from "./tabs/RentabilidadTab";
import CuentasCobrarTab from "./tabs/CuentasCobrarTab";
import TransaccionModal from "./components/TransaccionModal";

type ActiveTab = "transacciones" | "rentabilidad" | "cuentas_cobrar";

const FinanzasPage: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Finanzas", "crear");

  const [activeTab, setActiveTab] = useState<ActiveTab>("transacciones");
  const [kpis, setKpis] = useState<FinanzasKPIs | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Modal para nueva transacción
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultTipo, setDefaultTipo] = useState<TipoTransaccion>("Ingreso");

  const loadKPIs = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const data = await getFinanzasKPIs();
      setKpis(data);
    } catch (err) {
      console.error("[FinanzasPage] Error load KPIs:", err);
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  const handleOpenNewTransaccion = (tipo: TipoTransaccion = "Ingreso") => {
    setDefaultTipo(tipo);
    setModalOpen(true);
  };

  const handleSuccessNew = () => {
    loadKPIs();
  };

  const ingresosMes = Number(kpis?.ingresos_mes || 0);
  const gastosMes = Number(kpis?.gastos_mes || 0);
  const utilidadNeta = Number(kpis?.utilidad_neta_mes || 0);
  const cuentasCobrar = Number(kpis?.cuentas_por_cobrar || 0);

  const isNetPositive = utilidadNeta >= 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 4 Tarjetas de KPIs Superiores Homologadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingresos del Mes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Ingresos del Mes
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {loadingKpis ? "0.00" : ingresosMes.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Cobros de fletes y ventas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Gastos Operativos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Gastos Operativos
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {loadingKpis ? "0.00" : gastosMes.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-rose-500" /> Combustible, taller y viáticos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Utilidad Neta Consolidada */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Utilidad Neta (Mes)
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {isNetPositive ? "Q " : "-Q "}
              {loadingKpis ? "0.00" : Math.abs(utilidadNeta).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <Calculator className="w-3 h-3 text-blue-500" /> Margen neto consolidado
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Cuentas por Cobrar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Pendientes de Cobro
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {loadingKpis ? "0.00" : cuentasCobrar.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-amber-500" /> Facturas y fletes a crédito
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex space-x-6">
          {/* Tab 1: Flujo de Caja */}
          <button
            onClick={() => setActiveTab("transacciones")}
            className={`flex items-center gap-2 text-sm transition-all pb-3 ${
              activeTab === "transacciones"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-700 font-medium border-b-2 border-transparent"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Flujo de Caja y Transacciones
          </button>

          {/* Tab 2: Rentabilidad por Unidad */}
          <button
            onClick={() => setActiveTab("rentabilidad")}
            className={`flex items-center gap-2 text-sm transition-all pb-3 ${
              activeTab === "rentabilidad"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-700 font-medium border-b-2 border-transparent"
            }`}
          >
            <Truck className="w-4 h-4" />
            Rentabilidad por Vehículo
          </button>

          {/* Tab 3: Cuentas por Cobrar */}
          <button
            onClick={() => setActiveTab("cuentas_cobrar")}
            className={`flex items-center gap-2 text-sm transition-all pb-3 ${
              activeTab === "cuentas_cobrar"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-700 font-medium border-b-2 border-transparent"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Cuentas por Cobrar / Cartera
          </button>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={loadKPIs}
            disabled={loadingKpis}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium p-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
            title="Refrescar métricas financieras"
          >
            <RefreshCw className={`w-4 h-4 ${loadingKpis ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => handleOpenNewTransaccion("Ingreso")}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium px-4 py-2.5 rounded-xl shadow-sm text-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Transacción
            </button>
          )}
        </div>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === "transacciones" && (
        <TransaccionesTab onDataChanged={loadKPIs} />
      )}

      {activeTab === "rentabilidad" && (
        <RentabilidadTab />
      )}

      {activeTab === "cuentas_cobrar" && (
        <CuentasCobrarTab onDataChanged={loadKPIs} />
      )}

      {/* Modal para Nueva Transacción */}
      {modalOpen && (
        <TransaccionModal
          transaccion={null}
          defaultTipo={defaultTipo}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccessNew}
          canEdit={canCreate}
        />
      )}
    </div>
  );
};

export default FinanzasPage;
