import React from "react";
import { AlertTriangle, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { type RepuestoCriticoItem } from "../../../api/dashboard";

interface TablaRepuestosCriticosProps {
  repuestos: RepuestoCriticoItem[];
}

const TablaRepuestosCriticos: React.FC<TablaRepuestosCriticosProps> = ({ repuestos }) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Alertas de Stock Crítico</h3>
            <p className="text-[11px] text-gray-500">Repuestos por debajo del nivel mínimo en bodega</p>
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

      {/* Tabla */}
      {repuestos.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-xs text-gray-400">
          <Package className="w-8 h-8 text-emerald-300 mb-1" />
          <span className="text-emerald-700 font-medium">Todos los repuestos tienen niveles óptimos de stock.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Descripción</th>
                <th className="py-2.5 px-3 text-center">Stock / Mínimo</th>
                <th className="py-2.5 px-3 text-right">Déficit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {repuestos.map(r => {
                const deficit = r.stock_minimo - r.stock;

                return (
                  <tr key={r.id_producto} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-gray-700">{r.codigo}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900 line-clamp-1">{r.descripcion}</p>
                      <span className="text-[10px] text-gray-400">{r.categoria}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-rose-600">{r.stock}</span>
                      <span className="text-gray-400 font-normal"> / {r.stock_minimo}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        -{deficit} u.
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TablaRepuestosCriticos;
