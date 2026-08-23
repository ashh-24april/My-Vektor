import React from "react";
import { Wrench, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { type UltimaOTItem } from "../../../api/dashboard";

interface TablaUltimasOTsProps {
  ordenes: UltimaOTItem[];
}

const ESTADO_BADGE: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Pendiente: { label: "Pendiente", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <Clock className="w-3 h-3" /> },
  "En Proceso": { label: "En Proceso", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: <Wrench className="w-3 h-3" /> },
  Completada: { label: "Completada", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  Cancelada: { label: "Cancelada", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: <AlertCircle className="w-3 h-3" /> }
};

const TablaUltimasOTs: React.FC<TablaUltimasOTsProps> = ({ ordenes }) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Últimas Órdenes de Trabajo</h3>
            <p className="text-[11px] text-gray-500">Mantenimientos y reparaciones recientes de flota</p>
          </div>
        </div>

        <Link
          to="/mecanica"
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Ver todas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabla */}
      {ordenes.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-xs text-gray-400">
          <Wrench className="w-8 h-8 text-gray-300 mb-1" />
          <span>No hay órdenes de trabajo recientes.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">No. OT</th>
                <th className="py-2.5 px-3">Unidad</th>
                <th className="py-2.5 px-3">Mecánico</th>
                <th className="py-2.5 px-3 text-right">Costo</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ordenes.map(o => {
                const badge = ESTADO_BADGE[o.estado] || ESTADO_BADGE.Pendiente;

                return (
                  <tr key={o.id_orden} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded-md">
                        {o.numero_ot}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">{o.placa}</p>
                      <span className="text-[10px] text-gray-400 truncate block max-w-[120px]">
                        {o.vehiculo_desc}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-700 font-medium">{o.mecanico || "Sin asignar"}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">
                      Q {o.costo_total.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.icon}
                        {badge.label}
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

export default TablaUltimasOTs;
