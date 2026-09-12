
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Save,
  Loader2,
  Navigation,
  Truck,
  UserCheck,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  Tag,
} from "lucide-react";
import {
  createViaje,
  updateViaje,
  getSiguienteFolioViaje,
  type Viaje,
  type TipoCarga,
  type EstadoViaje,
} from "../../../api/viajes";
import { getVehiculos, getPilotos, type Vehiculo, type Piloto } from "../../../api/operaciones";
import { getVentasAuxiliares, type ClienteAux } from "../../../api/ventas";

interface ViajeModalProps {
  viaje: Viaje | null;
  onClose: () => void;
  onSuccess: (v: Viaje) => void;
  canEdit?: boolean;
}

const TIPOS_CARGA: TipoCarga[] = [
  "Carga Seca",
  "Contenedor",
  "Líquidos/Cisterna",
  "Granel/Materiales",
  "Refrigerada",
  "Vehículos",
];

const ESTADOS_VIAJE: { value: EstadoViaje; label: string; desc: string }[] = [
  { value: "Programado",        label: "Programado",        desc: "Asignado y en espera de salida" },
  { value: "En Ruta",           label: "En Ruta",           desc: "En tránsito hacia el destino" },
  { value: "En Carga/Descarga", label: "En Carga/Descarga", desc: "En patio del cliente u aduana" },
  { value: "Completado",        label: "Completado",        desc: "Viaje finalizado con éxito" },
  { value: "Liquidado",         label: "Liquidado",         desc: "Gastos y viáticos conciliados" },
  { value: "Cancelado",         label: "Cancelado",         desc: "Ruta anulada" },
];

const ViajeModal: React.FC<ViajeModalProps> = ({
  viaje,
  onClose,
  onSuccess,
  canEdit = true,
}) => {
  const isEdit = !!viaje;

  const [form, setForm] = useState({
    codigo_viaje:           viaje?.codigo_viaje           ?? "",
    id_vehiculo:            viaje?.id_vehiculo            ? String(viaje.id_vehiculo) : "",
    id_remolque:            viaje?.id_remolque            ? String(viaje.id_remolque) : "",
    id_piloto:              viaje?.id_piloto              ? String(viaje.id_piloto) : "",
    id_cliente:             viaje?.id_cliente             ? String(viaje.id_cliente) : "",
    tipo_carga:             (viaje?.tipo_carga as TipoCarga) ?? "Carga Seca",
    origen:                 viaje?.origen                 ?? "",
    destino:                viaje?.destino                ?? "",
    escala_puntos:          viaje?.escala_puntos          ?? "",
    descripcion_carga:      viaje?.descripcion_carga      ?? "",
    monto_flete:            viaje?.monto_flete            ? String(viaje.monto_flete) : "",
    anticipo_viaticos:      viaje?.anticipo_viaticos      ? String(viaje.anticipo_viaticos) : "",
    fecha_salida:           viaje?.fecha_salida           ? viaje.fecha_salida.split("T")[0] : new Date().toISOString().split("T")[0],
    fecha_estimada_llegada: viaje?.fecha_estimada_llegada ? viaje.fecha_estimada_llegada.split("T")[0] : "",
    km_inicial:             viaje?.km_inicial !== undefined && viaje?.km_inicial !== null ? String(viaje.km_inicial) : "",
    estado:                 (viaje?.estado as EstadoViaje) ?? "Programado",
    observaciones:          viaje?.observaciones          ?? "",
  });

  const [vehiculos, setVehiculos]   = useState<Vehiculo[]>([]);
  const [pilotos, setPilotos]       = useState<Piloto[]>([]);
  const [clientes, setClientes]     = useState<ClienteAux[]>([]);
  const [loading, setLoading]       = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchCorrelativo = useCallback(async () => {
    if (isEdit) return;
    setGeneratingCode(true);
    try {
      const res = await getSiguienteFolioViaje();
      if (res?.siguienteFolio) {
        setForm(prev => ({ ...prev, codigo_viaje: res.siguienteFolio }));
      }
    } catch {
      setForm(prev => ({ ...prev, codigo_viaje: "VIA-100" }));
    } finally {
      setGeneratingCode(false);
    }
  }, [isEdit]);

  useEffect(() => {
    fetchCorrelativo();
    Promise.all([
      getVehiculos({ limit: 100 }),
      getPilotos({ limit: 100 }),
      getVentasAuxiliares().catch(() => ({ clientes: [], vehiculos: [], productos: [] })),
    ]).then(([vehData, pilData, auxData]) => {
      setVehiculos(vehData.vehiculos);
      setPilotos(pilData.pilotos);
      if (auxData?.clientes) setClientes(auxData.clientes);
    });
  }, [fetchCorrelativo]);

  // Al seleccionar vehículo, pre-cargar el odómetro actual y piloto asignado
  const handleVehiculoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehId = e.target.value;
    setForm(prev => {
      const v = vehiculos.find(item => item.id_vehiculo === Number(vehId));
      return {
        ...prev,
        id_vehiculo: vehId,
        km_inicial: v && !prev.km_inicial ? String(v.kilometraje) : prev.km_inicial,
        id_piloto: v?.id_piloto_asignado && !prev.id_piloto ? String(v.id_piloto_asignado) : prev.id_piloto,
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Saneamiento de inputs numéricos
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimals = false) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
    if (!allowDecimals && (e.key === "." || e.key === ",")) {
      e.preventDefault();
    }
  };

  const handleNumericChange = (fieldName: "monto_flete" | "anticipo_viaticos" | "km_inicial", rawValue: string, allowDecimals = true) => {
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

  const handleNumericBlur = (fieldName: "monto_flete" | "anticipo_viaticos", defaultVal = "0.00") => {
    setForm(prev => {
      if (!prev[fieldName] || prev[fieldName].trim() === "") {
        return { ...prev, [fieldName]: defaultVal };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_viaje.trim()) return setError("El folio de viaje es requerido.");
    if (!form.id_vehiculo) return setError("Selecciona una unidad de transporte.");
    if (!form.id_piloto) return setError("Selecciona un piloto para la ruta.");
    if (!form.origen.trim()) return setError("Indica el origen del viaje.");
    if (!form.destino.trim()) return setError("Indica el destino del viaje.");

    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Viaje> = {
        codigo_viaje:           form.codigo_viaje.trim().toUpperCase(),
        id_vehiculo:            parseInt(form.id_vehiculo, 10),
        id_remolque:            form.id_remolque ? parseInt(form.id_remolque, 10) : null,
        id_piloto:              parseInt(form.id_piloto, 10),
        id_cliente:             form.id_cliente ? parseInt(form.id_cliente, 10) : null,
        tipo_carga:             form.tipo_carga,
        origen:                 form.origen.trim(),
        destino:                form.destino.trim(),
        escala_puntos:          form.escala_puntos?.trim() || null,
        descripcion_carga:      form.descripcion_carga?.trim() || null,
        monto_flete:            Math.max(0, parseFloat(form.monto_flete) || 0),
        anticipo_viaticos:      Math.max(0, parseFloat(form.anticipo_viaticos) || 0),
        fecha_salida:           form.fecha_salida,
        fecha_estimada_llegada: form.fecha_estimada_llegada || null,
        km_inicial:             form.km_inicial ? Math.max(0, parseInt(form.km_inicial, 10) || 0) : null,
        estado:                 form.estado,
        observaciones:          form.observaciones?.trim() || null,
      };

      const result = isEdit
        ? await updateViaje(viaje!.id_viaje, payload)
        : await createViaje(payload);

      onSuccess(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar el viaje.");
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
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center text-[#041954]">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? `Editar Viaje ${viaje!.codigo_viaje}` : "Nueva Orden de Viaje y Flete"}
              </h2>
              <p className="text-xs text-gray-500">Programación de ruta, asignación y manifiesto de carga</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* Folio Correlativo + Cliente + Tipo de Carga */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Folio de Viaje *</span>
              </label>
              <div className="relative">
                <input
                  name="codigo_viaje"
                  value={form.codigo_viaje}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder={generatingCode ? "Generando..." : "Ej. VIA-100"}
                  className={`${inputCls} uppercase font-mono font-bold text-blue-900 bg-blue-50/30 border-blue-200`}
                />
                {generatingCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Cliente Solicitante</span>
              </label>
              <select
                name="id_cliente"
                value={form.id_cliente}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              >
                <option value="">Cliente general / Ocasional</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombre} {c.nit ? `(${c.nit})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Carga *</label>
              <select
                name="tipo_carga"
                value={form.tipo_carga}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              >
                {TIPOS_CARGA.map(tc => (
                  <option key={tc} value={tc}>{tc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Origen, Destino y Puntos de Escala */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-gray-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Itinerario y Ruta Logística</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Punto de Origen *</label>
                <input
                  name="origen"
                  value={form.origen}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder="Ej. Puerto Quetzal, Escuintla"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Punto de Destino *</label>
                <input
                  name="destino"
                  value={form.destino}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder="Ej. Bodegas Centrales, Cd. Guatemala"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Puntos de Escala / Paradas Intermedias</label>
              <input
                name="escala_puntos"
                value={form.escala_puntos}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Aduana El Florido / Estación Gasolinera Km 45"
                className={inputCls}
              />
            </div>
          </div>

          {/* Asignación Operativa: Vehículo + Piloto */}
          <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#041954] uppercase tracking-wider">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Asignación de Recursos Operativos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad de Transporte (Cabezal/Camión) *</label>
                <select
                  name="id_vehiculo"
                  value={form.id_vehiculo}
                  onChange={handleVehiculoSelect}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  <option value="">Selecciona unidad vehicular...</option>
                  {vehiculos.map(v => (
                    <option key={v.id_vehiculo} value={v.id_vehiculo}>
                      {v.placa} — {v.marca} {v.modelo} ({v.tipo || "Cabezal"}) [{v.estado}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Piloto Operador Asignado *</span>
                </label>
                <select
                  name="id_piloto"
                  value={form.id_piloto}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  <option value="">Selecciona piloto...</option>
                  {pilotos.map(p => (
                    <option key={p.id_piloto} value={p.id_piloto}>
                      {p.nombre} {p.apellido} — Lic. {p.num_licencia} [{p.estado}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fechas y Odómetro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Fecha y Hora Salida *</span>
              </label>
              <input
                type="date"
                name="fecha_salida"
                value={form.fecha_salida}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Fecha Estimada Llegada</span>
              </label>
              <input
                type="date"
                name="fecha_estimada_llegada"
                value={form.fecha_estimada_llegada}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Odómetro Inicial (KM)</label>
              <input
                type="text"
                inputMode="numeric"
                name="km_inicial"
                value={form.km_inicial}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => handleNumericChange("km_inicial", e.target.value, false)}
                disabled={!canEdit}
                placeholder="Ej. 145200"
                className={inputCls}
              />
            </div>
          </div>

          {/* Tarifa de Flete y Anticipo de Viáticos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-gray-200/70">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tarifa / Monto del Flete (Q)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">Q</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="monto_flete"
                  value={form.monto_flete}
                  onKeyDown={e => handleNumericKeyDown(e, true)}
                  onChange={e => handleNumericChange("monto_flete", e.target.value, true)}
                  onBlur={() => handleNumericBlur("monto_flete", "0.00")}
                  disabled={!canEdit}
                  placeholder="0.00"
                  className={`${inputCls} pl-7 font-bold text-blue-900`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span>Anticipo de Viáticos al Piloto (Q)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">Q</span>
                <input
                  type="text"
                  inputMode="decimal"
                  name="anticipo_viaticos"
                  value={form.anticipo_viaticos}
                  onKeyDown={e => handleNumericKeyDown(e, true)}
                  onChange={e => handleNumericChange("anticipo_viaticos", e.target.value, true)}
                  onBlur={() => handleNumericBlur("anticipo_viaticos", "0.00")}
                  disabled={!canEdit}
                  placeholder="0.00"
                  className={`${inputCls} pl-7 font-semibold`}
                />
              </div>
            </div>
          </div>

          {/* Estado del Viaje */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estado de la Orden de Viaje *</label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputCls}
            >
              {ESTADOS_VIAJE.map(ev => (
                <option key={ev.value} value={ev.value}>
                  {ev.label} — {ev.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Acciones */}
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
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? "Guardando..." : isEdit ? "Actualizar Viaje" : "Programar Viaje"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ViajeModal;
