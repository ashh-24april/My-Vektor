import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Wrench, Truck, User, Calendar, AlertCircle } from "lucide-react";
import {
  createOrden,
  getMecanicaAuxiliares,
  type VehiculoAux,
  type MecanicoAux,
  type PilotoAux,
  type CreateOTPayload
} from "../../../api/mecanica";

interface OTFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_MANTENIMIENTO = ["Preventivo", "Correctivo", "Emergencia"];

const OTFormModal: React.FC<OTFormModalProps> = ({ onClose, onSuccess }) => {
  const [vehiculos, setVehiculos] = useState<VehiculoAux[]>([]);
  const [mecanicos, setMecanicos] = useState<MecanicoAux[]>([]);
  const [pilotos, setPilotos] = useState<PilotoAux[]>([]);
  const [loadingAux, setLoadingAux] = useState(true);

  // Form State
  const [idVehiculo, setIdVehiculo] = useState<number | "">("");
  const [idMecanico, setIdMecanico] = useState<number | "">("");
  const [idPiloto, setIdPiloto] = useState<number | "">("");
  const [tipoMantenimiento, setTipoMantenimiento] = useState("Preventivo");
  const [diagnostico, setDiagnostico] = useState("");
  const [kmEntrada, setKmEntrada] = useState<number | "">("");
  const [costoManoObra, setCostoManoObra] = useState<number | "">("");

  const [fechaIngreso, setFechaIngreso] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaEstimada, setFechaEstimada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [observaciones, setObservaciones] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMecanicaAuxiliares()
      .then(data => {
        setVehiculos(data.vehiculos || []);
        setMecanicos(data.mecanicos || []);
        setPilotos(data.pilotos || []);
      })
      .catch(() => {})
      .finally(() => setLoadingAux(false));
  }, []);

  // Al seleccionar un vehículo, autocompletar su kilometraje actual
  const handleSelectVehiculo = (id: number | "") => {
    setIdVehiculo(id);
    if (id) {
      const v = vehiculos.find(item => item.id_vehiculo === id);
      if (v && v.kilometraje) {
        setKmEntrada(v.kilometraje);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idVehiculo) {
      setError("Selecciona el vehículo que ingresará a taller.");
      return;
    }
    if (!idMecanico) {
      setError("Asigna un mecánico responsable para la orden.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateOTPayload = {
        id_vehiculo: Number(idVehiculo),
        id_mecanico: Number(idMecanico),
        id_piloto: idPiloto ? Number(idPiloto) : null,
        tipo_mantenimiento: tipoMantenimiento,
        diagnostico_inicial: diagnostico.trim() || undefined,
        km_entrada: kmEntrada ? Number(kmEntrada) : null,
        fecha_ingreso: fechaIngreso,
        fecha_estimada_entrega: fechaEstimada || undefined,
        costo_mano_obra: typeof costoManoObra === "number" ? costoManoObra : parseFloat(String(costoManoObra)) || 0,
        observaciones: observaciones.trim() || undefined
      };

      await createOrden(payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al crear la orden de trabajo.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nueva Orden de Trabajo (OT)</h2>
              <p className="text-xs text-gray-500">
                Ingreso de unidad a taller y asignación de diagnóstico de mantenimiento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SECCIÓN 1: Vehículo y Tipo de Servicio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" /> Unidad / Vehículo *
              </label>
              <select
                required
                value={idVehiculo}
                onChange={e => handleSelectVehiculo(e.target.value ? Number(e.target.value) : "")}
                className={inputCls}
                disabled={loadingAux}
              >
                <option value="">-- Seleccionar vehículo --</option>
                {vehiculos.map(v => (
                  <option key={v.id_vehiculo} value={v.id_vehiculo}>
                    {v.placa} · {v.marca} {v.modelo} {v.tipo ? `(${v.tipo})` : ""} · Estado: {v.estado}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tipo de Mantenimiento *
              </label>
              <select
                value={tipoMantenimiento}
                onChange={e => setTipoMantenimiento(e.target.value)}
                className={inputCls}
              >
                {TIPOS_MANTENIMIENTO.map(t => (
                  <option key={t} value={t}>
                    {t === "Preventivo" ? "🛡️ Preventivo (Servicio programado)" : t === "Correctivo" ? "🔧 Correctivo (Reparación de falla)" : "🚨 Emergencia en Ruta"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECCIÓN 2: Asignación de Personal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-blue-600" /> Mecánico Asignado *
              </label>
              <select
                required
                value={idMecanico}
                onChange={e => setIdMecanico(e.target.value ? Number(e.target.value) : "")}
                className={inputCls}
                disabled={loadingAux}
              >
                <option value="">-- Seleccionar mecánico responsable --</option>
                {mecanicos.map(m => (
                  <option key={m.id_mecanico} value={m.id_mecanico}>
                    {m.nombre} {m.apellido} {m.especialidad ? `(${m.especialidad})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" /> Piloto que Reporta (Opcional)
              </label>
              <select
                value={idPiloto}
                onChange={e => setIdPiloto(e.target.value ? Number(e.target.value) : "")}
                className={inputCls}
                disabled={loadingAux}
              >
                <option value="">-- Sin piloto asignado --</option>
                {pilotos.map(p => (
                  <option key={p.id_piloto} value={p.id_piloto}>
                    {p.nombre} {p.apellido}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECCIÓN 3: Diagnóstico y Kilometraje */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Diagnóstico Inicial / Síntomas Reportados *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe la falla, ruido, fuga o tarea programada (ej. Cambio de aceite, revisión de frenos traseros, calibración de válvulas)..."
                value={diagnostico}
                onChange={e => setDiagnostico(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kilometraje al Ingreso (km)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej. 145000"
                  value={kmEntrada}
                  onChange={e => setKmEntrada(e.target.value ? parseInt(e.target.value) : "")}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Costo Estimado Mano de Obra (Q)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costoManoObra}
                  onChange={e => setCostoManoObra(e.target.value ? parseFloat(e.target.value) : "")}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Fechas y Estimaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Fecha de Ingreso *
              </label>
              <input
                type="date"
                required
                value={fechaIngreso}
                onChange={e => setFechaIngreso(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Fecha Estimada de Salida
              </label>
              <input
                type="date"
                value={fechaEstimada}
                onChange={e => setFechaEstimada(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Observaciones Adicionales
              </label>
              <input
                type="text"
                placeholder="Herramientas especiales requeridas, nivel de combustible al ingreso, etc."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Mensaje Informativo */}
          <div className="flex items-start gap-2 p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] text-blue-900">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Al crear la Orden de Trabajo, la unidad pasará automáticamente a estado <strong>"En Mantenimiento"</strong> y se iniciará el conteo de tiempo en taller.
            </span>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Creando OT..." : "Crear Orden de Trabajo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTFormModal;
