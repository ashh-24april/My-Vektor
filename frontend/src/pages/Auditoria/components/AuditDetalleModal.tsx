import React from "react";
import { X, ShieldCheck, User, Globe, Calendar, Layers, Terminal } from "lucide-react";
import { type AuditLog } from "../../../api/auditoria";

interface AuditDetalleModalProps {
  log: AuditLog;
  onClose: () => void;
}

const ACCION_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  CREAR: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  NUEVO: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  EDITAR: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ACTUALIZAR: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ELIMINAR: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  ANULAR: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CANCELAR_OT: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  EXPORTAR: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  EXPORTAR_REPORTE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  EXPORTACION_REPORTE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LOGIN: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CAMBIO_ESTADO: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" }
};

const AuditDetalleModal: React.FC<AuditDetalleModalProps> = ({ log, onClose }) => {
  const badge = ACCION_CONFIG[log.accion] || {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200"
  };

  // Intentar parsear JSON de detalles
  let parsedDetails: any = null;
  let isJson = false;

  if (log.detalles_cambio) {
    try {
      parsedDetails = JSON.parse(log.detalles_cambio);
      isJson = typeof parsedDetails === "object" && parsedDetails !== null;
    } catch {
      parsedDetails = log.detalles_cambio;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Detalle del Registro de Auditoría #{log.id_auditoria}
              </h3>
              <p className="text-xs text-gray-500">Trazabilidad y seguridad de eventos del ERP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Fila 1: Acción, Módulo y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Tipo de Acción
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {log.accion}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-600" /> Módulo Afectado
              </span>
              <p className="font-bold text-gray-900 text-sm">{log.modulo}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" /> Fecha y Hora
              </span>
              <p className="font-semibold text-gray-800">
                {new Date(log.fecha_hora).toLocaleString("es-GT", {
                  dateStyle: "short",
                  timeStyle: "medium"
                })}
              </p>
            </div>
          </div>

          {/* Fila 2: Usuario y Red */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/40 p-4 rounded-2xl border border-blue-100">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-blue-600" /> Usuario Responsable
              </span>
              <p className="text-sm font-bold text-gray-900">{log.usuario_nombre}</p>
              <p className="text-gray-500">{log.usuario_email}</p>
              <span className="inline-block px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 font-semibold text-[10px]">
                Rol: {log.rol_usuario}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-600" /> Origen de la Solicitud
              </span>
              <p className="font-mono text-gray-800 font-semibold">IP: {log.ip_origen}</p>
              {log.navegador && (
                <p className="text-gray-500 line-clamp-2 text-[11px]" title={log.navegador}>
                  Agente: {log.navegador}
                </p>
              )}
              {log.registro_id && (
                <p className="text-gray-700">
                  <strong>ID Afectado:</strong> <span className="font-mono">{log.registro_id}</span>
                </p>
              )}
            </div>
          </div>

          {/* Descripción del Evento */}
          {log.descripcion && (
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Descripción del Evento
              </span>
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-gray-800 leading-relaxed font-medium">
                {log.descripcion}
              </div>
            </div>
          )}

          {/* Detalles Técnicos / Comparativo de Cambios */}
          {log.detalles_cambio && (
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-gray-500" /> Payload / Datos Modificados
              </span>
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-56">
                {isJson ? (
                  <pre>{JSON.stringify(parsedDetails, null, 2)}</pre>
                ) : (
                  <p className="whitespace-pre-wrap">{log.detalles_cambio}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditDetalleModal;
