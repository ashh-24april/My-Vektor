import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Users,
  DollarSign,
  Clock,
  Wrench,
  Package,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers
} from "lucide-react";
import {
  getDashboardOverview,
  type DashboardOverviewData
} from "../../api/dashboard";
import { useAuthStore } from "../../store/authStore";
import { hasPermission } from "../../types/auth";
import GraficoComparativo from "./components/GraficoComparativo";
import GraficoDonaFlota from "./components/GraficoDonaFlota";
import GraficoTopRepuestos from "./components/GraficoTopRepuestos";
import TablaUltimasOTs from "./components/TablaUltimasOTs";
import TablaRepuestosCriticos from "./components/TablaRepuestosCriticos";

const DashboardOverview: React.FC = () => {
  const { user } = useAuthStore();

  // Permisos granulares
  const canVerVentas = hasPermission(user, "Ventas", "ver");
  const canVerInventario = hasPermission(user, "Inventario", "ver");
  const canVerMecanica = hasPermission(user, "Mecánica", "ver");

  const [periodo, setPeriodo] = useState<"mes_actual" | "trimestre" | "anio_actual">("mes_actual");
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardOverview(periodo);
      setData(res);
    } catch {
      setError("No se pudieron cargar las métricas en tiempo real del dashboard.");
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* BARRA SUPERIOR: FILTRO DE PERIODO Y REFRESCO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#041954]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Panel de Control General</h2>
            <p className="text-xs text-gray-500">Métricas operativas, financieras y de inventario en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Selector de Rango */}
          <div className="relative flex-1 sm:w-48">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value as "mes_actual" | "trimestre" | "anio_actual")}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-white font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="mes_actual">Este Mes</option>
              <option value="trimestre">Último Trimestre</option>
              <option value="anio_actual">Año en Curso</option>
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ERROR O SKELETON */}
      {error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-xs text-red-700 font-medium">
          {error}
        </div>
      ) : loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* SECCIÓN 1: STAT CARDS OPERATIVOS (Visibilidad Universal) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              1. Resumen Operativo de Flota y Personal
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Unidades */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Flota Total Activa
                  </span>
                  <p className="text-2xl font-black text-[#041954] mt-1">{data.operativo.totalVehiculos}</p>
                  <p className="text-[11px] text-gray-500 font-medium mt-1">
                    <span className="text-blue-600 font-bold">{data.operativo.vehiculosEnRuta}</span> en ruta ·{" "}
                    <span className="text-emerald-600 font-bold">{data.operativo.vehiculosDisponibles}</span> disp.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Truck className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Unidades en Taller */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                    Unidades en Taller
                  </span>
                  <p className="text-2xl font-black text-amber-900 mt-1">{data.operativo.vehiculosEnTaller}</p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-1">
                    {data.operativo.otsEnProcesoCount} órdenes en proceso
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Pilotos y Operadores */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    Pilotos Activos
                  </span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{data.operativo.totalPilotos}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {data.operativo.pilotosDisponibles} disponibles para viaje
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 4: Alertas de Stock Crítico */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                    Stock Crítico
                  </span>
                  <p className="text-2xl font-black text-rose-900 mt-1">
                    {data.inventario.repuestosCriticosCount}
                  </p>
                  <p className="text-[11px] text-rose-700 font-semibold mt-1 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Requieren reabastecimiento
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <Package className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: STAT CARDS FINANCIEROS (Visibles solo con permiso de Ventas) */}
          {canVerVentas && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                2. Rendimiento Financiero y Facturación
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ingresos por Ventas */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Ingresos por Fletes / Ventas
                    </span>
                    <p className="text-2xl font-black text-[#041954] mt-1">
                      Q {data.financiero.totalVentasPeriodo.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[11px]">
                      {data.financiero.tendenciaVentas >= 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center">
                          <TrendingUp className="w-3 h-3 mr-0.5" /> +{data.financiero.tendenciaVentas}%
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center">
                          <TrendingDown className="w-3 h-3 mr-0.5" /> {data.financiero.tendenciaVentas}%
                        </span>
                      )}
                      <span className="text-gray-400">vs periodo anterior</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                {/* Facturas Pendientes de Cobro */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                      Pendiente de Cobro
                    </span>
                    <p className="text-2xl font-black text-amber-900 mt-1">
                      Q {data.financiero.totalPendientesMonto.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {data.financiero.totalPendientesCount} facturas activas
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                {/* Costos de Taller */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Inversión en Mantenimiento
                    </span>
                    <p className="text-2xl font-black text-indigo-950 mt-1">
                      Q {data.financiero.totalCostosTaller.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">
                      Repuestos y mano de obra
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Wrench className="w-6 h-6" />
                  </div>
                </div>

                {/* Margen Operativo Estimado */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      Margen Operativo
                    </span>
                    <p className="text-2xl font-black text-emerald-900 mt-1">
                      Q {data.financiero.utilidadEstimada.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Ventas - Costos de Taller
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: GRÁFICOS INTERACTIVOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            {/* Gráfico 1: Comparativo Ingresos vs Costos (ocupa 2 columnas si tiene permiso financiero) */}
            {canVerVentas ? (
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <GraficoComparativo data={data.graficos.comparativoMensual} />
              </div>
            ) : (
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <GraficoTopRepuestos data={data.graficos.topRepuestosConsumo} />
              </div>
            )}

            {/* Gráfico 2: Distribución de Flota por Estado (Dona) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <GraficoDonaFlota
                data={data.graficos.distribucionFlota}
                totalVehiculos={data.operativo.totalVehiculos}
              />
            </div>
          </div>

          {/* Top Repuestos (si canVerVentas es true, se muestra en fila inferior) */}
          {canVerVentas && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <GraficoTopRepuestos data={data.graficos.topRepuestosConsumo} />
            </div>
          )}

          {/* SECCIÓN 4: TABLAS DE ACTIVIDAD RECIENTE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Tabla 1: Últimas Órdenes de Trabajo */}
            {canVerMecanica && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <TablaUltimasOTs ordenes={data.ultimasOTs} />
              </div>
            )}

            {/* Tabla 2: Repuestos Críticos por Reabastecer */}
            {canVerInventario && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <TablaRepuestosCriticos repuestos={data.inventario.repuestosPorReabastecer} />
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DashboardOverview;
