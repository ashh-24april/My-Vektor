import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Receipt, Plus, Trash2, Calculator } from "lucide-react";
import {
  createVenta,
  getVentasAuxiliares,
  type ClienteAux,
  type VehiculoAux,
  type ProductoAux,
  type CreateVentaPayload
} from "../../../api/ventas";

interface VentaFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CONCEPTOS_SERVICIO = [
  "Flete",
  "Alquiler de Unidad",
  "Servicios de Taller",
  "Venta Directa",
  "Mantenimiento Externo",
  "Otro"
];

const METODOS_PAGO = [
  "Transferencia Bancaria",
  "Efectivo",
  "Cheque",
  "Tarjeta de Crédito/Débito",
  "Depósito Bancario",
  "Crédito a Plazo"
];

interface LineaProductoForm {
  id_producto: number;
  cantidad: number;
  precio_unit: number;
  descuento: number;
}

const VentaFormModal: React.FC<VentaFormModalProps> = ({ onClose, onSuccess }) => {
  const [clientes, setClientes] = useState<ClienteAux[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoAux[]>([]);
  const [productos, setProductos] = useState<ProductoAux[]>([]);
  const [loadingAux, setLoadingAux] = useState(true);

  // Form State
  const [selectedClienteId, setSelectedClienteId] = useState<number | "">("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNit, setClienteNit] = useState("C/F");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");

  const [concepto, setConcepto] = useState("Flete");
  const [idVehiculo, setIdVehiculo] = useState<number | "">("");

  const [subtotal, setSubtotal] = useState<number | "">("");
  const [impuesto, setImpuesto] = useState<number | "">("");
  const [descuento, setDescuento] = useState<number | "">("");
  const [total, setTotal] = useState<number>(0);

  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [estadoPago, setEstadoPago] = useState<"Pendiente" | "Pagada">("Pendiente");
  const [metodoPago, setMetodoPago] = useState("Transferencia Bancaria");
  const [observaciones, setObservaciones] = useState("");

  // Items opcionales (productos/repuestos agregados)
  const [incluirProductos, setIncluirProductos] = useState(false);
  const [lineas, setLineas] = useState<LineaProductoForm[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVentasAuxiliares()
      .then(data => {
        setClientes(data.clientes || []);
        setVehiculos(data.vehiculos || []);
        setProductos(data.productos || []);
      })
      .catch(() => {})
      .finally(() => setLoadingAux(false));
  }, []);

  // Al seleccionar un cliente existente
  const handleSelectCliente = (id: number | "") => {
    setSelectedClienteId(id);
    if (!id) {
      setClienteNombre("");
      setClienteNit("C/F");
      setClienteTelefono("");
      setClienteDireccion("");
      return;
    }
    const c = clientes.find(item => item.id_cliente === id);
    if (c) {
      setClienteNombre(c.nombre);
      setClienteNit(c.nit || "C/F");
      setClienteTelefono(c.telefono || "");
      setClienteDireccion(c.direccion || "");
    }
  };

  // Recalcular total cuando cambian subtotal, impuesto, descuento o lineas de productos
  useEffect(() => {
    let subNum = typeof subtotal === "number" ? subtotal : parseFloat(String(subtotal)) || 0;
    
    if (incluirProductos && lineas.length > 0) {
      const lineasTotal = lineas.reduce((acc, l) => acc + (l.cantidad * l.precio_unit) - (l.descuento || 0), 0);
      subNum += lineasTotal;
    }

    const impNum = typeof impuesto === "number" ? impuesto : parseFloat(String(impuesto)) || 0;
    const descNum = typeof descuento === "number" ? descuento : parseFloat(String(descuento)) || 0;
    const calc = subNum + impNum - descNum;
    setTotal(calc > 0 ? Number(calc.toFixed(2)) : 0);
  }, [subtotal, impuesto, descuento, incluirProductos, lineas]);

  // Calculadora rápida de IVA (12%)
  const handleCalcularIVA = () => {
    const subNum = typeof subtotal === "number" ? subtotal : parseFloat(String(subtotal)) || 0;
    const iva = Number((subNum * 0.12).toFixed(2));
    setImpuesto(iva);
  };

  // Manejo de líneas de productos
  const handleAddLinea = () => {
    setLineas(prev => [...prev, { id_producto: 0, cantidad: 1, precio_unit: 0, descuento: 0 }]);
  };

  const handleRemoveLinea = (index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLinea = (index: number, field: keyof LineaProductoForm, value: any) => {
    setLineas(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "id_producto") {
          const prod = productos.find(p => p.id_producto === Number(value));
          if (prod) {
            updated.precio_unit = prod.precio_venta;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim()) {
      setError("El nombre del cliente o razón social es obligatorio.");
      return;
    }

    const subNum = typeof subtotal === "number" ? subtotal : parseFloat(String(subtotal)) || 0;
    if (subNum <= 0 && (!incluirProductos || lineas.length === 0)) {
      setError("Ingresa un monto subtotal válido para el servicio.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateVentaPayload = {
        id_cliente: selectedClienteId ? Number(selectedClienteId) : null,
        cliente_nombre: clienteNombre.trim(),
        cliente_nit: clienteNit.trim() || "C/F",
        cliente_telefono: clienteTelefono.trim() || undefined,
        cliente_direccion: clienteDireccion.trim() || undefined,
        concepto_servicio: concepto,
        id_vehiculo: idVehiculo ? Number(idVehiculo) : null,
        monto_subtotal: subNum,
        impuesto: typeof impuesto === "number" ? impuesto : parseFloat(String(impuesto)) || 0,
        descuento: typeof descuento === "number" ? descuento : parseFloat(String(descuento)) || 0,
        monto_total: total,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        estado_pago: estadoPago,
        metodo_pago: metodoPago,
        observaciones: observaciones.trim() || undefined,
        detalles: incluirProductos && lineas.length > 0 ? lineas.filter(l => l.id_producto > 0) : undefined
      };

      await createVenta(payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al emitir factura de venta.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nueva Venta / Emitir Factura</h2>
              <p className="text-xs text-gray-500">Registro de facturación por fletes, alquileres o servicios de transporte.</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* SECCIÓN 1: Datos del Cliente */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#041954] uppercase tracking-wider">
                1. Información del Cliente
              </span>
              {loadingAux && <span className="text-[11px] text-gray-400">Cargando clientes...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cliente Registrado (Opcional)
                </label>
                <select
                  value={selectedClienteId}
                  onChange={e => handleSelectCliente(e.target.value ? Number(e.target.value) : "")}
                  className={inputCls}
                >
                  <option value="">-- Ingresar cliente manual / nuevo --</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} {c.nit ? `(NIT: ${c.nit})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre / Razón Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora del Atlántico S.A."
                  value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  NIT / Identificación Tributaria
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12345678-9 o C/F"
                  value={clienteNit}
                  onChange={e => setClienteNit(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej. 5555-1234"
                  value={clienteTelefono}
                  onChange={e => setClienteTelefono(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección Fiscal
                </label>
                <input
                  type="text"
                  placeholder="Ej. Km 18.5 Carretera al Atlántico, Zona 18"
                  value={clienteDireccion}
                  onChange={e => setClienteDireccion(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Detalles del Servicio y Vehículo */}
          <div className="space-y-3">
            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#041954] uppercase tracking-wider">
                2. Concepto del Servicio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tipo / Concepto de Servicio *
                </label>
                <select
                  value={concepto}
                  onChange={e => setConcepto(e.target.value)}
                  className={inputCls}
                >
                  {CONCEPTOS_SERVICIO.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Unidad de Transporte / Vehículo Asociado
                </label>
                <select
                  value={idVehiculo}
                  onChange={e => setIdVehiculo(e.target.value ? Number(e.target.value) : "")}
                  className={inputCls}
                >
                  <option value="">-- Sin vehículo asociado --</option>
                  {vehiculos.map(v => (
                    <option key={v.id_vehiculo} value={v.id_vehiculo}>
                      {v.placa} · {v.marca} {v.modelo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Desglose de Montos e Impuestos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#041954] uppercase tracking-wider">
                3. Importes y Facturación
              </span>
              <button
                type="button"
                onClick={handleCalcularIVA}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                title="Calcular 12% IVA sobre el subtotal"
              >
                <Calculator className="w-3.5 h-3.5" />
                Calcular 12% IVA
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subtotal (Q) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={subtotal}
                  onChange={e => setSubtotal(e.target.value ? parseFloat(e.target.value) : "")}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Impuesto / IVA (Q)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={impuesto}
                  onChange={e => setImpuesto(e.target.value ? parseFloat(e.target.value) : "")}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descuento (Q)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={descuento}
                  onChange={e => setDescuento(e.target.value ? parseFloat(e.target.value) : "")}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Total Destacado */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100/80 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-gray-600 uppercase">Monto Total Facturado</span>
                <p className="text-[11px] text-gray-500">Subtotal + Impuesto - Descuento</p>
              </div>
              <span className="text-2xl font-extrabold text-[#041954]">
                Q {total.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SECCIÓN 4: Opcional Productos/Repuestos */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={incluirProductos}
                  onChange={e => {
                    setIncluirProductos(e.target.checked);
                    if (e.target.checked && lineas.length === 0) {
                      handleAddLinea();
                    }
                  }}
                  className="rounded accent-blue-600 w-4 h-4"
                />
                <span>Incluir items de productos / repuestos vendidos</span>
              </label>

              {incluirProductos && (
                <button
                  type="button"
                  onClick={handleAddLinea}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Item
                </button>
              )}
            </div>

            {incluirProductos && (
              <div className="space-y-2 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                {lineas.map((linea, index) => (
                  <div key={index} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center">
                    <select
                      value={linea.id_producto}
                      onChange={e => handleUpdateLinea(index, "id_producto", Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 bg-white"
                    >
                      <option value={0}>Seleccionar producto...</option>
                      {productos.map(p => (
                        <option key={p.id_producto} value={p.id_producto}>
                          {p.codigo} - {p.descripcion} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={linea.cantidad}
                      onChange={e => handleUpdateLinea(index, "cantidad", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 bg-white"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      value={linea.precio_unit}
                      onChange={e => handleUpdateLinea(index, "precio_unit", parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-gray-200 bg-white font-medium"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveLinea(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 5: Fechas y Estado de Pago */}
          <div className="space-y-3">
            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#041954] uppercase tracking-wider">
                4. Fechas y Forma de Pago
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Emisión *
                </label>
                <input
                  type="date"
                  required
                  value={fechaEmision}
                  onChange={e => setFechaEmision(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={e => setFechaVencimiento(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Estado Inicial de Pago *
                </label>
                <select
                  value={estadoPago}
                  onChange={e => setEstadoPago(e.target.value as "Pendiente" | "Pagada")}
                  className={inputCls}
                >
                  <option value="Pendiente">⏳ Pendiente de Cobro</option>
                  <option value="Pagada">✅ Pagada (Cobro recibido)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value)}
                  className={inputCls}
                >
                  {METODOS_PAGO.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observaciones / Términos de Entrega
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre la ruta, lugar de entrega, conductor o número de viaje..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-md disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Emitiendo..." : "Emitir Factura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VentaFormModal;
