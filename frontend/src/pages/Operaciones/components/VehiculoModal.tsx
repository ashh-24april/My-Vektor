
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Save,
  Loader2,
  Truck,
  ShieldCheck,
  Calendar,
  UserCheck,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import {
  createVehiculo,
  updateVehiculo,
  getPilotos,
  type Vehiculo,
  type Piloto,
  type TipoVehiculo,
  type EstadoVehiculo,
} from "../../../api/operaciones";

interface VehiculoModalProps {
  vehiculo: Vehiculo | null;
  onClose: () => void;
  onSuccess: (v: Vehiculo) => void;
  canEdit?: boolean;
}

const TIPOS: TipoVehiculo[] = [
  "Cabezal",
  "Camión Rígido",
  "Remolque/Cisterna",
  "Plataforma",
  "Furgón",
  "Pickup",
];

const ESTADOS: { value: EstadoVehiculo; label: string; color: string }[] = [
  { value: "Disponible", label: "Disponible para Viaje", color: "text-emerald-700 bg-emerald-50" },
  { value: "En Ruta", label: "En Ruta / Viaje Activo", color: "text-blue-700 bg-blue-50" },
  { value: "En Mantenimiento", label: "En Mantenimiento / Taller", color: "text-amber-700 bg-amber-50" },
  { value: "Fuera de Servicio", label: "Fuera de Servicio / Inactivo", color: "text-red-700 bg-red-50" },
];

const VehiculoModal: React.FC<VehiculoModalProps> = ({
  vehiculo,
  onClose,
  onSuccess,
  canEdit = true,
}) => {
  const isEdit = !!vehiculo;

  const [form, setForm] = useState({
    placa:              vehiculo?.placa              ?? "",
    marca:              vehiculo?.marca              ?? "",
    modelo:             vehiculo?.modelo             ?? "",
    anio:               vehiculo?.anio               ? String(vehiculo.anio) : String(new Date().getFullYear()),
    tipo:               (vehiculo?.tipo as TipoVehiculo) ?? "Cabezal",
    color:              vehiculo?.color              ?? "",
    num_motor:          vehiculo?.num_motor          ?? "",
    num_chasis:         vehiculo?.num_chasis         ?? "",
    capacidad_carga:    vehiculo?.capacidad_carga    ? String(vehiculo.capacidad_carga) : "",
    kilometraje:        vehiculo?.kilometraje !== undefined ? String(vehiculo.kilometraje) : "0",
    horometro:          vehiculo?.horometro !== undefined && vehiculo?.horometro !== null ? String(vehiculo.horometro) : "0",
    rendimiento_km_l:   vehiculo?.rendimiento_km_l   ? String(vehiculo.rendimiento_km_l) : "",
    estado:             (vehiculo?.estado as EstadoVehiculo) ?? "Disponible",
    venc_circulacion:   vehiculo?.venc_circulacion   ? vehiculo.venc_circulacion.split("T")[0] : "",
    venc_seguro:        vehiculo?.venc_seguro        ? vehiculo.venc_seguro.split("T")[0] : "",
    venc_revision:      vehiculo?.venc_revision      ? vehiculo.venc_revision.split("T")[0] : "",
    id_piloto_asignado: vehiculo?.id_piloto_asignado ? String(vehiculo.id_piloto_asignado) : "",
    foto_url:           vehiculo?.foto_url           ?? "",
  });

  const [pilotos, setPilotos] = useState<Piloto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    getPilotos({ limit: 100 })
      .then(res => setPilotos(res.pilotos))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Saneamiento de teclas y bloqueo de negativos / caracteres inválidos
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimals = false) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
    if (!allowDecimals && (e.key === "." || e.key === ",")) {
      e.preventDefault();
    }
  };

  const handleNumericChange = (fieldName: "anio" | "kilometraje" | "horometro" | "capacidad_carga" | "rendimiento_km_l", rawValue: string, allowDecimals = false) => {
    let val = rawValue.replace(/,/g, ".");
    if (!allowDecimals) {
      val = val.replace(/\D/g, "");
      if (val.length > 1 && val.startsWith("0")) {
        val = val.replace(/^0+/, "") || "0";
      }
    } else {
      val = val.replace(/[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }
      if (/^0[0-9]/.test(val)) {
        val = val.replace(/^0+/, "");
      }
    }
    setForm(prev => ({ ...prev, [fieldName]: val }));
  };

  const handleNumericBlur = (fieldName: "anio" | "kilometraje" | "horometro", defaultVal: string) => {
    setForm(prev => {
      if (!prev[fieldName] || prev[fieldName].trim() === "") {
        return { ...prev, [fieldName]: defaultVal };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim()) return setError("La placa es obligatoria.");
    if (!form.marca.trim()) return setError("La marca es obligatoria.");
    if (!form.modelo.trim()) return setError("El modelo es obligatorio.");

    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Vehiculo> = {
        placa:              form.placa.trim().toUpperCase(),
        marca:              form.marca.trim(),
        modelo:             form.modelo.trim(),
        anio:               parseInt(form.anio, 10) || new Date().getFullYear(),
        tipo:               form.tipo,
        color:              form.color.trim() || null,
        num_motor:          form.num_motor.trim() || null,
        num_chasis:         form.num_chasis.trim() || null,
        capacidad_carga:    form.capacidad_carga ? parseFloat(form.capacidad_carga) : null,
        kilometraje:        Math.max(0, parseInt(form.kilometraje, 10) || 0),
        horometro:          form.horometro ? Math.max(0, parseInt(form.horometro, 10) || 0) : 0,
        rendimiento_km_l:   form.rendimiento_km_l ? parseFloat(form.rendimiento_km_l) : null,
        estado:             form.estado,
        venc_circulacion:   form.venc_circulacion || null,
        venc_seguro:        form.venc_seguro || null,
        venc_revision:      form.venc_revision || null,
        id_piloto_asignado: form.id_piloto_asignado ? parseInt(form.id_piloto_asignado, 10) : null,
        foto_url:           form.foto_url.trim() || null,
      };

      const result = isEdit
        ? await updateVehiculo(vehiculo!.id_vehiculo, payload)
        : await createVehiculo(payload);

      onSuccess(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar el vehículo.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
    placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? `Editar Unidad ${vehiculo!.placa}` : "Registrar Nueva Unidad de Transporte"}
              </h2>
              <p className="text-xs text-gray-500">Ficha técnica vehicular y control operativo de flota</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* Identificación Básica */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Placa Oficial *</label>
              <input
                name="placa"
                value={form.placa}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. C-123XYZ"
                className={`${inputCls} uppercase font-mono font-bold text-blue-900`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Unidad *</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              >
                {TIPOS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Estado Operativo *</label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              >
                {ESTADOS.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marca, Modelo, Año, Color */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Marca *</label>
              <input
                name="marca"
                value={form.marca}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Freightliner"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo *</label>
              <input
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Cascadia 126"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Año Fabricación *</label>
              <input
                type="text"
                inputMode="numeric"
                name="anio"
                value={form.anio}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => handleNumericChange("anio", e.target.value, false)}
                onBlur={() => handleNumericBlur("anio", String(new Date().getFullYear()))}
                disabled={!canEdit}
                placeholder="2024"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Color</label>
              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Blanco / Azul"
                className={inputCls}
              />
            </div>
          </div>

          {/* VIN / Chasis, Motor y Capacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Número de VIN / Chasis</label>
              <input
                name="num_chasis"
                value={form.num_chasis}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="17 dígitos VIN"
                className={`${inputCls} uppercase font-mono text-xs`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Motor</label>
              <input
                name="num_motor"
                value={form.num_motor}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. DD15-89421"
                className={`${inputCls} uppercase font-mono text-xs`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Capacidad Carga (Ton/Gal)</label>
              <input
                type="text"
                inputMode="decimal"
                name="capacidad_carga"
                value={form.capacidad_carga}
                onKeyDown={e => handleNumericKeyDown(e, true)}
                onChange={e => handleNumericChange("capacidad_carga", e.target.value, true)}
                disabled={!canEdit}
                placeholder="Ej. 28.5"
                className={inputCls}
              />
            </div>
          </div>

          {/* Odómetro, Horómetro y Rendimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Odómetro Actual (KM) *</label>
              <input
                type="text"
                inputMode="numeric"
                name="kilometraje"
                value={form.kilometraje}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => handleNumericChange("kilometraje", e.target.value, false)}
                onBlur={() => handleNumericBlur("kilometraje", "0")}
                disabled={!canEdit}
                placeholder="0"
                className={`${inputCls} font-semibold`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Horómetro (Horas)</label>
              <input
                type="text"
                inputMode="numeric"
                name="horometro"
                value={form.horometro}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => handleNumericChange("horometro", e.target.value, false)}
                onBlur={() => handleNumericBlur("horometro", "0")}
                disabled={!canEdit}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rendimiento (KM/Galón)</label>
              <input
                type="text"
                inputMode="decimal"
                name="rendimiento_km_l"
                value={form.rendimiento_km_l}
                onKeyDown={e => handleNumericKeyDown(e, true)}
                onChange={e => handleNumericChange("rendimiento_km_l", e.target.value, true)}
                disabled={!canEdit}
                placeholder="Ej. 7.8"
                className={inputCls}
              />
            </div>
          </div>

          {/* Piloto Principal Asignado */}
          <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#041954] uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Piloto Principal Asignado</span>
            </div>
            <select
              name="id_piloto_asignado"
              value={form.id_piloto_asignado}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputCls}
            >
              <option value="">Sin piloto asignado (Unidad en patio)</option>
              {pilotos.map(p => (
                <option key={p.id_piloto} value={p.id_piloto}>
                  {p.nombre} {p.apellido} — Lic. {p.num_licencia} ({p.tipo_licencia}) [{p.estado}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500">
              Puedes vincular o reasignar el operador responsable de esta unidad de transporte.
            </p>
          </div>

          {/* Fechas de Vencimiento y Documentación Legal */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Vencimiento de Documentación Legal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Tarjeta Circulación</span>
                </label>
                <input
                  type="date"
                  name="venc_circulacion"
                  value={form.venc_circulacion}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  <span>Póliza de Seguro</span>
                </label>
                <input
                  type="date"
                  name="venc_seguro"
                  value={form.venc_seguro}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Revisión Técnica</span>
                </label>
                <input
                  type="date"
                  name="venc_revision"
                  value={form.venc_revision}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? "Guardando..." : isEdit ? "Actualizar Unidad" : "Registrar Unidad"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VehiculoModal;
