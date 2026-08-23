import React from "react";
import { Package, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { type TopRepuestoConsumo } from "../../../api/dashboard";

interface GraficoTopRepuestosProps {
  data: TopRepuestoConsumo[];
}

const GraficoTopRepuestos: React.FC<GraficoTopRepuestosProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Top Repuestos en Taller</h3>
            <p className="text-[11px] text-gray-500">Insumos de mayor rotación y consumo</p>
          </div>
        </div>
        <div className="h-44 flex flex-col items-center justify-center text-xs text-gray-400">
          <Package className="w-8 h-8 text-gray-300 mb-1" />
          <span>Aún no se registran consumos de repuestos en órdenes de trabajo.</span>
        </div>
      </div>
    );
  }

  const maxCant = Math.max(...data.map(d => d.cantidad), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Top Repuestos en Taller</h3>
            <p className="text-[11px] text-gray-500">Insumos de mayor rotación y consumo</p>
          </div>
        </div>

        <Link
          to="/inventario"
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Ir a Inventario</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Lista de Barras Horizontales */}
      <div className="space-y-3 pt-1">
        {data.map((item, index) => {
          const pct = Math.min(100, Math.max(8, (item.cantidad / maxCant) * 100));

          return (
            <div key={item.id_producto} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
                  <span className="font-mono text-gray-400 mr-1.5">#{index + 1}</span>
                  {item.descripcion}
                </span>
                <span className="font-bold text-[#041954]">
                  {item.cantidad} {item.unidad_medida}s{" "}
                  <span className="text-[11px] text-gray-400 font-normal">
                    (Q{item.total_gastado.toLocaleString()})
                  </span>
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className="h-full bg-gradient-to-r from-[#041954] to-blue-600 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraficoTopRepuestos;
