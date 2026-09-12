
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Save,
  Loader2,
  Users,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Award,
} from "lucide-react";
import {
  createPiloto,
  updatePiloto,
  type Piloto,
  type EstadoPiloto,
} from "../../../api/operaciones";

interface PilotoModalProps {
  piloto: Piloto | null;
  onClose: () => void;
  onSuccess: (p: Piloto) => void;
  canEdit?: boolean;
}

const TIPOS_LICENCIA = ["Tipo A", "Tipo B", "Tipo C", "Internacional"];

const ESTADOS_PILOTO: { value: EstadoPiloto; label: string; desc: string }[] = [
  { value: "Disponible", label: "Disponible para Asignación", desc: "Listo para iniciar nuevo viaje" },
  { value: "En Viaje", label: "En Viaje / Ruta Activa", desc: "Asignado actualmente a un despacho" },
  { value: "De Licencia", label: "De Licencia / Permiso", desc: "Vacaciones, descanso o permiso médico" },
  { value: "Inactivo", label: "Inactivo / Suspendido", desc: "Baja temporal o administrativa" },
];

const PilotoModal: React.FC<PilotoModalProps> = ({
  piloto,
  onClose,
  onSuccess,
  canEdit = true,
}) => {
  const isEdit = !!piloto;

  const [form, setForm] = useState({
    nombre:        piloto?.nombre        ?? "",
    apellido:      piloto?.apellido      ?? "",
    dpi:           piloto?.dpi           ?? "",
    telefono:      piloto?.telefono      ?? "",
    correo:        piloto?.correo        ?? "",
    num_licencia:  piloto?.num_licencia  ?? "",
    tipo_licencia: piloto?.tipo_licencia ?? "Tipo A",
    venc_licencia: piloto?.venc_licencia ? piloto.venc_licencia.split("T")[0] : "",
    estado:        (piloto?.estado as EstadoPiloto) ?? "Disponible",
    foto_url:      piloto?.foto_url      ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!form.apellido.trim()) return setError("El apellido es obligatorio.");
    if (!form.dpi.trim()) return setError("El DPI es obligatorio.");
    if (!form.num_licencia.trim()) return setError("El número de licencia es obligatorio.");
    if (!form.venc_licencia) return setError("La fecha de vencimiento de licencia es obligatoria.");

    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Piloto> = {
        nombre:        form.nombre.trim(),
        apellido:      form.apellido.trim(),
        dpi:           form.dpi.trim(),
        telefono:      form.telefono.trim() || null,
        correo:        form.correo.trim() || null,
        num_licencia:  form.num_licencia.trim().toUpperCase(),
        tipo_licencia: form.tipo_licencia,
        venc_licencia: form.venc_licencia,
        estado:        form.estado,
        foto_url:      form.foto_url.trim() || null,
      };

      const result = isEdit
        ? await updatePiloto(piloto!.id_piloto, payload)
        : await createPiloto(payload);

      onSuccess(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar el piloto.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
    placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? `Editar Piloto: ${piloto!.nombre} ${piloto!.apellido}` : "Registrar Piloto / Operador"}
              </h2>
              <p className="text-xs text-gray-500">Credenciales, habilitación y estado de disponibilidad</p>
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
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Juan Carlos"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido *</label>
              <input
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Morales Pérez"
                className={inputCls}
              />
            </div>
          </div>

          {/* DPI y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span>DPI / CUI *</span>
              </label>
              <input
                name="dpi"
                value={form.dpi}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="13 dígitos"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>Teléfono de Contacto</span>
              </label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. 5555-1234"
                className={inputCls}
              />
            </div>
          </div>

          {/* Correo Electrónico */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              disabled={!canEdit}
              placeholder="piloto@transporte.com"
              className={inputCls}
            />
          </div>

          {/* Sección de Licencia de Conducir */}
          <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Licencia de Conducir Pesada</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">No. Licencia *</label>
                <input
                  name="num_licencia"
                  value={form.num_licencia}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder="Ej. LIC-98124"
                  className={`${inputCls} font-mono uppercase font-semibold`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo *</label>
                <select
                  name="tipo_licencia"
                  value={form.tipo_licencia}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  {TIPOS_LICENCIA.map(tl => (
                    <option key={tl} value={tl}>{tl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Vencimiento *</span>
                </label>
                <input
                  type="date"
                  name="venc_licencia"
                  value={form.venc_licencia}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Estado del Piloto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Estado Operativo del Piloto *</label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              disabled={!canEdit}
              className={inputCls}
            >
              {ESTADOS_PILOTO.map(ep => (
                <option key={ep.value} value={ep.value}>
                  {ep.label} — {ep.desc}
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
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? "Guardando..." : isEdit ? "Actualizar Piloto" : "Registrar Piloto"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PilotoModal;
