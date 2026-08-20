import React, { useState, useEffect } from "react";
import {
  Plus, ShoppingCart, ChevronDown, RefreshCw, X, Save, Loader2, Trash2,
  CheckCircle2, Clock, XCircle, Eye,
} from "lucide-react";
import {
  getCompras, getCompraById, createCompra, updateCompraEstado,
  getProductos, getProveedores,
  type Compra, type Proveedor, type Producto,
} from "../../../api/inventario";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";

const ESTADO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  Pendiente: { label: "Pendiente", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  Recibida:  { label: "Recibida",  icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-700", bg: "bg-green-50 border-green-200" },
  Cancelada: { label: "Cancelada", icon: <XCircle className="w-3.5 h-3.5" />,      color: "text-red-700",   bg: "bg-red-50 border-red-200" },
};

interface LineaCompra { id_producto: number; cantidad: number; precio_unit: number; nombre?: string }

const ComprasTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Inventario", "crear");
  const canEdit   = hasPermission(user, "Inventario", "editar");

  const [compras, setCompras]         = useState<Compra[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [estadoFilter, setEstadoFilter] = useState("");

  // Modal nueva compra
  const [modalOpen, setModalOpen]     = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [idProv, setIdProv]           = useState<number | "">("");
  const [numFactura, setNumFactura]   = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas]           = useState<LineaCompra[]>([{ id_producto: 0, cantidad: 1, precio_unit: 0 }]);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // Detalle
  const [detalle, setDetalle]         = useState<Compra | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCompras({ estado: estadoFilter || undefined, page, limit: 15 });
      setCompras(res.compras);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, estadoFilter]);

  const openModal = async () => {
    setIdProv(""); setNumFactura(""); setObservaciones("");
    setLineas([{ id_producto: 0, cantidad: 1, precio_unit: 0 }]);
    setFormError(null);
    const [provs, prods] = await Promise.all([getProveedores(), getProductos({ limit: 200 })]);
    setProveedores(provs);
    setProductos(prods.productos);
    setModalOpen(true);
  };

  const addLinea = () => setLineas(l => [...l, { id_producto: 0, cantidad: 1, precio_unit: 0 }]);
  const removeLinea = (i: number) => setLineas(l => l.filter((_, idx) => idx !== i));
  const updateLinea = (i: number, field: keyof LineaCompra, val: any) => {
    setLineas(l => l.map((ln, idx) => {
      if (idx !== i) return ln;
      const updated = { ...ln, [field]: val };
      if (field === "id_producto") {
        const prod = productos.find(p => p.id_producto === Number(val));
        updated.precio_unit = prod?.precio_compra ?? 0;
        updated.nombre = prod?.descripcion;
      }
      return updated;
    }));
  };

  const subtotal = lineas.reduce((s, l) => s + (l.cantidad * l.precio_unit), 0);

  const handleSave = async () => {
    if (!idProv) return setFormError("Selecciona un proveedor.");
    if (lineas.some(l => !l.id_producto)) return setFormError("Todos los productos deben estar seleccionados.");
    setSaving(true); setFormError(null);
    try {
      await createCompra({
        id_proveedor: Number(idProv),
        num_factura: numFactura || undefined,
        observaciones: observaciones || undefined,
        detalles: lineas.map(l => ({ id_producto: l.id_producto, cantidad: l.cantidad, precio_unit: l.precio_unit })),
      });
      setModalOpen(false);
      load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || "Error al registrar compra.");
    } finally { setSaving(false); }
  };

  const handleEstado = async (id: number, estado: string) => {
    try { await updateCompraEstado(id, estado); load(); }
    catch (err: any) { alert(err?.response?.data?.error || "Error."); }
  };

  const openDetalle = async (id: number) => {
    setLoadingDetalle(true);
    try { setDetalle(await getCompraById(id)); }
    finally { setLoadingDetalle(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Todos los estados</option>
          {Object.keys(ESTADO_CONFIG).map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <button onClick={load} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>

        {canCreate && (
          <button onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl ml-auto">
            <Plus className="w-4 h-4" />
            Registrar compra
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando compras...
        </div>
      ) : compras.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay compras registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Factura</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {compras.map(c => {
                  const cfg = ESTADO_CONFIG[c.estado] || ESTADO_CONFIG.Pendiente;
                  return (
                    <tr key={c.id_compra} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-600">{new Date(c.fecha).toLocaleDateString("es-GT")}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">{c.proveedor?.nombre || "—"}</td>
                      <td className="py-3 px-4 text-gray-500">{c.num_factura || "—"}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-800">Q {c.total.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetalle(c.id_compra)} title="Ver detalle"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && c.estado === "Pendiente" && (
                            <>
                              <button onClick={() => handleEstado(c.id_compra, "Recibida")}
                                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">
                                Recibida
                              </button>
                              <button onClick={() => handleEstado(c.id_compra, "Cancelada")}
                                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">{total} compras en total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white">← Anterior</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white">Siguiente →</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva compra */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Registrar Compra</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Proveedor *</label>
                  <select value={idProv} onChange={e => setIdProv(Number(e.target.value))} className={inputCls}>
                    <option value="">Selecciona...</option>
                    {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">N° de factura</label>
                  <input value={numFactura} onChange={e => setNumFactura(e.target.value)} placeholder="Opcional" className={inputCls} />
                </div>
              </div>

              {/* Líneas de productos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">Productos</label>
                  <button type="button" onClick={addLinea}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Agregar línea
                  </button>
                </div>
                <div className="space-y-2">
                  {lineas.map((ln, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                      <select value={ln.id_producto} onChange={e => updateLinea(i, "id_producto", Number(e.target.value))}
                        className={inputCls}>
                        <option value={0}>Selecciona producto</option>
                        {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.codigo} — {p.descripcion}</option>)}
                      </select>
                      <input type="number" min={1} value={ln.cantidad} onChange={e => updateLinea(i, "cantidad", Number(e.target.value))}
                        placeholder="Cant." className={inputCls} />
                      <input type="number" min={0} step="0.01" value={ln.precio_unit} onChange={e => updateLinea(i, "precio_unit", parseFloat(e.target.value) || 0)}
                        placeholder="Precio" className={inputCls} />
                      <button type="button" onClick={() => removeLinea(i)} disabled={lineas.length === 1}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
                <input value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Opcional" className={inputCls} />
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Total de compra</span>
                <span className="text-lg font-bold text-[#041954]">Q {subtotal.toFixed(2)}</span>
              </div>

              {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setModalOpen(false)} className="px-5 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Guardando..." : "Registrar compra"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de compra */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Compra #{detalle.id_compra}</h2>
              <button onClick={() => setDetalle(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500 text-xs">Proveedor</span><p className="font-semibold">{detalle.proveedor?.nombre}</p></div>
                <div><span className="text-gray-500 text-xs">Estado</span>
                  <p>
                    {(() => { const c = ESTADO_CONFIG[detalle.estado]; return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.color}`}>
                        {c.icon}{c.label}
                      </span>
                    ); })()}
                  </p>
                </div>
                <div><span className="text-gray-500 text-xs">Fecha</span><p className="font-semibold">{new Date(detalle.fecha).toLocaleDateString("es-GT")}</p></div>
                <div><span className="text-gray-500 text-xs">Factura</span><p className="font-semibold">{detalle.num_factura || "—"}</p></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Productos</p>
                <div className="space-y-1">
                  {detalle.detalles?.map(d => (
                    <div key={d.id_detalle_compra} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-xs">
                      <span className="font-medium">{d.producto?.descripcion}</span>
                      <span className="text-gray-500">{d.cantidad} × Q{d.precio_unit.toFixed(2)} = <strong>Q{d.subtotal.toFixed(2)}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-lg font-bold text-[#041954]">Q {detalle.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasTab;
