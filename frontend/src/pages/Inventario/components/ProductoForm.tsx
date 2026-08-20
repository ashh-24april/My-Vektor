import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Package } from "lucide-react";
import {
  createProducto, updateProducto,
  getCategorias, getProveedores,
  type Producto, type Categoria, type Proveedor,
} from "../../../api/inventario";
import ProductoImageUploader from "./ProductoImageUploader";

interface ProductoFormProps {
  producto: Producto | null;
  onClose: () => void;
  onSuccess: (p: Producto) => void;
  canEdit?: boolean;
}

const UNIDADES = ["Unidad", "Caja", "Litro", "Galón", "Kg", "Gramo", "Metro", "Par", "Juego", "Rollo"];

const ProductoForm: React.FC<ProductoFormProps> = ({ producto, onClose, onSuccess, canEdit = true }) => {
  const isEdit = !!producto;

  const [form, setForm] = useState({
    codigo:       producto?.codigo       ?? "",
    descripcion:  producto?.descripcion  ?? "",
    id_categoria: producto?.id_categoria ?? 0,
    id_proveedor: producto?.id_proveedor ?? null as number | null,
    ubicacion:    producto?.ubicacion    ?? "",
    unidad_medida:producto?.unidad_medida ?? "Unidad",
    stock:        producto?.stock        ?? 0,
    stock_minimo: producto?.stock_minimo ?? 0,
    precio_compra:producto?.precio_compra ?? 0,
    precio_venta: producto?.precio_venta  ?? 0,
    foto_url:     producto?.foto_url      ?? "",
  });

  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCategorias(), getProveedores()]).then(([cats, provs]) => {
      setCategorias(cats);
      setProveedores(provs);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: ["id_categoria", "id_proveedor", "stock", "stock_minimo"].includes(name)
        ? (value === "" ? null : Number(value))
        : ["precio_compra", "precio_venta"].includes(name)
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim()) return setError("El código es requerido.");
    if (!form.descripcion.trim()) return setError("La descripción es requerida.");
    if (!form.id_categoria) return setError("La categoría es requerida.");

    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        codigo:       form.codigo.trim().toUpperCase(),
        descripcion:  form.descripcion.trim(),
        foto_url:     form.foto_url || null,
        id_proveedor: form.id_proveedor || null,
      };
      const result = isEdit
        ? await updateProducto(producto!.id_producto, payload)
        : await createProducto(payload);
      onSuccess(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar producto.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
    placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Editar Producto" : "Nuevo Producto"}</h2>
              <p className="text-xs text-gray-500">{isEdit ? `Código: ${producto!.codigo}` : "Completa los datos del producto"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Imagen + Código / Descripción */}
          <div className="flex gap-5 items-start">
            <ProductoImageUploader
              currentUrl={form.foto_url || null}
              onUpload={(url) => setForm(prev => ({ ...prev, foto_url: url }))}
              disabled={!canEdit}
            />
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Código *</label>
                <input name="codigo" value={form.codigo} onChange={handleChange}
                  disabled={!canEdit} placeholder="Ej. REP-001"
                  className={`${inputCls} uppercase`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción *</label>
                <input name="descripcion" value={form.descripcion} onChange={handleChange}
                  disabled={!canEdit} placeholder="Nombre completo del producto"
                  className={inputCls} />
              </div>
            </div>
          </div>

          {/* Categoría + Proveedor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría *</label>
              <select name="id_categoria" value={form.id_categoria} onChange={handleChange}
                disabled={!canEdit} className={inputCls}>
                <option value={0}>Selecciona una categoría</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Proveedor</label>
              <select name="id_proveedor" value={form.id_proveedor ?? ""} onChange={handleChange}
                disabled={!canEdit} className={inputCls}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unidad + Ubicación */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad de medida</label>
              <select name="unidad_medida" value={form.unidad_medida} onChange={handleChange}
                disabled={!canEdit} className={inputCls}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ubicación en bodega</label>
              <input name="ubicacion" value={form.ubicacion} onChange={handleChange}
                disabled={!canEdit} placeholder="Ej. Estante A-3"
                className={inputCls} />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isEdit ? "Stock actual" : "Stock inicial"}
              </label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange}
                disabled={isEdit || !canEdit} min={0}
                className={`${inputCls} ${isEdit ? "bg-gray-50 text-gray-400" : ""}`} />
              {isEdit && <p className="text-[11px] text-gray-400 mt-1">Usa "Movimiento" para ajustar el stock.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Stock mínimo</label>
              <input type="number" name="stock_minimo" value={form.stock_minimo} onChange={handleChange}
                disabled={!canEdit} min={0}
                className={inputCls} />
            </div>
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Precio de compra (Q)</label>
              <input type="number" name="precio_compra" value={form.precio_compra} onChange={handleChange}
                disabled={!canEdit} min={0} step="0.01"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Precio de venta (Q)</label>
              <input type="number" name="precio_venta" value={form.precio_venta} onChange={handleChange}
                disabled={!canEdit} min={0} step="0.01"
                className={inputCls} />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            {canEdit && (
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors disabled:opacity-70">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductoForm;
