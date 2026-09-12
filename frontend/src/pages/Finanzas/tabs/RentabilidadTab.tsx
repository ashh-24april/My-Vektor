
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Truck,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Fuel,
  Wrench,
  Percent,
} from "lucide-react";
import {
  getRentabilidadVehiculos,
  type RentabilidadVehiculo,
} from "../../../api/finanzas";
import ExportDropdown from "../../../components/ExportDropdown";
import { type ExportColumn } from "../../../utils/exportUtils";

const RentabilidadTab: React.FC = () => {
  const [data, setData] = useState<RentabilidadVehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRentabilidadVehiculos();
      setData(res || []);
    } catch (err) {
      console.error("[RentabilidadTab] Error load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrado local por placa o marca
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase().trim();
    return data.filter(
      (v) =>
        v.placa.toLowerCase().includes(term) ||
        v.marca.toLowerCase().includes(term) ||
        v.modelo.toLowerCase().includes(term) ||
        (v.tipo && v.tipo.toLowerCase().includes(term))
    );
  }, [data, search]);

  // Totales acumulados de la flota
  const totals = useMemo(() => {
    let ing = 0;
    let comb = 0;
    let mec = 0;
    let viat = 0;
    let cost = 0;
    let net = 0;

    for (const v of data) {
      ing += Number(v.total_ingresos || 0);
      comb += Number(v.costo_combustible || 0);
      mec += Number(v.costo_mecanica || 0);
      viat += Number(v.costo_viaticos_ruta || 0);
      cost += Number(v.costo_total || 0);
      net += Number(v.margen_neto || 0);
    }

    const pct = ing > 0 ? (net / ing) * 100 : 0;
    return { ing, comb, mec, viat, cost, net, pct };
  }, [data]);

  // Columnas para exportar a Excel / CSV
  const exportColumns: ExportColumn<RentabilidadVehiculo>[] = [
    { header: "Placa", accessor: (r) => r.placa },
    { header: "Marca", accessor: (r) => r.marca },
    { header: "Modelo", accessor: (r) => r.modelo },
    { header: "Tipo", accessor: (r) => r.tipo || "Cabezal" },
    { header: "Estado", accessor: (r) => r.estado },
    { header: "Total Ingresos Fletes (Q)", accessor: (r) => Number(r.total_ingresos || 0).toFixed(2) },
    { header: "Costo Combustible (Q)", accessor: (r) => Number(r.costo_combustible || 0).toFixed(2) },
    { header: "Costo Mecánica / Taller (Q)", accessor: (r) => Number(r.costo_mecanica || 0).toFixed(2) },
    { header: "Viáticos y Peajes (Q)", accessor: (r) => Number(r.costo_viaticos_ruta || 0).toFixed(2) },
    { header: "Costo Total Acumulado (Q)", accessor: (r) => Number(r.costo_total || 0).toFixed(2) },
    { header: "Margen Neto (Q)", accessor: (r) => Number(r.margen_neto || 0).toFixed(2) },
    { header: "Margen Neto (%)", accessor: (r) => `${Number(r.margen_porcentaje || 0).toFixed(2)}%` },
  ];

  return (
    <div className="space-y-4">
      {/* Tarjetas de Resumen Global de la Flota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Ingresos Totales Flota
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {totals.ing.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Fletes y viajes liquidados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Costos Combustible */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Costo Combustible
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {totals.comb.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <Fuel className="w-3 h-3 text-rose-500" /> Consumo acumulado en ruta
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Fuel className="w-6 h-6" />
          </div>
        </div>

        {/* Costo Taller / Mecánica */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Mantenimiento Mecánico
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {totals.mec.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <Wrench className="w-3 h-3 text-blue-500" /> Repuestos y mano de obra
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* Margen Neto Flota */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Margen Neto Flota
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {totals.net.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <Percent className="w-3 h-3 text-emerald-500" /> Rendimiento: {totals.pct.toFixed(1)}% margen
            </span>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              totals.net >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, marca o modelo..."
            className="w-full pl-10 pr-4 py-2 bg-white text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium p-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
            title="Refrescar rentabilidad"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <ExportDropdown<RentabilidadVehiculo>
            data={filteredData}
            columns={exportColumns}
            filename="rentabilidad_flota_vehiculos"
            modulo="Finanzas"
            buttonText="Exportar Rentabilidad"
          />
        </div>
      </div>

      {/* Matriz de Rentabilidad por Unidad */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider py-3.5 px-4 border-b border-gray-100">
                <th className="py-3.5 px-4">Unidad / Placa</th>
                <th className="py-3.5 px-4 text-right">Ingresos Fletes</th>
                <th className="py-3.5 px-4 text-right">Combustible</th>
                <th className="py-3.5 px-4 text-right">Mecánica / Taller</th>
                <th className="py-3.5 px-4 text-right">Viáticos / Ruta</th>
                <th className="py-3.5 px-4 text-right">Costo Total</th>
                <th className="py-3.5 px-4 text-right">Margen Neto (Q)</th>
                <th className="py-3.5 px-4 text-center">Margen (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Calculando matriz de costos y rentabilidad...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No se encontraron registros de rentabilidad para las unidades.
                  </td>
                </tr>
              ) : (
                filteredData.map((v) => {
                  const ing = Number(v.total_ingresos || 0);
                  const comb = Number(v.costo_combustible || 0);
                  const mec = Number(v.costo_mecanica || 0);
                  const viat = Number(v.costo_viaticos_ruta || 0);
                  const costTot = Number(v.costo_total || 0);
                  const margenNeto = Number(v.margen_neto || 0);
                  const pct = Number(v.margen_porcentaje || 0);

                  const isProfitable = margenNeto >= 0;

                  return (
                    <tr
                      key={v.id_vehiculo}
                      className="hover:bg-gray-50/60 dark:hover:bg-dark-bg/40 transition-colors"
                    >
                      {/* Unidad / Placa */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gray-100 dark:bg-dark-bg rounded-lg text-gray-700 dark:text-gray-300">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-gray-900 dark:text-white">
                              {v.placa}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {v.marca} {v.modelo} &bull; {v.tipo || "Cabezal"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Ingresos Fletes */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Q{ing.toFixed(2)}
                      </td>

                      {/* Combustible */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
                        Q{comb.toFixed(2)}
                      </td>

                      {/* Mecánica */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
                        Q{mec.toFixed(2)}
                      </td>

                      {/* Viáticos / Ruta */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
                        Q{viat.toFixed(2)}
                      </td>

                      {/* Costo Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-rose-600 dark:text-rose-400">
                        Q{costTot.toFixed(2)}
                      </td>

                      {/* Margen Neto */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-black text-sm">
                        <span className={isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {isProfitable ? "+" : ""}Q{margenNeto.toFixed(2)}
                        </span>
                      </td>

                      {/* Margen % y Barra */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pct >= 30
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                : pct > 0
                                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {pct.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-gray-200 dark:bg-dark-border h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isProfitable ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RentabilidadTab;
