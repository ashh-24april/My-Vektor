
import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  DollarSign,
  Fuel,
  Plus,
  Trash2,
  CheckCircle2,
  Gauge,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  registrarGastoViaje,
  eliminarGastoViaje,
  updateViajeEstado,
  type Viaje,
  type CategoriaGasto,
} from "../../../api/viajes";

interface LiquidacionModalProps {
  viaje: Viaje;
  onClose: () => void;
  onSuccess: () => void;
  canEdit?: boolean;
}

const CATEGORIAS_GASTO: CategoriaGasto[] = [
  "Combustible",
  "Viáticos",
  "Peajes",
  "Mantenimiento en Ruta",
  "Otros",
];

const LiquidacionModal: React.FC<LiquidacionModalProps> = ({
  viaje,
  onClose,
  onSuccess,
  canEdit = true,
}) => {
  const [gastos, setGastos] = useState(viaje.gastos || []);
  const [kmFinal, setKmFinal] = useState<string>(viaje.km_final ? String(viaje.km_final) : "");

  // Form nuevo gasto
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [gastoForm, setGastoForm] = useState({
    categoria:       "Combustible" as CategoriaGasto,
    concepto:        "",
    monto:           "",
    galones:         "",
    odometro_km:     "",
    num_comprobante: "",
  });

  const [loadingGasto, setLoadingGasto] = useState(false);
  const [loadingEstado, setLoadingEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kmInicial = viaje.km_inicial || 0;
  const kmFinalNum = parseInt(kmFinal, 10) || 0;
  const kmRecorridos = kmFinalNum >= kmInicial ? kmFinalNum - kmInicial : 0;

  // Totales acumulados
  const { totalGastos, totalGalones } = useMemo(() => {
    let gastosSum = 0;
    let galonesSum = 0;

    for (const g of gastos) {
      const m = Number(g.monto || 0);
      gastosSum += m;
      if (g.categoria === "Combustible") {
        galonesSum += Number(g.galones || 0);
      }
    }

    return { totalGastos: gastosSum, totalGalones: galonesSum };
  }, [gastos]);

  const gananciaNeta = Number(viaje.monto_flete || 0) - totalGastos;
  const rendimiento = totalGalones > 0 && kmRecorridos > 0
    ? Math.round((kmRecorridos / totalGalones) * 100) / 100
    : 0;

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimals = true) => {
    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
    if (!allowDecimals && (e.key === "." || e.key === ",")) e.preventDefault();
  };

  const handleAddGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoForm.concepto.trim()) return setError("El concepto del gasto es requerido.");
    if (!gastoForm.monto || parseFloat(gastoForm.monto) <= 0) return setError("El monto debe ser mayor a 0.");

    setLoadingGasto(true);
    setError(null);
    try {
      const nuevoGasto = await registrarGastoViaje(viaje.id_viaje, {
        categoria:       gastoForm.categoria,
        concepto:        gastoForm.concepto.trim(),
        monto:           parseFloat(gastoForm.monto),
        galones:         gastoForm.galones ? parseFloat(gastoForm.galones) : null,
        odometro_km:     gastoForm.odometro_km ? parseInt(gastoForm.odometro_km, 10) : null,
        num_comprobante: gastoForm.num_comprobante.trim() || null,
      });

      setGastos(prev => [nuevoGasto, ...prev]);
      setGastoForm({
        categoria: "Combustible",
        concepto: "",
        monto: "",
        galones: "",
        odometro_km: "",
        num_comprobante: "",
      });
      setShowAddGasto(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al agregar gasto.");
    } finally {
      setLoadingGasto(false);
    }
  };

  const handleDeleteGasto = async (idGasto: number) => {
    if (!window.confirm("¿Eliminar este registro de gasto?")) return;
    try {
      await eliminarGastoViaje(viaje.id_viaje, idGasto);
      setGastos(prev => prev.filter(g => g.id_gasto !== idGasto));
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al eliminar gasto.");
    }
  };

  const handleCambiarEstado = async (nuevoEstado: "Completado" | "Liquidado") => {
    setLoadingEstado(true);
    try {
      await updateViajeEstado(viaje.id_viaje, {
        estado: nuevoEstado,
        km_final: kmFinalNum > 0 ? kmFinalNum : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al actualizar estado.");
    } finally {
      setLoadingEstado(false);
    }
  };

  const inputCls = `w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 font-medium
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-400`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Liquidación de Viaje: {viaje.codigo_viaje}
              </h2>
              <p className="text-xs text-gray-500">
                {viaje.origen} &rarr; {viaje.destino} · Unidad {viaje.vehiculo?.placa}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Tarjetas de Resumen Financiero y Rendimiento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/70">
              <span className="text-[11px] font-semibold text-blue-900">Monto Flete (Ingreso)</span>
              <p className="text-lg font-black text-blue-950 mt-1">Q {Number(viaje.monto_flete || 0).toFixed(2)}</p>
            </div>

            <div className="p-3.5 bg-red-50/60 rounded-2xl border border-red-200/70">
              <span className="text-[11px] font-semibold text-red-900">Gastos Totales</span>
              <p className="text-lg font-black text-red-800 mt-1">Q {totalGastos.toFixed(2)}</p>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/70">
              <span className="text-[11px] font-semibold text-emerald-900">Margen / Utilidad</span>
              <p className={`text-lg font-black mt-1 ${gananciaNeta >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                Q {gananciaNeta.toFixed(2)}
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/70">
              <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5" /> Rendimiento
              </span>
              <p className="text-lg font-black text-amber-900 mt-1">
                {rendimiento > 0 ? `${rendimiento} KM/G` : "—"}
              </p>
            </div>
          </div>

          {/* Odómetro Final y KM Recorridos */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-xs font-bold text-gray-800">Lectura de Odómetro (KM)</span>
                <p className="text-[11px] text-gray-500">
                  Inicial: <strong>{kmInicial.toLocaleString()} KM</strong> · Recorrido: <strong>{kmRecorridos.toLocaleString()} KM</strong>
                </p>
              </div>
            </div>

            <div className="w-full sm:w-48">
              <input
                type="text"
                inputMode="numeric"
                value={kmFinal}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => setKmFinal(e.target.value.replace(/\D/g, ""))}
                placeholder="KM Final de Llegada"
                disabled={!canEdit}
                className={`${inputCls} text-right font-bold`}
              />
            </div>
          </div>

          {/* Sección de Gastos Registrados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Desglose de Gastos y Comprobantes ({gastos.length})</span>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowAddGasto(!showAddGasto)}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddGasto ? "Cerrar Formulario" : "Agregar Gasto"}</span>
                </button>
              )}
            </div>

            {/* Formulario Inline para Registrar Gasto */}
            {showAddGasto && (
              <form onSubmit={handleAddGasto} className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/80 space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Categoría</label>
                    <select
                      value={gastoForm.categoria}
                      onChange={e => setGastoForm(prev => ({ ...prev, categoria: e.target.value as CategoriaGasto }))}
                      className={inputCls}
                    >
                      {CATEGORIAS_GASTO.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Concepto / Detalle *</label>
                    <input
                      value={gastoForm.concepto}
                      onChange={e => setGastoForm(prev => ({ ...prev, concepto: e.target.value }))}
                      placeholder="Ej. Combustible Diesel Puma Km 85"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Monto Pagado (Q) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gastoForm.monto}
                      onKeyDown={e => handleNumericKeyDown(e, true)}
                      onChange={e => setGastoForm(prev => ({ ...prev, monto: e.target.value }))}
                      placeholder="0.00"
                      className={`${inputCls} font-bold text-blue-900`}
                    />
                  </div>
                </div>

                {gastoForm.categoria === "Combustible" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Galones Despachados</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={gastoForm.galones}
                        onKeyDown={e => handleNumericKeyDown(e, true)}
                        onChange={e => setGastoForm(prev => ({ ...prev, galones: e.target.value }))}
                        placeholder="Ej. 45.5"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">No. Comprobante / Factura</label>
                      <input
                        value={gastoForm.num_comprobante}
                        onChange={e => setGastoForm(prev => ({ ...prev, num_comprobante: e.target.value }))}
                        placeholder="Ej. FAC-8912"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGasto(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingGasto}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl shadow-xs"
                  >
                    {loadingGasto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar Gasto"}
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Gastos */}
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
              {gastos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No se han registrado gastos para este viaje.</p>
              ) : (
                gastos.map(g => (
                  <div key={g.id_gasto} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{g.concepto}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {g.categoria}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {g.galones ? `${g.galones} galones · ` : ""}
                        {g.num_comprobante ? `Comprobante: ${g.num_comprobante} · ` : ""}
                        {new Date(g.fecha).toLocaleDateString("es-GT")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-gray-900">Q {Number(g.monto || 0).toFixed(2)}</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGasto(g.id_gasto)}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de Finalización / Liquidación */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
            >
              Cerrar
            </button>

            {canEdit && (
              <div className="flex items-center gap-2">
                {viaje.estado !== "Completado" && viaje.estado !== "Liquidado" && (
                  <button
                    type="button"
                    disabled={loadingEstado}
                    onClick={() => handleCambiarEstado("Completado")}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marcar Completado</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={loadingEstado}
                  onClick={() => handleCambiarEstado("Liquidado")}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Liquidar Viaje</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LiquidacionModal;
