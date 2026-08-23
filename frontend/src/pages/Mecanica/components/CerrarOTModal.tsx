import React, { useState } from "react";
import { X, Save, Loader2, CheckCircle2, DollarSign, Wrench, AlertCircle } from "lucide-react";
import { updateEstadoOrden, type OrdenTrabajo } from "../../../api/mecanica";

interface CerrarOTModalProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onSuccess: () => void;
}

const CerrarOTModal: React.FC<CerrarOTModalProps> = ({ orden, onClose, onSuccess }) => {
  const [estado, setEstado] = useState<"Pendiente" | "En Proceso" | "Completada" | "Cancelada">(
    orden.estado === "Pendiente" ? "En Proceso" : "Completada"
  );
  const [manoObra, setManoObra] = useState<number | "">(orden.costo_mano_obra || "");
  const [trabajoRealizado, setTrabajoRealizado] = useState(orden.trabajo_realizado || "");
  const [observaciones, setObservaciones] = useState(orden.observaciones || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const costoRepuestos = Number(orden.costo_repuestos || 0);
  const manoObraNum = typeof manoObra === "number" ? manoObra : parseFloat(String(manoObra)) || 0;
  const costoTotalCalculado = costoRepuestos + manoObraNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === "Completada" && !trabajoRealizado.trim()) {
      setError("Por favor detalla los trabajos o reparaciones realizadas antes de completar la orden.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateEstadoOrden(orden.id_orden, {
        estado,
        costo_mano_obra: manoObraNum,
        trabajo_realizado: trabajoRealizado.trim() || undefined,
        observaciones: observaciones.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al actualizar la orden de trabajo.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Finalizar / Actualizar Orden</h3>
            <p className="text-xs text-gray-500">
              {orden.numero_ot || `OT #${orden.id_orden}`} · Unidad: {orden.vehiculo?.placa} (
              {orden.vehiculo?.marca} {orden.vehiculo?.modelo})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selector de Estado */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Estado de la Orden de Trabajo *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEstado("En Proceso")}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  estado === "En Proceso"
                    ? "border-blue-500 bg-blue-50 text-blue-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>En Proceso</span>
              </button>

              <button
                type="button"
                onClick={() => setEstado("Completada")}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  estado === "Completada"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Completada</span>
              </button>

              <button
                type="button"
                onClick={() => setEstado("Cancelada")}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  estado === "Cancelada"
                    ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Cancelada</span>
              </button>
            </div>
          </div>

          {/* Trabajos Realizados */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Trabajos y Reparaciones Realizadas {estado === "Completada" && "*"}
            </label>
            <textarea
              rows={3}
              required={estado === "Completada"}
              placeholder="Detalle técnico de los trabajos efectuados, pruebas de ruta realizadas, etc."
              value={trabajoRealizado}
              onChange={e => setTrabajoRealizado(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Costos: Mano de Obra y Repuestos */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Mano de Obra (Q)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={manoObra}
                onChange={e => setManoObra(e.target.value ? parseFloat(e.target.value) : "")}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Repuestos Usados (Q)
              </label>
              <div className="px-3.5 py-2.5 bg-gray-100/80 rounded-xl text-sm font-bold text-gray-700">
                Q {costoRepuestos.toFixed(2)}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
              <span className="font-bold text-gray-700 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-blue-600" /> Costo Total de la OT:
              </span>
              <span className="text-base font-black text-[#041954]">
                Q {costoTotalCalculado.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Observaciones Finales */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Observaciones de Entrega / Recomendaciones
            </label>
            <input
              type="text"
              placeholder="Próximo servicio en 10,000 km, pendiente alineación, etc."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className={inputCls}
            />
          </div>

          {estado === "Completada" && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Al completar la orden, la unidad volverá automáticamente al estado <strong>"Disponible"</strong> para nuevas rutas y viajes.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Guardando..." : "Guardar y Actualizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CerrarOTModal;
