import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Activity
} from "lucide-react";
import {
  getAuditLogs,
  getAuditKPIs,
  type AuditLog,
  type AuditKPIs
} from "../../api/auditoria";
import ExportDropdown from "../../components/ExportDropdown";
import { type ExportColumn } from "../../utils/exportUtils";
import AuditDetalleModal from "./components/AuditDetalleModal";

const MODULOS_FILTRO = ["Todos", "Usuarios", "Inventario", "Ventas", "Mecánica", "Perfil", "Sistema"];
const ACCIONES_FILTRO = [
  "Todos",
  "CREAR",
  "EDITAR",
  "ELIMINAR",
  "ANULAR",
  "EXPORTAR",
  "EXPORTAR_REPORTE",
  "EXPORTACION_REPORTE",
  "LOGIN",
  "CAMBIO_ESTADO"
];

const ACCION_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  CREAR: { label: "CREAR", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  NUEVO: { label: "CREAR", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  EDITAR: { label: "EDITAR", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ACTUALIZAR: { label: "EDITAR", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ELIMINAR: { label: "ELIMINAR", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  ANULAR: { label: "ANULAR", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  CANCELAR_OT: { label: "CANCELAR", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  EXPORTAR: { label: "EXPORTAR", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  EXPORTAR_REPORTE: { label: "EXPORTAR", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  EXPORTACION_REPORTE: { label: "EXPORTAR", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LOGIN: { label: "LOGIN", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CAMBIO_ESTADO: { label: "ESTADO", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" }
};

const AUDIT_COLUMNS: ExportColumn<AuditLog>[] = [
  { header: "ID Log", accessor: "id_auditoria" },
  { header: "Fecha y Hora", accessor: row => new Date(row.fecha_hora).toLocaleString("es-GT") },
  { header: "Usuario", accessor: "usuario_nombre" },
  { header: "Correo", accessor: "usuario_email" },
  { header: "Rol", accessor: "rol_usuario" },
  { header: "Acción", accessor: "accion" },
  { header: "Módulo", accessor: "modulo" },
  { header: "Registro ID", accessor: row => row.registro_id || "N/A" },
  { header: "Descripción", accessor: row => row.descripcion || "" },
  { header: "Dirección IP", accessor: "ip_origen" },
  { header: "Navegador / Agente", accessor: row => row.navegador || "" }
];

const AuditoriaPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [kpis, setKpis] = useState<AuditKPIs>({
    totalAcciones: 0,
    cambiosCriticosMes: 0,
    exportacionesMes: 0,
    usuariosActivos: 0
  });

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [moduloFilter, setModuloFilter] = useState("Todos");
  const [accionFilter, setAccionFilter] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);

  // Modal
  const [detalleLog, setDetalleLog] = useState<AuditLog | null>(null);

  const loadKPIs = useCallback(async () => {
    setLoadingKPIs(true);
    try {
      const res = await getAuditKPIs();
      setKpis(res);
    } catch {
      // silent
    } finally {
      setLoadingKPIs(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs({
        q: search || undefined,
        modulo: moduloFilter !== "Todos" ? moduloFilter : undefined,
        accion: accionFilter !== "Todos" ? accionFilter : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page,
        limit: 15
      });
      setLogs(res.logs || []);
      setTotalRecords(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError("No se pudo cargar la bitácora de auditoría.");
    } finally {
      setLoading(false);
    }
  }, [search, moduloFilter, accionFilter, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* SECCIÓN 1: TARJETAS KPIS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Acciones */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Acciones Registradas
            </span>
            <p className="text-2xl font-black text-[#041954] mt-1">
              {loadingKPIs ? "..." : kpis.totalAcciones.toLocaleString()}
            </p>
            <span className="text-[11px] text-gray-500 font-medium mt-1 block">
              Eventos en la bitácora
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Cambios Críticos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
              Cambios Críticos del Mes
            </span>
            <p className="text-2xl font-black text-rose-900 mt-1">
              {loadingKPIs ? "..." : kpis.cambiosCriticosMes}
            </p>
            <span className="text-[11px] text-rose-700 font-semibold mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Eliminaciones y Anulaciones
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Exportaciones */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Exportaciones de Reportes
            </span>
            <p className="text-2xl font-black text-amber-900 mt-1">
              {loadingKPIs ? "..." : kpis.exportacionesMes}
            </p>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3" /> Descargas Excel / CSV
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Usuarios Activos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Usuarios Activos
            </span>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              {loadingKPIs ? "..." : kpis.usuariosActivos}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1">
              Cuentas con acceso
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: BARRA DE HERRAMIENTAS Y FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por usuario, correo, ID de registro o descripción..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-gray-50/50 text-gray-900 placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadLogs();
                loadKPIs();
              }}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refrescar bitácora"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <ExportDropdown
              data={logs}
              columns={AUDIT_COLUMNS}
              filename={`Bitacora_Auditoria_MyVektor_${new Date().toISOString().split("T")[0]}`}
              sheetName="BitacoraAuditoria"
              modulo="Bitácora de Auditoría"
            />
          </div>
        </div>

        {/* Filtros Secundarios */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100 text-xs">
          {/* Filtro Módulo */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Módulo
            </label>
            <select
              value={moduloFilter}
              onChange={e => {
                setModuloFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {MODULOS_FILTRO.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Acción */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Tipo de Acción
            </label>
            <select
              value={accionFilter}
              onChange={e => {
                setAccionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ACCIONES_FILTRO.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: TABLA DE LOGS DE AUDITORÍA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Cargando registros de auditoría...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-xs">{error}</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <ShieldCheck className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">No se encontraron eventos de auditoría</p>
            <p className="text-xs text-gray-400 max-w-sm mt-0.5">
              Los eventos y cambios en el sistema se registrarán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Usuario & Rol</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                  <th className="py-3.5 px-4">Módulo</th>
                  <th className="py-3.5 px-4">ID Afectado</th>
                  <th className="py-3.5 px-4 max-w-xs">Descripción del Evento</th>
                  <th className="py-3.5 px-4">IP Origen</th>
                  <th className="py-3.5 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => {
                  const badge = ACCION_BADGE[log.accion] || {
                    label: log.accion,
                    bg: "bg-gray-50",
                    text: "text-gray-700",
                    border: "border-gray-200"
                  };

                  return (
                    <tr key={log.id_auditoria} className="hover:bg-slate-50/70 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        <p className="font-semibold text-gray-900">
                          {new Date(log.fecha_hora).toLocaleDateString("es-GT")}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.fecha_hora).toLocaleTimeString("es-GT", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                      </td>

                      {/* Usuario */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#041954]/10 text-[#041954] flex items-center justify-center font-bold text-xs shrink-0">
                            {log.usuario_nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{log.usuario_nombre}</p>
                            <span className="text-[10px] text-gray-400">{log.rol_usuario}</span>
                          </div>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="py-3.5 px-4 font-semibold text-gray-800">{log.modulo}</td>

                      {/* ID Afectado */}
                      <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                        {log.registro_id || "—"}
                      </td>

                      {/* Descripción */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-[11px] text-gray-700 truncate" title={log.descripcion || ""}>
                          {log.descripcion || "Sin descripción"}
                        </p>
                      </td>

                      {/* IP */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-gray-500">{log.ip_origen}</td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDetalleLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold transition-colors"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <span>
              Total: <strong>{totalRecords}</strong> eventos de auditoría · Página{" "}
              <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent font-medium"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent font-medium"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {detalleLog && (
        <AuditDetalleModal log={detalleLog} onClose={() => setDetalleLog(null)} />
      )}
    </div>
  );
};

export default AuditoriaPage;
