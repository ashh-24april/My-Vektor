import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  Loader2,
  Receipt,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import {
  registrarPagoCobro,
  type TransaccionFinanzas,
  type CuentaPorCobrar,
  type MetodoPago,
} from "../../../api/finanzas";

interface RegistrarPagoModalProps {
  item: TransaccionFinanzas | CuentaPorCobrar | null;
  onClose: () => void;
  onSuccess: (updated: TransaccionFinanzas) => void;
}

const METODOS_PAGO: MetodoPago[] = [
  "Transferencia",
  "Depósito",
  "Cheque",
  "Efectivo",
  "Tarjeta",
];

const RegistrarPagoModal: React.FC<RegistrarPagoModalProps> = ({
  item,
  onClose,
  onSuccess,
}) => {
  const total = item ? Number(("monto_total" in item ? item.monto_total : item.monto) || 0) : 0;
  const pagadoActual = item ? Number(item.monto_pagado || 0) : 0;
  const saldoPendiente = Math.max(0, total - pagadoActual);
  const isIngreso = item && "tipo" in item ? item.tipo === "Ingreso" : true;

  const [montoAbono, setMontoAbono] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Transferencia");
  const [numComprobante, setNumComprobante] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      const tot = Number(("monto_total" in item ? item.monto_total : item.monto) || 0);
      const pag = Number(item.monto_pagado || 0);
      const sal = Math.max(0, tot - pag);
      setMontoAbono(sal > 0 ? String(sal) : "0");
      setMetodoPago("Transferencia");
      setNumComprobante("");
      setObservaciones("");
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  // Saneamiento de teclado numérico: bloqueo de caracteres no deseados
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = parts[0] + "." + parts.slice(1).join("");
    }
    if (/^0[0-9]/.test(clean)) {
      clean = clean.replace(/^0+/, "");
      if (clean === "") clean = "0";
    }
    setMontoAbono(clean);
  };

  const handlePagarTotal = () => {
    setMontoAbono(String(saldoPendiente));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const abonoNum = parseFloat(montoAbono) || 0;
    if (abonoNum <= 0) {
      setError("El monto del abono debe ser mayor a Q0.00");
      return;
    }

    if (abonoNum > saldoPendiente + 0.01) {
      setError(`El monto no puede exceder el saldo pendiente de Q${saldoPendiente.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await registrarPagoCobro(item.id_transaccion, {
        monto_abono: abonoNum,
        metodo_pago: metodoPago,
        num_comprobante: numComprobante.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error("[RegistrarPagoModal Error]", err);
      setError(err?.response?.data?.error || "Error al registrar el cobro/pago.");
    } finally {
      setSubmitting(false);
    }
  };

  const abonoNumber = parseFloat(montoAbono) || 0;
  const nuevoSaldo = Math.max(0, saldoPendiente - abonoNumber);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-paper rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden my-8">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isIngreso ? "Registrar Cobro / Abono" : "Registrar Pago a Proveedor"}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {item.codigo_transaccion} &bull; {item.concepto}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de Cuenta */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border text-center">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Total</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                Q{total.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Pagado</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                Q{pagadoActual.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-amber-600 uppercase">Saldo Pendiente</span>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                Q{saldoPendiente.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Monto del Abono */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Monto del Abono (Q) *
              </label>
              <button
                type="button"
                onClick={handlePagarTotal}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Cobrar saldo completo (Q{saldoPendiente.toFixed(2)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-gray-500">Q</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={montoAbono}
                onKeyDown={handleNumericKeyDown}
                onChange={handleMontoChange}
                className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-900 dark:text-white font-bold text-base rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5 text-gray-500 dark:text-gray-400">
              <span>Nuevo saldo tras este pago:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                Q{nuevoSaldo.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Forma de Pago / Canal
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* No. Comprobante / Boleta */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              No. de Boleta / Referencia Bancaria
            </label>
            <div className="relative">
              <Receipt className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={numComprobante}
                onChange={(e) => setNumComprobante(e.target.value)}
                placeholder="Ej. Transferencia Banrural #894120, Cheque #004"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalle o banco emisor..."
              className="w-full px-3.5 py-2 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium px-5 py-2.5 rounded-xl shadow-sm text-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Cobro / Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RegistrarPagoModal;
