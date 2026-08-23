import React, { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign
} from "lucide-react";
import {
  getOrdenes,
  getMecanicaKPIs,
  updateEstadoOrden,
  type OrdenTrabajo,
  type MecanicaKPIs
} from "../../api/mecanica";
import { useAuthStore } from "../../store/authStore";
import { hasPermission } from "../../types/auth";
import OTFormModal from "./components/OTFormModal";
import DespachoRepuestosModal from "./components/DespachoRepuestosModal";
import CerrarOTModal from "./components/CerrarOTModal";
import OTDetalleModal from "./components/OTDetalleModal";

const TIPOS_MANT_FILTRO = ["Todos", "Preventivo", "Correctivo", "Emergencia"];
const ESTADOS_OT_FILTRO = ["Todos", "Pendiente", "En Proceso", "Completada", "Cancelada"];

const MecanicaPage: React.FC = () => {
  const { user } = useAuthStore();

  // Permisos granulares
  const canVer = hasPermission(user, "Mecánica", "ver");
  const canCrear = hasPermission(user, "Mecánica", "crear");
  const canEditar = hasPermission(user, "Mecánica", "editar");
  const canEliminar = hasPermission(user, "Mecánica", "eliminar");

  // State de Datos
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [kpis, setKpis] = useState<MecanicaKPIs>({
    enProcesoCount: 0,
    pendientesCount: 0,
    completadasCount: 0,
    preventivosCount: 0,
    correctivosCount: 0,
    costoTotalMes: 0
  });

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detalleOT, setDetalleOT] = useState<OrdenTrabajo | null>(null);
  const [despachoOT, setDespachoOT] = useState<OrdenTrabajo | null>(null);
  const [cerrarOT, setCerrarOT] = useState<OrdenTrabajo | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);

  // Cargar KPIs
  const loadKPIs = useCallback(async () => {
    setLoadingKPIs(true);
    try {
      const data = await getMecanicaKPIs();
      setKpis(data);
    } catch {
      // silencioso
    } finally {
      setLoadingKPIs(false);
    }
  }, []);

  // Cargar Órdenes de Trabajo
  const loadOrdenes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrdenes({
        q: search || undefined,
        estado: estadoFilter !== "Todos" ? estadoFilter : undefined,
        tipo_mantenimiento: tipoFilter !== "Todos" ? tipoFilter : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page,
        limit: 12
      });
      setOrdenes(data.ordenes || []);
      setTotalRecords(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("No se pudieron cargar las órdenes de trabajo.");
    } finally {
      setLoading(false);
    }
  }, [search, estadoFilter, tipoFilter, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    if (canVer) {
      loadKPIs();
    }
  }, [canVer, loadKPIs]);

  useEffect(() => {
    if (canVer) {
      loadOrdenes();
    }
  }, [canVer, loadOrdenes]);

  // Cancelar / Anular OT
  const handleCancelarOT = async (ot: OrdenTrabajo) => {
    const confirmMsg = `¿Estás seguro de cancelar la Orden de Trabajo ${ot.numero_ot || `OT #${ot.id_orden}`}? La unidad volverá a quedar disponible.`;
    if (!window.confirm(confirmMsg)) return;

    setCancelandoId(ot.id_orden);
    try {
      await updateEstadoOrden(ot.id_orden, { estado: "Cancelada" });
      loadOrdenes();
      loadKPIs();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al cancelar la orden.");
    } finally {
      setCancelandoId(null);
    }
  };

  if (!canVer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
        <Wrench className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Acceso No Autorizado</h2>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          No cuentas con los permisos necesarios para visualizar el módulo de Mecánica y Mantenimiento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECCIÓN 1: TARJETAS KPIS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: En Taller */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              En Taller / En Proceso
            </span>
            <p className="text-2xl font-black text-[#041954] mt-1">
              {loadingKPIs ? "..." : kpis.enProcesoCount}
            </p>
            <span className="text-[11px] text-gray-500 font-semibold flex items-center gap-1 mt-1">
              <Truck className="w-3 h-3 text-blue-600" /> {kpis.pendientesCount} pendientes de ingreso
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Completados del Mes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Completados este Mes
            </span>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              {loadingKPIs ? "..." : kpis.completadasCount}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Unidades entregadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Preventivo vs Correctivo */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Preventivo vs Correctivo
            </span>
            <p className="text-xl font-black text-gray-900 mt-1">
              {loadingKPIs ? "..." : `${kpis.preventivosCount} Prev. / ${kpis.correctivosCount} Corr.`}
            </p>
            <span className="text-[11px] text-gray-500 font-medium mt-1 block">
              Distribución de servicios
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-gray-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Inversión en Taller */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              Inversión en Taller
            </span>
            <p className="text-2xl font-black text-indigo-950 mt-1">
              Q {loadingKPIs ? "..." : kpis.costoTotalMes.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-400 font-medium mt-1 block">
              Mano de obra + repuestos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <DollarSign className="w-6 h-6" />
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
              placeholder="Buscar por número de OT, placa, mecánico o diagnóstico..."
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
                loadOrdenes();
                loadKPIs();
              }}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refrescar órdenes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {canCrear && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Orden de Trabajo (OT)</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros Secundarios */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100 text-xs">
          {/* Filtro Estado */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Estado de la OT
            </label>
            <select
              value={estadoFilter}
              onChange={e => {
                setEstadoFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ESTADOS_OT_FILTRO.map(est => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo Mantenimiento */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Tipo de Servicio
            </label>
            <select
              value={tipoFilter}
              onChange={e => {
                setTipoFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TIPOS_MANT_FILTRO.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Ingreso Desde
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
              Ingreso Hasta
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

      {/* SECCIÓN 3: TABLA DE ÓRDENES DE TRABAJO */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Cargando órdenes de trabajo...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-xs">{error}</div>
        ) : ordenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">No se encontraron órdenes de trabajo</p>
            <p className="text-xs text-gray-400 max-w-sm mt-0.5">
              Crea una nueva OT haciendo clic en "Nueva Orden de Trabajo (OT)" para ingresar una unidad a taller.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">No. OT</th>
                  <th className="py-3.5 px-4">Unidad / Vehículo</th>
                  <th className="py-3.5 px-4">Mecánico Asignado</th>
                  <th className="py-3.5 px-4">Tipo & Diagnóstico</th>
                  <th className="py-3.5 px-4">Fechas</th>
                  <th className="py-3.5 px-4 text-right">Costo Total</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordenes.map(o => {
                  const isPendiente = o.estado === "Pendiente";
                  const isEnProceso = o.estado === "En Proceso";
                  const isCompletada = o.estado === "Completada";
                  const isCancelada = o.estado === "Cancelada";

                  return (
                    <tr key={o.id_orden} className="hover:bg-slate-50/70 transition-colors">
                      {/* No. OT */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                          {o.numero_ot || `OT #${o.id_orden}`}
                        </span>
                      </td>

                      {/* Vehículo */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{o.vehiculo?.placa}</p>
                        <span className="text-[11px] text-gray-500">
                          {o.vehiculo?.marca} {o.vehiculo?.modelo} {o.km_entrada ? `· ${o.km_entrada.toLocaleString()} km` : ""}
                        </span>
                      </td>

                      {/* Mecánico */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-800">
                          {o.mecanico?.nombre} {o.mecanico?.apellido}
                        </p>
                        {o.mecanico?.especialidad && (
                          <span className="text-[11px] text-gray-400">{o.mecanico.especialidad}</span>
                        )}
                      </td>

                      {/* Tipo & Diagnóstico */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-[#041954] block">{o.tipo_mantenimiento}</span>
                        <p className="text-[11px] text-gray-500 truncate" title={o.diagnostico_inicial || o.diagnostico || ""}>
                          {o.diagnostico_inicial || o.diagnostico || "Sin diagnóstico"}
                        </p>
                      </td>

                      {/* Fechas */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <p className="font-medium">
                          Ingreso: {new Date(o.fecha_ingreso).toLocaleDateString("es-GT")}
                        </p>
                        {o.fecha_estimada_entrega && !isCompletada && (
                          <p className="text-[11px] text-gray-400">
                            Est. Salida: {new Date(o.fecha_estimada_entrega).toLocaleDateString("es-GT")}
                          </p>
                        )}
                        {o.fecha_cierre && isCompletada && (
                          <p className="text-[11px] text-emerald-600 font-semibold">
                            Cerrada: {new Date(o.fecha_cierre).toLocaleDateString("es-GT")}
                          </p>
                        )}
                      </td>

                      {/* Costo Total */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-extrabold text-sm text-gray-900">
                          Q {o.costo_total.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {o.repuestos && o.repuestos.length > 0 && (
                          <p className="text-[10px] text-gray-400">
                            {o.repuestos.length} repuesto(s) Q{o.costo_repuestos.toFixed(2)}
                          </p>
                        )}
                      </td>

                      {/* Badge de Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {isPendiente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                        {isEnProceso && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Wrench className="w-3 h-3" /> En Proceso
                          </span>
                        )}
                        {isCompletada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Completada
                          </span>
                        )}
                        {isCancelada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Cancelada
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ver Detalle / Imprimir */}
                          <button
                            onClick={() => setDetalleOT(o)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Ver Orden / Imprimir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Despachar Repuestos (Permiso Editar y no cerrada) */}
                          {canEditar && !isCompletada && !isCancelada && (
                            <button
                              onClick={() => setDespachoOT(o)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Despachar Repuestos de Inventario"
                            >
                              <Package className="w-4 h-4" />
                            </button>
                          )}

                          {/* Finalizar / Actualizar Estado (Permiso Editar) */}
                          {canEditar && !isCancelada && (
                            <button
                              onClick={() => setCerrarOT(o)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Finalizar / Actualizar OT"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancelar OT (Permiso Eliminar) */}
                          {canEliminar && !isCompletada && !isCancelada && (
                            <button
                              onClick={() => handleCancelarOT(o)}
                              disabled={cancelandoId === o.id_orden}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                              title="Cancelar Orden de Trabajo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {ordenes.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <span>
              Total: <strong>{totalRecords}</strong> órdenes de trabajo · Página{" "}
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

      {/* MODALES */}
      {showCreateModal && (
        <OTFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOrdenes();
            loadKPIs();
          }}
        />
      )}

      {detalleOT && (
        <OTDetalleModal
          orden={detalleOT}
          onClose={() => setDetalleOT(null)}
        />
      )}

      {despachoOT && (
        <DespachoRepuestosModal
          orden={despachoOT}
          onClose={() => setDespachoOT(null)}
          onSuccess={() => {
            setDespachoOT(null);
            loadOrdenes();
            loadKPIs();
          }}
        />
      )}

      {cerrarOT && (
        <CerrarOTModal
          orden={cerrarOT}
          onClose={() => setCerrarOT(null)}
          onSuccess={() => {
            setCerrarOT(null);
            loadOrdenes();
            loadKPIs();
          }}
        />
      )}
    </div>
  );
};

export default MecanicaPage;
