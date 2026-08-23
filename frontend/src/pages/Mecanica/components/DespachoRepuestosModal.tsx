import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Package, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  addRepuestosAOrden,
  getMecanicaAuxiliares,
  type OrdenTrabajo,
  type ProductoRepuestoAux,
  type DespachoRepuestoItem
} from "../../../api/mecanica";

interface DespachoRepuestosModalProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineaDespacho {
  id_producto: number;
  cantidad: number;
  precio_unit: number;
  stock_disponible: number;
}

const DespachoRepuestosModal: React.FC<DespachoRepuestosModalProps> = ({ orden, onClose, onSuccess }) => {
  const [productos, setProductos] = useState<ProductoRepuestoAux[]>([]);
  const [loadingProds, setLoadingProds] = useState(true);

  const [lineas, setLineas] = useState<LineaDespacho[]>([
    { id_producto: 0, cantidad: 1, precio_unit: 0, stock_disponible: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMecanicaAuxiliares()
      .then(data => {
        setProductos(data.repuestos || []);
      })
      .catch(() => {})
      .finally(() => setLoadingProds(false));
  }, []);

  const handleAddLinea = () => {
    setLineas(prev => [...prev, { id_producto: 0, cantidad: 1, precio_unit: 0, stock_disponible: 0 }]);
  };

  const handleRemoveLinea = (index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLinea = (index: number, field: keyof LineaDespacho, val: any) => {
    setLineas(prev =>
      prev.map((ln, i) => {
        if (i !== index) return ln;
        const updated = { ...ln, [field]: val };
        if (field === "id_producto") {
          const prod = productos.find(p => p.id_producto === Number(val));
          if (prod) {
            updated.precio_unit = prod.precio_venta || prod.precio_compra || 0;
            updated.stock_disponible = prod.stock;
          } else {
            updated.precio_unit = 0;
            updated.stock_disponible = 0;
          }
        }
        return updated;
      })
    );
  };

  const totalNuevosRepuestos = lineas.reduce((acc, l) => acc + (l.id_producto > 0 ? l.cantidad * l.precio_unit : 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lineas.filter(l => l.id_producto > 0 && l.cantidad > 0);

    if (validLines.length === 0) {
      setError("Selecciona al menos un repuesto e indica la cantidad.");
      return;
    }

    // Validar stocks
    for (const l of validLines) {
      if (l.cantidad > l.stock_disponible) {
        const prod = productos.find(p => p.id_producto === l.id_producto);
        setError(`La cantidad de "${prod?.descripcion}" supera el stock actual (${l.stock_disponible} disponibles).`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const items: DespachoRepuestoItem[] = validLines.map(l => ({
        id_producto: l.id_producto,
        cantidad: l.cantidad,
        precio_unit: l.precio_unit
      }));

      await addRepuestosAOrden(orden.id_orden, items);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al despachar repuestos a la orden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Despachar Repuestos e Insumos</h3>
              <p className="text-xs text-gray-500">
                {orden.numero_ot || `OT #${orden.id_orden}`} · Unidad: {orden.vehiculo?.placa}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Repuestos ya cargados en la OT */}
          {orden.repuestos && orden.repuestos.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Repuestos ya asignados a esta OT
              </span>
              <div className="divide-y divide-gray-100 text-xs">
                {orden.repuestos.map(r => (
                  <div key={r.id_producto} className="flex justify-between py-1.5 text-gray-700">
                    <span>
                      {r.producto?.descripcion} ({r.cantidad} {r.producto?.unidad_medida})
                    </span>
                    <span className="font-semibold text-gray-900">Q {r.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario de Nuevos Repuestos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#041954] uppercase tracking-wider">
                Nuevos Repuestos a Despachar
              </span>
              <button
                type="button"
                onClick={handleAddLinea}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Fila
              </button>
            </div>

            {loadingProds ? (
              <div className="py-6 text-center text-xs text-gray-400">Cargando catálogo de repuestos...</div>
            ) : (
              <div className="space-y-2.5">
                {lineas.map((linea, index) => {
                  const sinStock = linea.id_producto > 0 && linea.cantidad > linea.stock_disponible;

                  return (
                    <div
                      key={index}
                      className={`grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center p-2.5 rounded-2xl border ${
                        sinStock ? "bg-red-50/60 border-red-200" : "bg-gray-50/70 border-gray-100"
                      }`}
                    >
                      <div>
                        <select
                          value={linea.id_producto}
                          onChange={e => handleUpdateLinea(index, "id_producto", Number(e.target.value))}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 font-medium"
                        >
                          <option value={0}>-- Seleccionar repuesto --</option>
                          {productos.map(p => (
                            <option key={p.id_producto} value={p.id_producto}>
                              {p.codigo} · {p.descripcion} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>

                        {linea.id_producto > 0 && (
                          <div className="flex items-center gap-2 mt-1 px-1 text-[11px]">
                            <span className={sinStock ? "text-red-600 font-bold" : "text-gray-500"}>
                              Stock en Bodega: {linea.stock_disponible}
                            </span>
                            {sinStock && (
                              <span className="text-red-600 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Insuficiente
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={linea.cantidad}
                        onChange={e =>
                          handleUpdateLinea(index, "cantidad", Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 font-medium"
                      />

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio (Q)"
                        value={linea.precio_unit}
                        onChange={e =>
                          handleUpdateLinea(index, "precio_unit", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 bg-white text-gray-900 font-bold text-right"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveLinea(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen Total Despacho */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Los items se descontarán automáticamente del Kardex de Inventario.</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total a Despachar</span>
              <p className="text-lg font-black text-[#041954]">
                Q {totalNuevosRepuestos.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Despachando..." : "Confirmar Despacho"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DespachoRepuestosModal;
