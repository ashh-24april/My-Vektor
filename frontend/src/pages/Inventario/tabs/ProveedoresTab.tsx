import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Pencil, Trash2, Building2, Phone, Mail, Globe,
  ChevronDown, ChevronUp, Users, RefreshCw, X, Save, Loader2,
  AlertTriangle
} from "lucide-react";
import {
  getProveedores, createProveedor, updateProveedor, deleteProveedor,
  type Proveedor,
} from "../../../api/inventario";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";

const ProveedoresTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Inventario", "crear");
  const canEdit   = hasPermission(user, "Inventario", "editar");
  const canDelete = hasPermission(user, "Inventario", "eliminar");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editProv, setEditProv]       = useState<Proveedor | null>(null);
  const [confirmDel, setConfirmDel]   = useState<Proveedor | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    nit: "",
    telefono: "",
    correo: "",
    direccion: "",
    sitio_web: "",
    tipo_producto: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setProveedores(await getProveedores()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditProv(null);
    setForm({
      nombre: "",
      nit: "",
      telefono: "",
      correo: "",
      direccion: "",
      sitio_web: "",
      tipo_producto: "",
    });
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditProv(p);
    setForm({
      nombre: p.nombre,
      nit: p.nit || "",
      telefono: p.telefono || "",
      correo: p.correo || "",
      direccion: p.direccion || "",
      sitio_web: p.sitio_web || "",
      tipo_producto: p.tipo_producto || "",
    });
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (rawValue: string) => {
    // Permite únicamente números, '+', y espacios
    const clean = rawValue.replace(/[^0-9+\s]/g, "");
    setForm(f => ({ ...f, telefono: clean }));
    if (fieldErrors.telefono) {
      setFieldErrors(prev => ({ ...prev, telefono: "" }));
    }
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};

    // 1. Nombre obligatorio (mínimo 3 caracteres, no solo números)
    const nombreClean = form.nombre.trim();
    if (!nombreClean || nombreClean.length < 3) {
      errors.nombre = "El nombre es obligatorio (mínimo 3 caracteres).";
    } else if (/^\d+$/.test(nombreClean)) {
      errors.nombre = "El nombre no puede consistir únicamente en números.";
    }

    // 2. NIT obligatorio con regex
    const nitClean = form.nit.trim();
    const nitRegex = /^([0-9]{1,10}-[0-9Kk]|CF|C\/F|[0-9]{5,12})$/i;
    if (!nitClean) {
      errors.nit = "El NIT es obligatorio.";
    } else if (!nitRegex.test(nitClean)) {
      errors.nit = "Formato de NIT inválido (ej. 1234567-8, CF o 12345678).";
    }

    // 3. Teléfono obligatorio con regex
    const telClean = form.telefono.trim();
    const phoneRegex = /^\+?[0-9\s]{8,15}$/;
    if (!telClean) {
      errors.telefono = "El teléfono es obligatorio.";
    } else if (!phoneRegex.test(telClean)) {
      errors.telefono = "El teléfono debe contener entre 8 y 15 dígitos numéricos.";
    }

    // 4. Dirección obligatoria (mínimo 3 caracteres)
    const dirClean = form.direccion.trim();
    if (!dirClean || dirClean.length < 3) {
      errors.direccion = "La dirección es obligatoria (mínimo 3 caracteres).";
    }

    // 5. Correo opcional con validación regex
    const correoClean = form.correo.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (correoClean && !emailRegex.test(correoClean)) {
      errors.correo = "Formato de correo electrónico inválido.";
    }

    // 6. Sitio Web opcional con validación regex
    const webClean = form.sitio_web.trim();
    const webRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/;
    if (webClean && !webRegex.test(webClean)) {
      errors.sitio_web = "Formato de sitio web inválido (ej. https://ejemplo.com o www.ejemplo.com).";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Por favor completa los campos requeridos correctamente.");
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setFormError(null);

    const payload = {
      nombre: nombreClean,
      nit: nitClean,
      telefono: telClean,
      correo: correoClean || null,
      direccion: dirClean,
      sitio_web: webClean || null,
      tipo_producto: form.tipo_producto.trim() || null,
    };

    try {
      if (editProv) {
        await updateProveedor(editProv.id_proveedor, payload);
      } else {
        await createProveedor(payload);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || "Error al guardar proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try { await deleteProveedor(confirmDel.id_proveedor); setConfirmDel(null); load(); }
    catch (err: any) { alert(err?.response?.data?.error || "Error."); }
    finally { setDeleting(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all";

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando proveedores...
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{proveedores.length} proveedor(es) activos</p>
        {canCreate && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl transition-all shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            Nuevo proveedor
          </button>
        )}
      </div>

      {proveedores.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay proveedores registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {proveedores.map(p => (
            <div key={p.id_proveedor} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
              {/* Header del proveedor */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(expanded === p.id_proveedor ? null : p.id_proveedor)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#041954]/5 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-[#041954]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {[p.nit && `NIT: ${p.nit}`, p.tipo_producto].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p._count && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {p._count.productos}
                    </span>
                  )}
                  <div className="flex gap-1 mr-2">
                    {canEdit && (
                      <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={e => { e.stopPropagation(); setConfirmDel(p); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {expanded === p.id_proveedor ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {expanded === p.id_proveedor && (
                <div className="px-5 pb-4 pt-0 border-t border-gray-50 grid grid-cols-2 gap-3">
                  {p.telefono && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {p.telefono}
                    </div>
                  )}
                  {p.correo && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {p.correo}
                    </div>
                  )}
                  {p.sitio_web && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <a
                        href={p.sitio_web.startsWith("http") ? p.sitio_web : `https://${p.sitio_web}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                        onClick={e => e.stopPropagation()}
                      >
                        {p.sitio_web}
                      </a>
                    </div>
                  )}
                  {p.direccion && (
                    <div className="col-span-2 text-xs text-gray-500 mt-1">📍 {p.direccion}</div>
                  )}
                  {p.contactos && p.contactos.length > 0 && (
                    <div className="col-span-2 mt-2">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Contactos</p>
                      <div className="space-y-2">
                        {p.contactos.map(c => (
                          <div key={c.id_contacto} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl text-xs">
                            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-medium">{c.nombre}</span>
                            {c.cargo && <span className="text-gray-400">· {c.cargo}</span>}
                            {c.telefono && <span className="text-gray-500 ml-auto">{c.telefono}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/80 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#041954]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editProv ? "Editar Proveedor" : "Nuevo Proveedor"}
                  </h2>
                  <p className="text-xs text-gray-500">Datos generales y canales de contacto</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  value={form.nombre}
                  onChange={e => {
                    setForm(f => ({ ...f, nombre: e.target.value }));
                    if (fieldErrors.nombre) setFieldErrors(prev => ({ ...prev, nombre: "" }));
                  }}
                  placeholder="Ej. Distribuidora Automotriz de Guatemala, S.A."
                  className={`${inputCls} ${fieldErrors.nombre ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                />
                {fieldErrors.nombre && <p className="text-rose-500 text-xs mt-1">{fieldErrors.nombre}</p>}
              </div>

              {/* NIT y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NIT *</label>
                  <input
                    value={form.nit}
                    onChange={e => {
                      setForm(f => ({ ...f, nit: e.target.value }));
                      if (fieldErrors.nit) setFieldErrors(prev => ({ ...prev, nit: "" }));
                    }}
                    placeholder="Ej. 1234567-8 o CF"
                    className={`${inputCls} ${fieldErrors.nit ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                  />
                  {fieldErrors.nit && <p className="text-rose-500 text-xs mt-1">{fieldErrors.nit}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono *</label>
                  <input
                    value={form.telefono}
                    onKeyDown={handlePhoneKeyDown}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="Ej. +502 2345 6789"
                    className={`${inputCls} ${fieldErrors.telefono ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                  />
                  {fieldErrors.telefono && <p className="text-rose-500 text-xs mt-1">{fieldErrors.telefono}</p>}
                </div>
              </div>

              {/* Correo y Sitio Web */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={e => {
                      setForm(f => ({ ...f, correo: e.target.value }));
                      if (fieldErrors.correo) setFieldErrors(prev => ({ ...prev, correo: "" }));
                    }}
                    placeholder="contacto@empresa.com"
                    className={`${inputCls} ${fieldErrors.correo ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                  />
                  {fieldErrors.correo && <p className="text-rose-500 text-xs mt-1">{fieldErrors.correo}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sitio Web (Opcional)</label>
                  <input
                    type="text"
                    value={form.sitio_web}
                    onChange={e => {
                      setForm(f => ({ ...f, sitio_web: e.target.value }));
                      if (fieldErrors.sitio_web) setFieldErrors(prev => ({ ...prev, sitio_web: "" }));
                    }}
                    placeholder="https://www.ejemplo.com"
                    className={`${inputCls} ${fieldErrors.sitio_web ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                  />
                  {fieldErrors.sitio_web && <p className="text-rose-500 text-xs mt-1">{fieldErrors.sitio_web}</p>}
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección *</label>
                <input
                  value={form.direccion}
                  onChange={e => {
                    setForm(f => ({ ...f, direccion: e.target.value }));
                    if (fieldErrors.direccion) setFieldErrors(prev => ({ ...prev, direccion: "" }));
                  }}
                  placeholder="Ej. Calzada Roosevelt 12-45 Zona 11, Ciudad de Guatemala"
                  className={`${inputCls} ${fieldErrors.direccion ? "border-rose-400 ring-1 ring-rose-400" : ""}`}
                />
                {fieldErrors.direccion && <p className="text-rose-500 text-xs mt-1">{fieldErrors.direccion}</p>}
              </div>

              {/* Tipo de Producto */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de producto que provee (Opcional)</label>
                <input
                  value={form.tipo_producto}
                  onChange={e => setForm(f => ({ ...f, tipo_producto: e.target.value }))}
                  placeholder="Ej. Filtros, Lubricantes, Llantas, Sensores"
                  className={inputCls}
                />
              </div>

              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium px-4 py-2 rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#0F172A] text-white hover:bg-[#1E293B] font-medium px-5 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer text-xs"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? "Guardando..." : "Guardar"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm delete */}
      {confirmDel && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Desactivar Proveedor</h3>
                <p className="text-xs text-gray-500">Esta acción cambiará su estado</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Estás seguro de que deseas desactivar a <strong>{confirmDel.nombre}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDel(null)}
                className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium px-4 py-2 rounded-xl transition-all cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 transition-all cursor-pointer"
              >
                {deleting ? "Desactivando..." : "Desactivar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProveedoresTab;

