import React, { useState } from "react";
import { X, ArrowDown, ArrowUp, SlidersHorizontal, Loader2 } from "lucide-react";
import { registrarMovimiento, type Producto } from "../../../api/inventario";

interface MovimientoModalProps {
  producto: Producto;
  onClose: () => void;
  onSuccess: (nuevoStock: number) => void;
}

type TipoMovimiento = "ENTRADA" | "SALIDA" | "AJUSTE";

const TIPO_CONFIG: Record<TipoMovimiento, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ENTRADA:  { label: "Entrada",  icon: <ArrowDown className="w-4 h-4" />,       color: "text-green-700",  bg: "bg-green-50  border-green-200" },
  SALIDA:   { label: "Salida",   icon: <ArrowUp className="w-4 h-4" />,         color: "text-red-700",    bg: "bg-red-50    border-red-200" },
  AJUSTE:   { label: "Ajuste",   icon: <SlidersHorizontal className="w-4 h-4" />, color: "text-blue-700", bg: "bg-blue-50   border-blue-200" },
};

const MovimientoModal: React.FC<MovimientoModalProps> = ({ producto, onClose, onSuccess }) => {
  const [tipo, setTipo]         = useState<TipoMovimiento>("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo]     = useState("");
  const [referencia, setRef]    = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(cantidad);
    if (!cant || cant <= 0) return setError("Ingresa una cantidad válida mayor a 0.");
    setLoading(true);
    setError(null);
    try {
      const { stock_actual } = await registrarMovimiento({
        id_producto: producto.id_producto,
        tipo,
        cantidad: cant,
        referencia: referencia.trim() || undefined,
        motivo: motivo.trim() || undefined,
      });
      onSuccess(stock_actual);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al registrar movimiento.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Registrar Movimiento</h2>
            <p className="text-xs text-gray-500 mt-0.5">{producto.codigo} · {producto.descripcion}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Stock actual */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
            <span className="text-sm text-gray-600">Stock actual</span>
            <span className="text-lg font-bold text-gray-900">
              {producto.stock} <span className="text-xs font-normal text-gray-500">{producto.unidad_medida}</span>
            </span>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de movimiento</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TIPO_CONFIG) as TipoMovimiento[]).map(t => {
                const c = TIPO_CONFIG[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                      tipo === t ? `${c.bg} ${c.color}` : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {c.icon}
                    {c.label}
                  </button>
                );
              })}
            </div>
            {tipo === "AJUSTE" && (
              <p className="text-[11px] text-blue-600 mt-1.5 px-1">
                El ajuste fija el stock al valor exacto que ingreses.
              </p>
            )}
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {tipo === "AJUSTE" ? "Nuevo stock total" : "Cantidad"}
            </label>
            <input
              type="number" min={1} value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder={tipo === "AJUSTE" ? "Ingresa el stock correcto" : "0"}
              className={inputCls}
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Descripción del movimiento" className={inputCls} />
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Referencia (opcional)</label>
            <input type="text" value={referencia} onChange={e => setRef(e.target.value)}
              placeholder="Ej. Factura 001, Orden de trabajo #12" className={inputCls} />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-70 ${
                tipo === "ENTRADA" ? "bg-green-600 hover:bg-green-700" :
                tipo === "SALIDA"  ? "bg-red-600   hover:bg-red-700"   :
                "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Registrando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovimientoModal;
