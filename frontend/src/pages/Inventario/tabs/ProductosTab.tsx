import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Pencil, Trash2, ArrowDownUp,
  AlertTriangle, ImageOff, RefreshCw, ChevronDown,
} from "lucide-react";
import {
  getProductos, deleteProducto,
  getCategorias,
  type Producto, type Categoria,
} from "../../../api/inventario";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";
import ProductoForm from "../components/ProductoForm";
import MovimientoModal from "../components/MovimientoModal";

const ProductosTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate  = hasPermission(user, "Inventario", "crear");
  const canEdit    = hasPermission(user, "Inventario", "editar");
  const canDelete  = hasPermission(user, "Inventario", "eliminar");

  const [productos, setProductos]     = useState<Producto[]>([]);
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Filtros
  const [q, setQ]                     = useState("");
  const [catFilter, setCatFilter]     = useState<number | "">("");
  const [stockBajo, setStockBajo]     = useState(false);
  const [page, setPage]               = useState(1);

  // Modales
  const [formProducto, setFormProducto]       = useState<{ open: boolean; producto: Producto | null }>({ open: false, producto: null });
  const [movProducto, setMovProducto]         = useState<Producto | null>(null);
  const [confirmDelete, setConfirmDelete]     = useState<Producto | null>(null);
  const [deleting, setDeleting]               = useState(false);

  const loadProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, cats] = await Promise.all([
        getProductos({ q: q || undefined, categoria: catFilter || undefined, stock_bajo: stockBajo || undefined, page, limit: 20 }),
        page === 1 ? getCategorias() : Promise.resolve(null),
      ]);
      setProductos(res.productos);
      setTotal(res.total);
      if (cats) setCategorias(cats);
    } catch {
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, [q, catFilter, stockBajo, page]);

  useEffect(() => { loadProductos(); }, [loadProductos]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteProducto(confirmDelete.id_producto);
      setConfirmDelete(null);
      loadProductos();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al desactivar producto.");
    } finally {
      setDeleting(false);
    }
  };

  const isStockBajo = (p: Producto) => p.stock <= p.stock_minimo;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por código o descripción..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div className="relative">
          <select
            value={catFilter}
            onChange={e => { setCatFilter(e.target.value ? Number(e.target.value) : ""); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={stockBajo} onChange={e => { setStockBajo(e.target.checked); setPage(1); }}
            className="rounded accent-red-500" />
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-gray-600">Stock bajo</span>
        </label>

        <button onClick={() => loadProductos()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>

        {canCreate && (
          <button
            onClick={() => setFormProducto({ open: true, producto: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors ml-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando productos...
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No se encontraron productos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12"></th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio venta</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productos.map(p => (
                  <tr key={p.id_producto} className="hover:bg-gray-50/50 transition-colors">
                    {/* Imagen */}
                    <td className="py-2 px-4">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.descripcion} className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageOff className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700">{p.codigo}</td>
                    <td className="py-3 px-4 text-gray-800 max-w-[200px] truncate">{p.descripcion}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {p.categoria?.nombre || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${isStockBajo(p) ? "text-red-600" : "text-gray-800"}`}>
                        {p.stock}
                      </span>
                      {isStockBajo(p) && (
                        <AlertTriangle className="inline-block w-3.5 h-3.5 text-red-500 ml-1 mb-0.5" />
                      )}
                      <span className="text-gray-400 text-xs ml-1">{p.unidad_medida}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-800">
                      Q {p.precio_venta.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setMovProducto(p)}
                              title="Registrar movimiento de stock"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <ArrowDownUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setFormProducto({ open: true, producto: p })}
                              title="Editar"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDelete(p)}
                            title="Desactivar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Mostrando {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors">
                ← Anterior
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors">
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Producto */}
      {formProducto.open && (
        <ProductoForm
          producto={formProducto.producto}
          onClose={() => setFormProducto({ open: false, producto: null })}
          onSuccess={() => { setFormProducto({ open: false, producto: null }); loadProductos(); }}
          canEdit={canEdit || canCreate}
        />
      )}

      {/* Modal Movimiento */}
      {movProducto && (
        <MovimientoModal
          producto={movProducto}
          onClose={() => setMovProducto(null)}
          onSuccess={() => { setMovProducto(null); loadProductos(); }}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Desactivar producto</h3>
                <p className="text-xs text-gray-500">Esta acción ocultará el producto del inventario activo.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Desactivar <strong>{confirmDelete.descripcion}</strong> ({confirmDelete.codigo})?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70">
                {deleting ? "Desactivando..." : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductosTab;
