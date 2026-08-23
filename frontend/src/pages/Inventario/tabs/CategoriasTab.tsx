import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag, Package, Loader2, RefreshCw } from "lucide-react";
import {
  getCategorias, createCategoria, updateCategoria, deleteCategoria,
  type Categoria,
} from "../../../api/inventario";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";

const CategoriasTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Inventario", "crear");
  const canEdit   = hasPermission(user, "Inventario", "editar");
  const canDelete = hasPermission(user, "Inventario", "eliminar");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Formulario inline
  const [editId, setEditId]   = useState<number | null>(null);
  const [nombre, setNombre]   = useState("");
  const [desc, setDesc]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);

  // Confirm delete
  const [confirmDel, setConfirmDel] = useState<Categoria | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCategorias(await getCategorias());
    } catch {
      setError("Error al cargar categorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setNombre(""); setDesc(""); setFormError(null); setShowForm(true); };
  const openEdit = (c: Categoria) => { setEditId(c.id_categoria); setNombre(c.nombre); setDesc(c.descripcion || ""); setFormError(null); setShowForm(true); };
  const cancelForm = () => { setShowForm(false); setEditId(null); setNombre(""); setDesc(""); };

  const handleSave = async () => {
    if (!nombre.trim()) return setFormError("El nombre es requerido.");
    setSaving(true);
    setFormError(null);
    try {
      if (editId) {
        await updateCategoria(editId, { nombre, descripcion: desc });
      } else {
        await createCategoria({ nombre, descripcion: desc });
      }
      cancelForm();
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
    try {
      await deleteCategoria(confirmDel.id_categoria);
      setConfirmDel(null);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al eliminar categoría.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando categorías...
    </div>
  );

  if (error) return <div className="text-center py-16 text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {categorias.length} {categorias.length === 1 ? "categoría" : "categorías"} registradas
        </p>
        {canCreate && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            Nueva categoría
          </button>
        )}
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">{editId ? "Editar categoría" : "Nueva categoría"}</p>
          <input
            value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Nombre de la categoría *"
            className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <input
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={cancelForm}
              className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl disabled:opacity-70">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Grid de categorías */}
      {categorias.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay categorías registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categorias.map(c => (
            <div key={c.id_categoria}
              className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-[#041954]/5 rounded-xl flex items-center justify-center">
                  <Tag className="w-4 h-4 text-[#041954]" />
                </div>
                <div className="flex gap-1">
                  {canEdit && (
                    <button onClick={() => openEdit(c)}
                      className="p-1 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setConfirmDel(c)}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">{c.nombre}</p>
              {c.descripcion && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{c.descripcion}</p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <Package className="w-3 h-3" />
                {c._count?.productos ?? 0} producto(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Eliminar categoría</h3>
                <p className="text-xs text-gray-500">Solo se puede eliminar si no tiene productos.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">¿Eliminar <strong>{confirmDel.nombre}</strong>?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70">
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriasTab;
