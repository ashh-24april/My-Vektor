import React, { useRef } from "react";
import { X, Printer, Truck, Calendar, CreditCard, User, FileText } from "lucide-react";
import { type Venta } from "../../../api/ventas";

interface VentaDetalleModalProps {
  venta: Venta;
  onClose: () => void;
}

const ESTADO_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Pagada: { label: "PAGADA", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Pendiente: { label: "PENDIENTE DE COBRO", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Anulada: { label: "ANULADA", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" }
};

const VentaDetalleModal: React.FC<VentaDetalleModalProps> = ({ venta, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const badge = ESTADO_BADGE[venta.estado_pago] || ESTADO_BADGE.Pendiente;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-GT", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Modal Toolbar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#041954]" />
            <span className="text-sm font-bold text-gray-900">
              Comprobante de Factura: {venta.folio_factura || `ID #${venta.id_venta}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Descargar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div ref={printRef} className="p-8 overflow-y-auto space-y-6 bg-white text-gray-800 text-sm">
          {/* Header de la Factura */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-200 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 bg-[#041954] text-white rounded-xl flex items-center justify-center font-black text-base shadow-sm">
                  MV
                </div>
                <h1 className="text-2xl font-black text-[#041954] tracking-tight">MYVEKTOR ERP</h1>
              </div>
              <p className="text-xs text-gray-500 font-medium">Soluciones en Logística y Transporte Pesado</p>
              <p className="text-xs text-gray-400 mt-1">Guatemala, C.A. · PBX: (502) 2200-0000</p>
              <p className="text-xs text-gray-400">soporte@myvektor.com · www.myvektor.com</p>
            </div>

            <div className="text-right flex flex-col items-start sm:items-end">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Documento Tributario
              </span>
              <span className="text-xl font-black text-gray-900 font-mono">
                {venta.folio_factura || `FAC-${venta.id_venta}`}
              </span>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Información del Cliente y Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
            {/* Receptor */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Facturado a (Cliente)
              </span>
              <p className="text-base font-bold text-gray-900">
                {venta.cliente_nombre || venta.cliente?.nombre || "Consumidor Final"}
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-700">NIT:</span>{" "}
                {venta.cliente_nit || venta.cliente?.nit || "C/F"}
              </p>
              {(venta.cliente_telefono || venta.cliente?.telefono) && (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">Tel:</span>{" "}
                  {venta.cliente_telefono || venta.cliente?.telefono}
                </p>
              )}
              {(venta.cliente_direccion || venta.cliente?.direccion) && (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Dirección:</span>{" "}
                  {venta.cliente_direccion || venta.cliente?.direccion}
                </p>
              )}
            </div>

            {/* Fechas y Método */}
            <div className="space-y-1.5 sm:text-right flex flex-col sm:items-end">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fechas y Pago
              </span>
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-700">Emisión:</span> {formatDate(venta.fecha_emision)}
              </p>
              {venta.fecha_vencimiento && (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">Vencimiento:</span>{" "}
                  {formatDate(venta.fecha_vencimiento)}
                </p>
              )}
              {venta.fecha_pago && (
                <p className="text-xs text-emerald-700 font-semibold">
                  <span>Fecha de Cobro:</span> {formatDate(venta.fecha_pago)}
                </p>
              )}
              {venta.metodo_pago && (
                <p className="text-xs text-gray-600 flex items-center gap-1 sm:justify-end">
                  <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                  <span>Método: {venta.metodo_pago}</span>
                </p>
              )}
            </div>
          </div>

          {/* Información de Transporte / Vehículo */}
          {(venta.vehiculo || venta.concepto_servicio) && (
            <div className="flex items-center gap-4 px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100/60 text-xs">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-semibold text-gray-700">Concepto de Operación:</span>{" "}
                <span className="font-bold text-[#041954]">{venta.concepto_servicio}</span>
              </div>
              {venta.vehiculo && (
                <div className="ml-auto text-gray-600">
                  <span className="font-semibold">Unidad Asignada:</span> Placa{" "}
                  <span className="font-bold text-gray-900">{venta.vehiculo.placa}</span> (
                  {venta.vehiculo.marca} {venta.vehiculo.modelo})
                </div>
              )}
            </div>
          )}

          {/* Tabla de Conceptos / Items */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Descripción del Servicio / Producto</th>
                  <th className="py-3 px-4 text-center w-20">Cant.</th>
                  <th className="py-3 px-4 text-right w-28">Precio Unit.</th>
                  <th className="py-3 px-4 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Línea Principal del Servicio */}
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-900">
                    <div>
                      <p className="font-bold text-gray-900">{venta.concepto_servicio}</p>
                      {venta.observaciones && (
                        <p className="text-gray-500 text-[11px] mt-0.5">{venta.observaciones}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-700">1</td>
                  <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                    Q {venta.subtotal.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                    Q {venta.subtotal.toFixed(2)}
                  </td>
                </tr>

                {/* Items adicionales si existen */}
                {venta.detalles &&
                  venta.detalles.map((d, index) => (
                    <tr key={index} className="bg-gray-50/40">
                      <td className="py-2.5 px-4 text-gray-700">
                        {d.producto?.descripcion || `Producto ID #${d.id_producto}`} (
                        {d.producto?.codigo || "N/A"})
                      </td>
                      <td className="py-2.5 px-4 text-center text-gray-600">{d.cantidad}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600">
                        Q {d.precio_unit.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-800">
                        Q {d.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Totales y Liquidación */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                <span>Subtotal Neto</span>
                <span className="font-semibold text-gray-900">Q {venta.subtotal.toFixed(2)}</span>
              </div>

              {venta.impuesto > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                  <span>Impuesto / IVA</span>
                  <span className="font-semibold text-gray-900">+ Q {venta.impuesto.toFixed(2)}</span>
                </div>
              )}

              {venta.descuento > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-700 font-medium">
                  <span>Descuento Aplicado</span>
                  <span>- Q {venta.descuento.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between py-2.5 px-3 bg-[#041954] text-white rounded-xl text-sm font-bold shadow-sm">
                <span>TOTAL A PAGAR</span>
                <span className="text-base font-extrabold">Q {venta.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Firmas y Sellos */}
          <div className="pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-[11px] text-gray-400">
            <div className="space-y-1">
              <div className="border-b border-gray-300 w-40 mx-auto mb-2"></div>
              <p className="font-bold text-gray-600">Emitido por</p>
              <p>{venta.usuario?.nombre || "Administración MyVektor"}</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-gray-300 w-40 mx-auto mb-2"></div>
              <p className="font-bold text-gray-600">Recibido Conforme</p>
              <p>Firma y Sello de Cliente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VentaDetalleModal;
