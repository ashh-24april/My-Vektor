
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Save,
  Loader2,
  TrendingUp,
  TrendingDown,
  Building2,
  Truck,
  AlertTriangle,
  Receipt,
  FileText,
  CreditCard,
} from "lucide-react";
import {
  createTransaccion,
  updateTransaccion,
  getSiguienteFolioTransaccion,
  type TransaccionFinanzas,
  type TipoTransaccion,
  type CategoriaFinanzas,
  type EstadoTransaccion,
  type MetodoPago,
} from "../../../api/finanzas";
import { getVehiculos, type Vehiculo } from "../../../api/operaciones";
import { getVentasAuxiliares, type ClienteAux } from "../../../api/ventas";
import { getProveedores, type Proveedor } from "../../../api/inventario";

interface TransaccionModalProps {
  transaccion: TransaccionFinanzas | null;
  defaultTipo?: TipoTransaccion;
  onClose: () => void;
  onSuccess: (t: TransaccionFinanzas) => void;
  canEdit?: boolean;
}

const CATEGORIAS_INGRESO: CategoriaFinanzas[] = [
  "Flete Cobrado",
  "Venta Repuestos",
  "Servicio Mecánico",
  "Otros Ingresos",
];

const CATEGORIAS_EGRESO: CategoriaFinanzas[] = [
  "Combustible",
  "Viáticos Piloto",
  "Peajes",
  "Compra Repuestos",
  "Mantenimiento Taller",
  "Planilla",
  "Seguros",
  "Alquiler/Servicios",
  "Otros Egresos",
];

const METODOS_PAGO: MetodoPago[] = [
  "Transferencia",
  "Efectivo",
  "Cheque",
  "Depósito",
  "Tarjeta",
];

const ESTADOS_INGRESO: EstadoTransaccion[] = [
  "Pendiente",
  "Cobrado Parcial",
  "Cobrado Total",
  "Vencido",
];

const ESTADOS_EGRESO: EstadoTransaccion[] = [
  "Pendiente",
  "Pagado",
  "Anulado",
];

const TransaccionModal: React.FC<TransaccionModalProps> = ({
  transaccion,
  defaultTipo = "Ingreso",
  onClose,
  onSuccess,
  canEdit = true,
}) => {
  const isEdit = !!transaccion;

  const [tipo, setTipo] = useState<TipoTransaccion>(
    transaccion?.tipo ?? defaultTipo
  );

  const [form, setForm] = useState({
    codigo_transaccion: transaccion?.codigo_transaccion ?? "",
    categoria: transaccion?.categoria ?? (defaultTipo === "Ingreso" ? "Flete Cobrado" : "Combustible"),
    concepto: transaccion?.concepto ?? "",
    monto: transaccion?.monto ? String(transaccion.monto) : "",
    monto_pagado: transaccion?.monto_pagado ? String(transaccion.monto_pagado) : "",
    estado: (transaccion?.estado as EstadoTransaccion) ?? "Pendiente",
    fecha: transaccion?.fecha ? transaccion.fecha.substring(0, 10) : new Date().toISOString().substring(0, 10),
    fecha_vencimiento: transaccion?.fecha_vencimiento ? transaccion.fecha_vencimiento.substring(0, 10) : "",
    metodo_pago: (transaccion?.metodo_pago as MetodoPago) ?? "Transferencia",
    num_comprobante: transaccion?.num_comprobante ?? "",
    id_cliente: transaccion?.id_cliente ? String(transaccion.id_cliente) : "",
    id_proveedor: transaccion?.id_proveedor ? String(transaccion.id_proveedor) : "",
    id_vehiculo: transaccion?.id_vehiculo ? String(transaccion.id_vehiculo) : "",
    observaciones: transaccion?.observaciones ?? "",
  });

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<ClienteAux[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar catálogo auxiliar y folio correlativo
  useEffect(() => {
    let isMounted = true;

    const loadAuxData = async () => {
      try {
        const [vehRes, ventAux, provRes] = await Promise.all([
          getVehiculos({ limit: 100 }),
          getVentasAuxiliares().catch(() => ({ clientes: [], vehiculos: [], productos: [] })),
          getProveedores().catch(() => []),
        ]);

        if (isMounted) {
          setVehiculos(vehRes.vehiculos || []);
          setClientes(ventAux.clientes || []);
          setProveedores(provRes || []);
        }
      } catch (err) {
        console.warn("[TransaccionModal] Error al cargar auxiliares:", err);
      }
    };

    const loadFolio = async () => {
      if (!isEdit) {
        setLoadingFolio(true);
        try {
          const folio = await getSiguienteFolioTransaccion();
          if (isMounted) {
            setForm((prev) => ({ ...prev, codigo_transaccion: folio }));
          }
        } catch {
          if (isMounted) {
            setForm((prev) => ({ ...prev, codigo_transaccion: "TRX-100" }));
          }
        } finally {
          if (isMounted) setLoadingFolio(false);
        }
      }
    };

    loadAuxData();
    loadFolio();

    return () => {
      isMounted = false;
    };
  }, [isEdit]);

  // Al cambiar Tipo (Ingreso vs Egreso), reajustar categoría por defecto
  const handleTipoChange = (newTipo: TipoTransaccion) => {
    setTipo(newTipo);
    setForm((prev) => ({
      ...prev,
      categoria: newTipo === "Ingreso" ? "Flete Cobrado" : "Combustible",
      estado: newTipo === "Ingreso" ? "Pendiente" : "Pendiente",
      id_cliente: newTipo === "Ingreso" ? prev.id_cliente : "",
      id_proveedor: newTipo === "Egreso" ? prev.id_proveedor : "",
    }));
  };

  // Helper de saneamiento para inputs de moneda: bloquea '-', '+', 'e', 'E'
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Helper de saneamiento para evitar ceros a la izquierda (ej: '010' -> '10')
  const sanitizeNumericInput = (value: string): string => {
    if (value === "") return "";
    // Reemplaza múltiples puntos decimales o caracteres inválidos
    let clean = value.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = parts[0] + "." + parts.slice(1).join("");
    }
    // Si empieza con 0 seguido de un dígito que no sea punto (ej '05' -> '5')
    if (/^0[0-9]/.test(clean)) {
      clean = clean.replace(/^0+/, "");
      if (clean === "") clean = "0";
    }
    return clean;
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeNumericInput(e.target.value);
    setForm((prev) => ({ ...prev, monto: val }));
  };

  const handleMontoPagadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeNumericInput(e.target.value);
    setForm((prev) => ({ ...prev, monto_pagado: val }));
  };

  // Cálculo de saldo restante en tiempo real
  const numMonto = parseFloat(form.monto) || 0;
  const numPagado = parseFloat(form.monto_pagado) || 0;
  const saldoRestante = Math.max(0, numMonto - numPagado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!form.concepto.trim()) {
      setError("El concepto o descripción de la transacción es obligatorio.");
      return;
    }

    if (numMonto <= 0) {
      setError("El monto de la transacción debe ser un número positivo mayor a 0.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<TransaccionFinanzas> = {
        codigo_transaccion: form.codigo_transaccion,
        tipo,
        categoria: form.categoria as CategoriaFinanzas,
        concepto: form.concepto.trim(),
        monto: numMonto,
        monto_pagado: numPagado,
        estado: form.estado as EstadoTransaccion,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento ? form.fecha_vencimiento : null,
        metodo_pago: form.metodo_pago,
        num_comprobante: form.num_comprobante.trim() || null,
        id_cliente: form.id_cliente ? parseInt(form.id_cliente, 10) : null,
        id_proveedor: form.id_proveedor ? parseInt(form.id_proveedor, 10) : null,
        id_vehiculo: form.id_vehiculo ? parseInt(form.id_vehiculo, 10) : null,
        observaciones: form.observaciones.trim() || null,
      };

      let result: TransaccionFinanzas;
      if (isEdit && transaccion) {
        result = await updateTransaccion(transaccion.id_transaccion, payload);
      } else {
        result = await createTransaccion(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error("[TransaccionModal] Error submit:", err);
      setError(err?.response?.data?.error || "Error al guardar la transacción financiera.");
    } finally {
      setSubmitting(false);
    }
  };

  // Renderizado mediante React Portal al final de document.body con z-[9999]
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-transaccion-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-dark-paper rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden my-8">
        
        {/* Header con gradiente según tipo */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            tipo === "Ingreso"
              ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-700"
              : "bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              {tipo === "Ingreso" ? (
                <TrendingUp className="w-6 h-6 text-emerald-200" />
              ) : (
                <TrendingDown className="w-6 h-6 text-rose-200" />
              )}
            </div>
            <div>
              <h3 id="modal-transaccion-title" className="text-lg font-bold">
                {isEdit ? "Editar Transacción Financiera" : "Nueva Transacción de Caja"}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {isEdit
                  ? `Modificando registro ${transaccion?.codigo_transaccion || ""}`
                  : "Registro de ingresos, egresos y comprobantes contables"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo (Ingreso vs Egreso) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 dark:bg-dark-bg rounded-xl">
              <button
                type="button"
                onClick={() => handleTipoChange("Ingreso")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  tipo === "Ingreso"
                    ? "bg-white dark:bg-dark-paper text-emerald-600 dark:text-emerald-400 shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Ingreso de Caja (+)
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange("Egreso")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  tipo === "Egreso"
                    ? "bg-white dark:bg-dark-paper text-rose-600 dark:text-rose-400 shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                <TrendingDown className="w-4 h-4 text-rose-500" />
                Egreso Operativo (-)
              </button>
            </div>
          )}

          {/* Fila 1: Folio y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Folio / Código Correlativo
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.codigo_transaccion}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 font-mono font-bold rounded-xl border border-gray-200 dark:border-dark-border cursor-not-allowed text-sm"
                  placeholder="Generando folio..."
                />
                {loadingFolio && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-3 top-3" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Categoría Financiera *
              </label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaFinanzas })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
              >
                {(tipo === "Ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 2: Concepto / Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Concepto / Descripción del Movimiento *
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                placeholder="Ej. Cobro de flete Escuintla-Puerto Quetzal, Factura A-102"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          {/* Fila 3: Monto Total y Monto Pagado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Monto Total (Q) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-gray-500">Q</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={form.monto}
                  onKeyDown={handleNumericKeyDown}
                  onChange={handleMontoChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-900 dark:text-white font-bold rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Monto Pagado / Cobrado (Q)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-gray-500">Q</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.monto_pagado}
                  onKeyDown={handleNumericKeyDown}
                  onChange={handleMontoPagadoChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-900 dark:text-white font-bold rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              {numMonto > 0 && (
                <p className="text-[11px] mt-1 text-gray-500 dark:text-gray-400 font-medium">
                  Saldo pendiente: <span className="font-bold text-amber-600 dark:text-amber-400">Q{saldoRestante.toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Fila 4: Estado y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Estado de la Transacción
              </label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoTransaccion })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
              >
                {(tipo === "Ingreso" ? ESTADOS_INGRESO : ESTADOS_EGRESO).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Método de Pago
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <select
                  value={form.metodo_pago}
                  onChange={(e) => setForm({ ...form, metodo_pago: e.target.value as MetodoPago })}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fila 5: Fechas y No. Comprobante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Fecha de Operación
              </label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                No. Comprobante / Factura
              </label>
              <div className="relative">
                <Receipt className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={form.num_comprobante}
                  onChange={(e) => setForm({ ...form, num_comprobante: e.target.value })}
                  placeholder="Factura, Cheque..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </div>
          </div>

          {/* Fila 6: Vinculación con Cliente, Proveedor o Vehículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {tipo === "Ingreso" ? (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  Cliente Asociado
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <select
                    value={form.id_cliente}
                    onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">-- Cliente General / Varios --</option>
                    {clientes.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nombre} {c.nit ? `(NIT: ${c.nit})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                  Proveedor Asociado
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <select
                    value={form.id_proveedor}
                    onChange={(e) => setForm({ ...form, id_proveedor: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">-- Proveedor General / Caja Chica --</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre} {p.nit ? `(NIT: ${p.nit})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                Vehículo Imputado (Opcional)
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <select
                  value={form.id_vehiculo}
                  onChange={(e) => setForm({ ...form, id_vehiculo: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="">-- Sin asignar a unidad --</option>
                  {vehiculos.map((v) => (
                    <option key={v.id_vehiculo} value={v.id_vehiculo}>
                      {v.placa} - {v.marca} {v.modelo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fila 7: Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
              Observaciones / Notas de Auditoría
            </label>
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Detalles adicionales, número de cuenta receptora, autorización..."
              className="w-full px-3.5 py-2 bg-white dark:bg-dark-bg text-gray-800 dark:text-white rounded-xl border border-gray-300 dark:border-dark-border focus:ring-2 focus:ring-primary text-sm resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
            >
              Cancelar
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium px-5 py-2.5 rounded-xl shadow-sm text-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEdit ? "Guardar Cambios" : "Registrar Transacción"}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default TransaccionModal;
