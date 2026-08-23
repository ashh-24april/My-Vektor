import React, { useState } from "react";
import { TrendingUp } from "lucide-react";
import { type ComparativoMensual } from "../../../api/dashboard";

interface GraficoComparativoProps {
  data: ComparativoMensual[];
}

const GraficoComparativo: React.FC<GraficoComparativoProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-gray-400">
        Sin datos históricos suficientes para mostrar el comparativo.
      </div>
    );
  }

  // Encontrar el valor máximo para escalar las barras
  const maxVal = Math.max(...data.flatMap(d => [d.ingresos, d.costos]), 1000);

  return (
    <div className="space-y-4">
      {/* Header y Leyenda */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Ingresos vs. Costos de Taller</h3>
            <p className="text-[11px] text-gray-500">Histórico de facturación y mantenimiento (últimos 6 meses)</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="w-3 h-3 rounded-md bg-[#041954]" />
            Ingresos Ventas
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            Costos Mecánica
          </span>
        </div>
      </div>

      {/* Gráfico de Barras SVG Interactivo */}
      <div className="relative pt-6 pb-2">
        <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-52 border-b border-gray-200 px-2">
          {data.map((item, idx) => {
            const hIngresos = Math.min(100, Math.max(8, (item.ingresos / maxVal) * 100));
            const hCostos = Math.min(100, Math.max(6, (item.costos / maxVal) * 100));
            const isHovered = hoverIndex === idx;

            return (
              <div
                key={item.mes}
                className="relative flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Tooltip flotante */}
                {isHovered && (
                  <div className="absolute -top-14 z-20 bg-gray-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl whitespace-nowrap animate-fade-in pointer-events-none">
                    <p className="font-bold border-b border-gray-700 pb-1 mb-1">{item.mes}</p>
                    <p className="text-blue-300">Ingresos: Q{item.ingresos.toLocaleString()}</p>
                    <p className="text-amber-300">Costos: Q{item.costos.toLocaleString()}</p>
                    <p className="text-emerald-300 font-bold">Margen: Q{item.margen.toLocaleString()}</p>
                  </div>
                )}

                {/* Par de Barras */}
                <div className="flex items-end gap-1.5 w-full justify-center">
                  {/* Barra Ingresos */}
                  <div
                    style={{ height: `${hIngresos}%` }}
                    className={`w-4 sm:w-7 rounded-t-lg transition-all duration-300 ${
                      isHovered ? "bg-[#092C92] scale-y-105 shadow-md" : "bg-[#041954]"
                    }`}
                  />
                  {/* Barra Costos */}
                  <div
                    style={{ height: `${hCostos}%` }}
                    className={`w-4 sm:w-7 rounded-t-lg transition-all duration-300 ${
                      isHovered ? "bg-amber-600 scale-y-105 shadow-md" : "bg-amber-400"
                    }`}
                  />
                </div>

                {/* Etiqueta del Mes */}
                <span className="text-[10px] font-bold text-gray-500 mt-2 truncate max-w-full text-center">
                  {item.mes}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen Inferior */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/60">
          <span className="text-gray-500 text-[10px] uppercase font-bold block">Promedio Ingresos</span>
          <p className="text-sm font-black text-[#041954] mt-0.5">
            Q {(data.reduce((s, d) => s + d.ingresos, 0) / data.length).toLocaleString("es-GT", { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/60">
          <span className="text-gray-500 text-[10px] uppercase font-bold block">Promedio Costos Taller</span>
          <p className="text-sm font-black text-amber-900 mt-0.5">
            Q {(data.reduce((s, d) => s + d.costos, 0) / data.length).toLocaleString("es-GT", { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60 col-span-2 sm:col-span-1">
          <span className="text-gray-500 text-[10px] uppercase font-bold block">Margen Neto Acumulado</span>
          <p className="text-sm font-black text-emerald-800 mt-0.5">
            Q {data.reduce((s, d) => s + d.margen, 0).toLocaleString("es-GT", { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GraficoComparativo;
