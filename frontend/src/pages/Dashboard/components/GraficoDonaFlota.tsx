import React, { useState } from "react";
import { Truck } from "lucide-react";
import { type DistribucionFlotaItem } from "../../../api/dashboard";

interface GraficoDonaFlotaProps {
  data: DistribucionFlotaItem[];
  totalVehiculos: number;
}

const GraficoDonaFlota: React.FC<GraficoDonaFlotaProps> = ({ data, totalVehiculos }) => {
  const [hoverItem, setHoverItem] = useState<string | null>(null);

  const radio = 36;
  const circunferencia = 2 * Math.PI * radio;
  let offsetAcumulado = 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Truck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Estado de la Flota</h3>
          <p className="text-[11px] text-gray-500">Distribución de camiones y unidades activas</p>
        </div>
      </div>

      {/* Donut SVG y Leyenda */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Círculo de Fondo */}
            <circle
              cx="50"
              cy="50"
              r={radio}
              className="stroke-gray-100"
              strokeWidth="12"
              fill="transparent"
            />

            {/* Segmentos de la Dona */}
            {totalVehiculos > 0 &&
              data.map(item => {
                const porcentaje = item.value / totalVehiculos;
                const dashLength = porcentaje * circunferencia;
                const currentOffset = offsetAcumulado;
                offsetAcumulado += dashLength;

                const isSelected = hoverItem === item.name;

                return (
                  <circle
                    key={item.name}
                    cx="50"
                    cy="50"
                    r={radio}
                    stroke={item.color}
                    strokeWidth={isSelected ? "14" : "12"}
                    strokeDasharray={`${dashLength} ${circunferencia - dashLength}`}
                    strokeDashoffset={-currentOffset}
                    fill="transparent"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoverItem(item.name)}
                    onMouseLeave={() => setHoverItem(null)}
                  />
                );
              })}
          </svg>

          {/* Contador Central */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-[#041954]">{totalVehiculos}</span>
            <span className="text-[10px] uppercase font-bold text-gray-400">Unidades</span>
          </div>
        </div>

        {/* Lista de Estados y Porcentajes */}
        <div className="space-y-2.5 w-full sm:w-48 text-xs">
          {data.map(item => {
            const pct = totalVehiculos > 0 ? Math.round((item.value / totalVehiculos) * 100) : 0;
            const isSelected = hoverItem === item.name;

            return (
              <div
                key={item.name}
                onMouseEnter={() => setHoverItem(item.name)}
                onMouseLeave={() => setHoverItem(null)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                  isSelected ? "bg-slate-100/90 scale-102" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-gray-900">{item.value}</span>
                  <span className="text-[10px] text-gray-400 ml-1">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GraficoDonaFlota;
