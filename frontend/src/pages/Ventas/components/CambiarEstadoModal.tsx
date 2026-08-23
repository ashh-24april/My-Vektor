import React, { useState } from "react";
import { X, Save, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { updateEstadoPago, type Venta } from "../../../api/ventas";

interface CambiarEstadoModalProps {
  venta: Venta;
  onClose: () => void;
  onSuccess: () => void;
}

const METODOS_PAGO = [
  "Transferencia Bancaria",
  "Efectivo",
  "Cheque",
  "Tarjeta de Crédito/Débito",
  "Depósito Bancario",
  "Crédito a Plazo"
];

const CambiarEstadoModal: React.FC<CambiarEstadoModalProps> = ({ venta, onClose, onSuccess }) => {
  const [estado, setEstado] = useState<"Pagada" | "Pendiente" | "Anulada">(venta.estado_pago);
  const [metodo, setMetodo] = useState(venta.metodo_pago || "Transferencia Bancaria");
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().split("T")[0]);
  const [observaciones, setObservaciones] = useState(venta.observaciones || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateEstadoPago(venta.id_venta, {
        estado_pago: estado,
        metodo_pago: estado === "Pagada" ? metodo : undefined,
        fecha_pago: estado === "Pagada" ? fechaPago : undefined,
        observaciones: observaciones.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al actualizar estado de pago.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-gray-900">Actualizar Estado de Factura</h3>
            <p className="text-xs text-gray-500">
              {venta.folio_factura || `ID #${venta.id_venta}`} · Q {venta.total.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selector de Estado */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Nuevo Estado de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEstado("Pagada")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  estado === "Pagada"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pagada</span>
              </button>

              <button
                type="button"
                onClick={() => setEstado("Pendiente")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  estado === "Pendiente"
                    ? "border-amber-500 bg-amber-50 text-amber-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pendiente</span>
              </button>

              <button
                type="button"
                onClick={() => setEstado("Anulada")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  estado === "Anulada"
                    ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Anulada</span>
              </button>
            </div>
          </div>

          {/* Opciones cuando está marcada como Pagada */}
          {estado === "Pagada" && (
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Cobro / Pago
                </label>
                <input
                  type="date"
                  required
                  value={fechaPago}
                  onChange={e => setFechaPago(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Método de Pago Recibido
                </label>
                <select
                  value={metodo}
                  onChange={e => setMetodo(e.target.value)}
                  className={inputCls}
                >
                  {METODOS_PAGO.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Advertencia si se Anula */}
          {estado === "Anulada" && (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
              ⚠️ Esta factura quedará invalidada en los reportes contables y el monto total no sumará al flujo de ingresos.
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notas / Observaciones del Cambio
            </label>
            <textarea
              rows={2}
              placeholder="Número de cheque, referencia de transferencia bancaria..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className={inputCls}
            />
          </div>

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
              {saving ? "Guardando..." : "Actualizar Estado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CambiarEstadoModal;
