import React, { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  FileText
} from "lucide-react";
import {
  getVentas,
  getVentasKPIs,
  anularVenta,
  type Venta,
  type VentasKPIs
} from "../../api/ventas";
import { useAuthStore } from "../../store/authStore";
import { hasPermission } from "../../types/auth";
import VentaFormModal from "./components/VentaFormModal";
import VentaDetalleModal from "./components/VentaDetalleModal";
import CambiarEstadoModal from "./components/CambiarEstadoModal";

const CONCEPTOS_FILTRO = [
  "Todos",
  "Flete",
  "Alquiler de Unidad",
  "Servicios de Taller",
  "Venta Directa",
  "Mantenimiento Externo"
];

const ESTADOS_PAGO_FILTRO = ["Todos", "Pagada", "Pendiente", "Anulada"];

const VentasPage: React.FC = () => {
  const { user } = useAuthStore();

  // Permisos granulares
  const canVer = hasPermission(user, "Ventas", "ver");
  const canCrear = hasPermission(user, "Ventas", "crear");
  const canEditar = hasPermission(user, "Ventas", "editar");
  const canEliminar = hasPermission(user, "Ventas", "eliminar");

  // State de Datos
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [kpis, setKpis] = useState<VentasKPIs>({
    totalVentasMes: 0,
    totalPendientesMonto: 0,
    totalPendientesCantidad: 0,
    totalPagadasMonto: 0,
    totalPagadasCantidad: 0,
    anuladasCount: 0
  });

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [conceptoFilter, setConceptoFilter] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detalleVenta, setDetalleVenta] = useState<Venta | null>(null);
  const [cambiarEstadoVenta, setCambiarEstadoVenta] = useState<Venta | null>(null);
  const [anulandoId, setAnulandoId] = useState<number | null>(null);

  // Cargar KPIs
  const loadKPIs = useCallback(async () => {
    setLoadingKPIs(true);
    try {
      const data = await getVentasKPIs();
      setKpis(data);
    } catch {
      // silencioso
    } finally {
      setLoadingKPIs(false);
    }
  }, []);

  // Cargar Ventas
  const loadVentas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVentas({
        q: search || undefined,
        estado_pago: estadoFilter !== "Todos" ? estadoFilter : undefined,
        concepto_servicio: conceptoFilter !== "Todos" ? conceptoFilter : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page,
        limit: 12
      });
      setVentas(data.ventas || []);
      setTotalRecords(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("No se pudieron cargar los registros de facturación.");
    } finally {
      setLoading(false);
    }
  }, [search, estadoFilter, conceptoFilter, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    if (canVer) {
      loadKPIs();
    }
  }, [canVer, loadKPIs]);

  useEffect(() => {
    if (canVer) {
      loadVentas();
    }
  }, [canVer, loadVentas]);

  // Manejador para anular venta
  const handleAnular = async (v: Venta) => {
    const confirmMsg = `¿Estás seguro de anular la factura ${v.folio_factura || `ID #${v.id_venta}`} por monto de Q${v.total.toFixed(2)}?`;
    if (!window.confirm(confirmMsg)) return;

    setAnulandoId(v.id_venta);
    try {
      await anularVenta(v.id_venta);
      loadVentas();
      loadKPIs();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al anular factura.");
    } finally {
      setAnulandoId(null);
    }
  };

  if (!canVer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
        <Receipt className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Acceso No Autorizado</h2>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          No cuentas con los permisos de visualización necesarios para consultar el módulo de Ventas y Facturación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECCIÓN 1: TARJETAS SUPERIORES DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas del Mes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Ventas del Mes
            </span>
            <p className="text-2xl font-black text-[#041954] mt-1">
              Q {loadingKPIs ? "..." : kpis.totalVentasMes.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Mes en curso
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Facturas Pendientes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Pendientes de Cobro
            </span>
            <p className="text-2xl font-black text-amber-900 mt-1">
              Q {loadingKPIs ? "..." : kpis.totalPendientesMonto.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" /> {kpis.totalPendientesCantidad} facturas por cobrar
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Facturas Pagadas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Cobrado este Mes
            </span>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              Q {loadingKPIs ? "..." : kpis.totalPagadasMonto.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> {kpis.totalPagadasCantidad} facturas liquidadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Facturas Anuladas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
              Facturas Anuladas
            </span>
            <p className="text-2xl font-black text-rose-900 mt-1">
              {loadingKPIs ? "..." : kpis.anuladasCount}
            </p>
            <span className="text-[11px] text-gray-400 font-medium mt-1 block">
              Sin efecto tributario
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-6 h-6" />
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
              placeholder="Buscar por folio, cliente o NIT..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-gray-50/50 text-gray-900 placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Botón Acción Nueva Venta (Permiso Crear) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadVentas();
                loadKPIs();
              }}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {canCrear && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Venta / Factura</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros Secundarios */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100 text-xs">
          {/* Filtro Estado de Pago */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Estado de Pago
            </label>
            <select
              value={estadoFilter}
              onChange={e => {
                setEstadoFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ESTADOS_PAGO_FILTRO.map(est => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Concepto */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Concepto Servicio
            </label>
            <select
              value={conceptoFilter}
              onChange={e => {
                setConceptoFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {CONCEPTOS_FILTRO.map(c => (
                <option key={c} value={c}>
                  {c}
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
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: TABLA PRINCIPAL INTERACTIVA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Cargando registros de facturación...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-xs">{error}</div>
        ) : ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">No se encontraron facturas o ventas</p>
            <p className="text-xs text-gray-400 max-w-sm mt-0.5">
              Ajusta los filtros de búsqueda o emite una nueva factura haciendo clic en "Nueva Venta / Factura".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Folio / Factura</th>
                  <th className="py-3.5 px-4">Cliente / Razón Social</th>
                  <th className="py-3.5 px-4">Concepto & Transporte</th>
                  <th className="py-3.5 px-4">Emisión & Venc.</th>
                  <th className="py-3.5 px-4 text-right">Monto Total</th>
                  <th className="py-3.5 px-4 text-center">Estado de Pago</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map(v => {
                  const isPagada = v.estado_pago === "Pagada";
                  const isPendiente = v.estado_pago === "Pendiente";
                  const isAnulada = v.estado_pago === "Anulada";

                  return (
                    <tr key={v.id_venta} className="hover:bg-slate-50/70 transition-colors">
                      {/* Folio */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                          {v.folio_factura || `ID #${v.id_venta}`}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 line-clamp-1">
                          {v.cliente_nombre || v.cliente?.nombre || "Consumidor Final"}
                        </p>
                        <span className="text-[11px] text-gray-500">
                          NIT: {v.cliente_nit || v.cliente?.nit || "C/F"}
                        </span>
                      </td>

                      {/* Concepto & Vehículo */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#041954]">{v.concepto_servicio}</p>
                        {v.vehiculo ? (
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Truck className="w-3 h-3 text-blue-600" />
                            {v.vehiculo.placa} ({v.vehiculo.marca})
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Servicio general</span>
                        )}
                      </td>

                      {/* Fechas */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <p className="font-medium">
                          {new Date(v.fecha_emision || v.fecha).toLocaleDateString("es-GT")}
                        </p>
                        {v.fecha_vencimiento && (
                          <p className="text-[11px] text-gray-400">
                            Vence: {new Date(v.fecha_vencimiento).toLocaleDateString("es-GT")}
                          </p>
                        )}
                      </td>

                      {/* Monto Total */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-extrabold text-sm text-gray-900">
                          Q {v.total.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {v.impuesto > 0 && (
                          <p className="text-[10px] text-gray-400">IVA incl. Q{v.impuesto.toFixed(2)}</p>
                        )}
                      </td>

                      {/* Badge de Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {isPagada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Pagada
                          </span>
                        )}
                        {isPendiente && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                        {isAnulada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Anulada
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ver Detalle / Imprimir */}
                          <button
                            onClick={() => setDetalleVenta(v)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Ver Comprobante / Imprimir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Cambiar Estado (Permiso Editar) */}
                          {canEditar && !isAnulada && (
                            <button
                              onClick={() => setCambiarEstadoVenta(v)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Cambiar Estado de Pago"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Anular (Permiso Eliminar) */}
                          {canEliminar && !isAnulada && (
                            <button
                              onClick={() => handleAnular(v)}
                              disabled={anulandoId === v.id_venta}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                              title="Anular Factura"
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
        {ventas.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <span>
              Total: <strong>{totalRecords}</strong> facturas registradas · Página{" "}
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
        <VentaFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadVentas();
            loadKPIs();
          }}
        />
      )}

      {detalleVenta && (
        <VentaDetalleModal
          venta={detalleVenta}
          onClose={() => setDetalleVenta(null)}
        />
      )}

      {cambiarEstadoVenta && (
        <CambiarEstadoModal
          venta={cambiarEstadoVenta}
          onClose={() => setCambiarEstadoVenta(null)}
          onSuccess={() => {
            setCambiarEstadoVenta(null);
            loadVentas();
            loadKPIs();
          }}
        />
      )}
    </div>
  );
};

export default VentasPage;
