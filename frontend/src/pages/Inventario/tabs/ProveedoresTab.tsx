import React, { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Building2, Phone, Mail,
  ChevronDown, ChevronUp, Users, RefreshCw, X, Save, Loader2,
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
    nombre: "", nit: "", telefono: "", correo: "", direccion: "", tipo_producto: "",
  });
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setProveedores(await getProveedores()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditProv(null);
    setForm({ nombre: "", nit: "", telefono: "", correo: "", direccion: "", tipo_producto: "" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditProv(p);
    setForm({ nombre: p.nombre, nit: p.nit || "", telefono: p.telefono || "", correo: p.correo || "", direccion: p.direccion || "", tipo_producto: p.tipo_producto || "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) return setFormError("El nombre es requerido.");
    setSaving(true);
    setFormError(null);
    try {
      editProv
        ? await updateProveedor(editProv.id_proveedor, form)
        : await createProveedor(form);
      setModalOpen(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || "Error al guardar.");
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

  const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

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
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors">
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
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editProv ? "Editar proveedor" : "Nuevo proveedor"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">NIT</label>
                  <input value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Correo</label>
                <input value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de producto que provee</label>
                <input value={form.tipo_producto} onChange={e => setForm(f => ({ ...f, tipo_producto: e.target.value }))} className={inputCls} /></div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Desactivar proveedor</h3>
            <p className="text-sm text-gray-700 mb-5">¿Desactivar <strong>{confirmDel.nombre}</strong>?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70">
                {deleting ? "..." : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProveedoresTab;
