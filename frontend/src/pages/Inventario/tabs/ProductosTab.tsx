import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import ExportDropdown from "../../../components/ExportDropdown";
import { type ExportColumn } from "../../../utils/exportUtils";

const PRODUCTOS_COLUMNS: ExportColumn<Producto>[] = [
  { header: "Código SKU", accessor: "codigo" },
  { header: "Descripción", accessor: "descripcion" },
  { header: "Categoría", accessor: row => row.categoria?.nombre || "Sin categoría" },
  { header: "No. Factura Compra", accessor: row => row.numero_factura || "N/A" },
  { header: "Rotación", accessor: row => row.rotacion || "Media" },
  { header: "Origen", accessor: row => row.origen || "Genérico" },
  { header: "Stock Actual", accessor: "stock" },
  { header: "Stock Mínimo", accessor: "stock_minimo" },
  { header: "Unidad de Medida", accessor: "unidad_medida" },
  { header: "Precio Compra (Q)", accessor: "precio_compra", format: v => Number(v || 0).toFixed(2) },
  { header: "Precio Venta (Q)", accessor: "precio_venta", format: v => Number(v || 0).toFixed(2) },
  { header: "Estado", accessor: row => (row.activo ? "Activo" : "Inactivo") }
];

const ProductosTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate  = hasPermission(user, "Inventario", "crear");
  const canEdit    = hasPermission(user, "Inventario", "editar");
  const canDelete  = hasPermission(user, "Inventario", "eliminar");

  const [productos, setProductos]     = useState<Producto[]>([]);
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Filtros
  const [q, setQ]                     = useState("");
  const [catFilter, setCatFilter]     = useState<number | "">("");
  const [stockBajo, setStockBajo]     = useState(false);

  // Estado de paginación
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modales
  const [formProducto, setFormProducto]   = useState<{ open: boolean; producto: Producto | null }>({ open: false, producto: null });
  const [movProducto, setMovProducto]     = useState<Producto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Producto | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // Carga inicial de productos y categorías desde la API
  const loadProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, cats] = await Promise.all([
        getProductos({ limit: 1000 }),
        getCategorias(),
      ]);
      setProductos(res.productos);
      if (cats) setCategorias(cats);
    } catch {
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  // Reinicio automático de currentPage a 1 ante cualquier cambio de filtro o itemsPerPage
  useEffect(() => {
    setCurrentPage(1);
  }, [q, catFilter, stockBajo, itemsPerPage]);

  // Filtrado de productos en memoria
  const filteredProducts = useMemo(() => {
    return productos.filter((p) => {
      const term = q.toLowerCase().trim();
      if (term) {
        const matchesCodigo = p.codigo?.toLowerCase().includes(term);
        const matchesDesc   = p.descripcion?.toLowerCase().includes(term);
        const matchesCat    = p.categoria?.nombre?.toLowerCase().includes(term);
        const matchesFact   = p.numero_factura?.toLowerCase().includes(term);
        if (!matchesCodigo && !matchesDesc && !matchesCat && !matchesFact) {
          return false;
        }
      }

      if (catFilter !== "" && p.id_categoria !== Number(catFilter)) {
        return false;
      }

      if (stockBajo && p.stock > p.stock_minimo) {
        return false;
      }

      return true;
    });
  }, [productos, q, catFilter, stockBajo]);

  // Cálculo de índices de corte (slice) para la paginación
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Helper para generar números de página con soporte de paginación inteligente
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

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
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por código, descripción, factura o categoría..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div className="relative">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value ? Number(e.target.value) : "")}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white text-gray-900 font-medium cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={stockBajo}
            onChange={e => setStockBajo(e.target.checked)}
            className="rounded accent-red-500 cursor-pointer"
          />
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-gray-600 font-medium">Stock bajo</span>
        </label>

        <button
          onClick={() => loadProductos()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors cursor-pointer"
          title="Refrescar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <ExportDropdown
          data={filteredProducts}
          columns={PRODUCTOS_COLUMNS}
          filename={`Reporte_Inventario_Productos_${new Date().toISOString().split("T")[0]}`}
          sheetName="Productos"
          modulo="Inventario"
        />

        {canCreate && (
          <button
            onClick={() => setFormProducto({ open: true, producto: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl transition-all shadow-sm cursor-pointer ml-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Tabla de Productos */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando catálogo de productos...
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 font-medium">{error}</div>
      ) : productos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base font-semibold">No hay productos registrados en el inventario.</p>
          <p className="text-xs mt-1">Registra tu primer producto usando el botón superior.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
          <p className="text-base font-semibold text-gray-700">No se encontraron productos coincidentes.</p>
          <p className="text-xs text-gray-500 mt-1">Intenta ajustando los términos de búsqueda o los filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-left">Foto</th>
                  <th className="py-3.5 px-4 text-left">Código SKU</th>
                  <th className="py-3.5 px-4 text-left">Descripción</th>
                  <th className="py-3.5 px-4 text-left">Categoría</th>
                  <th className="py-3.5 px-4 text-center">Rotación</th>
                  <th className="py-3.5 px-4 text-right">Stock</th>
                  <th className="py-3.5 px-4 text-right">P. Compra</th>
                  <th className="py-3.5 px-4 text-right">P. Venta</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentProducts.map(p => (
                  <tr key={p.id_producto} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.descripcion} className="w-10 h-10 object-cover rounded-xl border border-gray-100 shadow-xs" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-xs text-blue-900">{p.codigo}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-900 line-clamp-1">{p.descripcion}</p>
                      {p.numero_factura && <p className="text-[11px] text-gray-400">Factura: {p.numero_factura}</p>}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{p.categoria?.nombre || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.rotacion === "Alta" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        p.rotacion === "Media" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {p.rotacion || "Media"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${isStockBajo(p) ? "text-red-600 flex items-center justify-end gap-1" : "text-gray-800"}`}>
                        {isStockBajo(p) && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        {p.stock} <span className="text-xs font-normal text-gray-400">{p.unidad_medida}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 font-medium">Q{Number(p.precio_compra || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-blue-900 font-bold">Q{Number(p.precio_venta || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setMovProducto(p)}
                          title="Registrar movimiento de stock"
                          className="p-1.5 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <ArrowDownUp className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setFormProducto({ open: true, producto: p })}
                            title="Editar producto"
                            className="p-1.5 rounded-xl hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDelete(p)}
                            title="Desactivar producto"
                            className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
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

          {/* Footer de Paginación */}
          <div className="bg-white px-4 py-3 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 gap-3">
            <div className="text-sm text-gray-600 font-medium order-3 md:order-1">
              Mostrando <span className="font-bold text-gray-800">{totalItems === 0 ? 0 : startIndex + 1}</span> a{" "}
              <span className="font-bold text-gray-800">{Math.min(endIndex, totalItems)}</span> de{" "}
              <span className="font-bold text-gray-800">{totalItems}</span> productos
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 order-1 md:order-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`flex items-center space-x-1 px-2.5 py-1 text-sm font-bold transition-colors select-none ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-blue-600 hover:underline cursor-pointer"
                }`}
              >
                <span>&lt; Anterior</span>
              </button>

              <div className="flex items-center space-x-1">
                {getPageNumbers().map((pageItem, idx) => {
                  if (typeof pageItem === "string") {
                    return (
                      <span key={`dots-${idx}`} className="px-1.5 py-1 text-sm font-bold text-gray-400 select-none">
                        ...
                      </span>
                    );
                  }
                  const isActive = pageItem === currentPage;
                  return (
                    <button
                      key={pageItem}
                      type="button"
                      onClick={() => setCurrentPage(pageItem)}
                      className={`px-2.5 py-1 text-sm font-bold transition-all rounded-lg select-none cursor-pointer ${
                        isActive
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "text-blue-600 hover:underline hover:bg-gray-50"
                      }`}
                    >
                      {pageItem}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`flex items-center space-x-1 px-2.5 py-1 text-sm font-bold transition-colors select-none ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-blue-600 hover:underline cursor-pointer"
                }`}
              >
                <span>Siguiente &gt;</span>
              </button>
            </div>

            <div className="flex items-center order-2 md:order-3">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 text-blue-600 rounded-lg px-3 py-1.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value={10}>10 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Desactivar Producto</h3>
                <p className="text-xs text-gray-500">Esta acción ocultará el producto del inventario activo.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Desactivar <strong>{confirmDelete.descripcion}</strong> ({confirmDelete.codigo})?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
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
        </div>
      )}
    </div>
  );
};

export default ProductosTab;
