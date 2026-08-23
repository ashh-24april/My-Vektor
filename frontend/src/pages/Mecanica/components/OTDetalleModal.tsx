import React, { useRef } from "react";
import { X, Printer, Wrench, Truck, FileText } from "lucide-react";
import { type OrdenTrabajo } from "../../../api/mecanica";

interface OTDetalleModalProps {
  orden: OrdenTrabajo;
  onClose: () => void;
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Pendiente: { label: "PENDIENTE DE INGRESO", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "En Proceso": { label: "EN MANTENIMIENTO", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Completada: { label: "TRABAJO COMPLETADO", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Cancelada: { label: "ORDEN CANCELADA", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" }
};

const OTDetalleModal: React.FC<OTDetalleModalProps> = ({ orden, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const badge = ESTADO_CONFIG[orden.estado] || ESTADO_CONFIG.Pendiente;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-GT", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Toolbar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#041954]" />
            <span className="text-sm font-bold text-gray-900">
              Orden de Trabajo: {orden.numero_ot || `OT #${orden.id_orden}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Descargar OT</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Container */}
        <div ref={printRef} className="p-8 overflow-y-auto space-y-6 bg-white text-gray-800 text-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-200 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 bg-[#041954] text-white rounded-xl flex items-center justify-center font-black text-base shadow-sm">
                  MV
                </div>
                <h1 className="text-2xl font-black text-[#041954] tracking-tight">MYVEKTOR ERP</h1>
              </div>
              <p className="text-xs text-gray-500 font-medium">Taller Central y Control de Flota Pesada</p>
              <p className="text-xs text-gray-400 mt-0.5">Módulo de Mantenimiento Preventivo y Correctivo</p>
            </div>

            <div className="text-right flex flex-col items-start sm:items-end">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Orden de Servicio
              </span>
              <span className="text-2xl font-black text-gray-900 font-mono">
                {orden.numero_ot || `OT-${orden.id_orden}`}
              </span>
              <div className="mt-1.5">
                <span
                  className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Datos del Vehículo y Personal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 text-xs">
            {/* Vehículo */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" /> Unidad / Vehículo
              </span>
              <p className="text-base font-extrabold text-gray-900">
                Placa: {orden.vehiculo?.placa || "N/A"}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Marca/Modelo:</span> {orden.vehiculo?.marca}{" "}
                {orden.vehiculo?.modelo} {orden.vehiculo?.tipo ? `(${orden.vehiculo.tipo})` : ""}
              </p>
              {orden.km_entrada && (
                <p className="text-gray-600">
                  <span className="font-semibold">Kilometraje Entrada:</span>{" "}
                  {orden.km_entrada.toLocaleString()} km
                </p>
              )}
            </div>

            {/* Mecánico y Fechas */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-blue-600" /> Asignación y Fechas
              </span>
              <p className="text-sm font-bold text-gray-900">
                Mecánico: {orden.mecanico?.nombre} {orden.mecanico?.apellido}
              </p>
              {orden.piloto && (
                <p className="text-gray-600">
                  <span className="font-semibold">Reportado por:</span> {orden.piloto.nombre}{" "}
                  {orden.piloto.apellido}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1 text-gray-600">
                <div>
                  <span className="font-semibold">Ingreso:</span> {formatDate(orden.fecha_ingreso)}
                </div>
                <div>
                  <span className="font-semibold">Entrega:</span>{" "}
                  {formatDate(orden.fecha_cierre || orden.fecha_estimada_entrega)}
                </div>
              </div>
            </div>
          </div>

          {/* Diagnóstico y Trabajos */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-gray-200 bg-white">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Diagnóstico Inicial / Falla Reportada
              </span>
              <p className="text-xs text-gray-800 leading-relaxed font-medium">
                {orden.diagnostico_inicial || orden.diagnostico || "Sin diagnóstico especificado."}
              </p>
            </div>

            {orden.trabajo_realizado && (
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                  Trabajo Técnico Efectuado
                </span>
                <p className="text-xs text-gray-800 leading-relaxed font-medium">
                  {orden.trabajo_realizado}
                </p>
              </div>
            )}
          </div>

          {/* Tabla de Repuestos Utilizados */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 font-bold text-xs text-gray-700 uppercase tracking-wider">
              Repuestos e Insumos Utilizados ({orden.repuestos?.length || 0})
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                  <th className="py-2.5 px-4">Código & Descripción</th>
                  <th className="py-2.5 px-4 text-center w-20">Cant.</th>
                  <th className="py-2.5 px-4 text-right w-28">Precio Unit.</th>
                  <th className="py-2.5 px-4 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orden.repuestos && orden.repuestos.length > 0 ? (
                  orden.repuestos.map(r => (
                    <tr key={r.id_producto}>
                      <td className="py-2.5 px-4 text-gray-800 font-medium">
                        <span className="font-mono text-gray-500 mr-2">{r.producto?.codigo}</span>
                        {r.producto?.descripcion}
                      </td>
                      <td className="py-2.5 px-4 text-center text-gray-600">
                        {r.cantidad} {r.producto?.unidad_medida}
                      </td>
                      <td className="py-2.5 px-4 text-right text-gray-600">
                        Q {r.precio_unit.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                        Q {r.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
                      No se han cargado repuestos a esta orden de trabajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Liquidación de Costos */}
          <div className="flex justify-end pt-1">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                <span>Costo Total Repuestos</span>
                <span className="font-semibold text-gray-900">Q {orden.costo_repuestos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                <span>Mano de Obra Taller</span>
                <span className="font-semibold text-gray-900">Q {orden.costo_mano_obra.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 px-3.5 bg-[#041954] text-white rounded-xl text-sm font-bold shadow-sm">
                <span>COSTO TOTAL OT</span>
                <span className="text-base font-extrabold">Q {orden.costo_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Firmas de Entrega y Recepción */}
          <div className="pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-[11px] text-gray-400">
            <div className="space-y-1">
              <div className="border-b border-gray-300 w-40 mx-auto mb-2"></div>
              <p className="font-bold text-gray-600">Mecánico Responsable</p>
              <p>
                {orden.mecanico?.nombre} {orden.mecanico?.apellido}
              </p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-gray-300 w-40 mx-auto mb-2"></div>
              <p className="font-bold text-gray-600">Jefe de Taller / Recibido</p>
              <p>Firma y Sello de Salida</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTDetalleModal;
