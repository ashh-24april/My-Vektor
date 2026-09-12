
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Phone,
} from "lucide-react";
import {
  getCuentasPorCobrar,
  type CuentaPorCobrar,
} from "../../../api/finanzas";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";
import RegistrarPagoModal from "../components/RegistrarPagoModal";
import ExportDropdown from "../../../components/ExportDropdown";
import { type ExportColumn } from "../../../utils/exportUtils";

interface CuentasCobrarTabProps {
  onDataChanged?: () => void;
}

const CuentasCobrarTab: React.FC<CuentasCobrarTabProps> = ({ onDataChanged }) => {
  const { user } = useAuthStore();
  const canEdit = hasPermission(user, "Finanzas", "editar") || hasPermission(user, "Finanzas", "crear");

  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVencimiento, setFilterVencimiento] = useState<string>("Todos");

  // Modal para cobro
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaPorCobrar | null>(null);

  const loadCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCuentasPorCobrar();
      setCuentas(res || []);
    } catch (err) {
      console.error("[CuentasCobrarTab] Error load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCuentas();
  }, [loadCuentas]);

  // Filtrado
  const filteredCuentas = useMemo(() => {
    return cuentas.filter((c) => {
      if (filterVencimiento !== "Todos" && c.estado_vencimiento !== filterVencimiento) {
        return false;
      }
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        c.codigo_transaccion.toLowerCase().includes(term) ||
        c.concepto.toLowerCase().includes(term) ||
        (c.num_comprobante && c.num_comprobante.toLowerCase().includes(term)) ||
        (c.cliente && c.cliente.nombre.toLowerCase().includes(term)) ||
        (c.cliente?.nit && c.cliente.nit.toLowerCase().includes(term))
      );
    });
  }, [cuentas, search, filterVencimiento]);

  // Resumen de Cartera
  const summary = useMemo(() => {
    let totalCartera = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    let totalVencidas = 0;

    for (const c of cuentas) {
      totalCartera += Number(c.monto_total || 0);
      totalCobrado += Number(c.monto_pagado || 0);
      totalPendiente += Number(c.saldo_pendiente || 0);
      if (c.estado_vencimiento === "Vencida") {
        totalVencidas += Number(c.saldo_pendiente || 0);
      }
    }

    return { totalCartera, totalCobrado, totalPendiente, totalVencidas };
  }, [cuentas]);

  const handleOpenCobro = (c: CuentaPorCobrar) => {
    setSelectedCuenta(c);
    setModalPagoOpen(true);
  };

  const handleSuccessPago = () => {
    loadCuentas();
    if (onDataChanged) onDataChanged();
  };

  // Exportación
  const exportColumns: ExportColumn<CuentaPorCobrar>[] = [
    { header: "Folio", accessor: (r) => r.codigo_transaccion },
    { header: "Cliente", accessor: (r) => r.cliente?.nombre || "Cliente General" },
    { header: "NIT", accessor: (r) => r.cliente?.nit || "N/A" },
    { header: "Teléfono", accessor: (r) => r.cliente?.telefono || "N/A" },
    { header: "Concepto", accessor: (r) => r.concepto },
    { header: "Categoría", accessor: (r) => r.categoria },
    { header: "No. Factura / Comprobante", accessor: (r) => r.num_comprobante || "N/A" },
    { header: "Monto Total (Q)", accessor: (r) => Number(r.monto_total || 0).toFixed(2) },
    { header: "Monto Cobrado (Q)", accessor: (r) => Number(r.monto_pagado || 0).toFixed(2) },
    { header: "Saldo Pendiente (Q)", accessor: (r) => Number(r.saldo_pendiente || 0).toFixed(2) },
    { header: "Fecha Emisión", accessor: (r) => r.fecha_emision?.substring(0, 10) || "" },
    { header: "Fecha Vencimiento", accessor: (r) => r.fecha_vencimiento?.substring(0, 10) || "N/A" },
    { header: "Estado Vencimiento", accessor: (r) => r.estado_vencimiento },
    { header: "Días Vencido", accessor: (r) => String(r.dias_vencido || 0) },
  ];

  return (
    <div className="space-y-4">
      {/* Tarjetas de Resumen de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cartera Total Facturada */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Cartera Total Emitida
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {summary.totalCartera.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <Receipt className="w-3 h-3 text-blue-500" /> Fletes y ventas a crédito
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Total Ya Cobrado */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Cobrado / Abonos
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {summary.totalCobrado.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Efectivo ingresado a banco
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Por Cobrar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Saldo Pendiente Cobro
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {summary.totalPendiente.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <DollarSign className="w-3 h-3 text-amber-500" /> {cuentas.length} documentos por liquidar
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Vencido */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Cartera Vencida
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Q {summary.totalVencidas.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" /> Gestión de cobro prioritaria
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, NIT, folio o comprobante..."
            className="w-full pl-10 pr-4 py-2 bg-white text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterVencimiento}
            onChange={(e) => setFilterVencimiento(e.target.value)}
            className="px-3.5 py-2 bg-white text-gray-800 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Todos">Todos los Vencimientos</option>
            <option value="Al Día">Al Día</option>
            <option value="Por Vencer">Por Vencer (Próx. 5 días)</option>
            <option value="Vencida">Vencidas</option>
          </select>

          <button
            onClick={loadCuentas}
            disabled={loading}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium p-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
            title="Refrescar cuentas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <ExportDropdown<CuentaPorCobrar>
            data={filteredCuentas}
            columns={exportColumns}
            filename="cuentas_por_cobrar_clientes"
            modulo="Finanzas"
            buttonText="Exportar Cartera"
          />
        </div>
      </div>

      {/* Tabla de Cuentas por Cobrar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider py-3.5 px-4 border-b border-gray-100">
                <th className="py-3.5 px-4">Folio / Doc</th>
                <th className="py-3.5 px-4">Cliente & Contacto</th>
                <th className="py-3.5 px-4">Concepto / Servicio</th>
                <th className="py-3.5 px-4">Emisión / Vencimiento</th>
                <th className="py-3.5 px-4 text-right">Monto Total</th>
                <th className="py-3.5 px-4 text-right">Cobrado</th>
                <th className="py-3.5 px-4 text-right">Saldo Pendiente</th>
                <th className="py-3.5 px-4 text-center">Estado Vencimiento</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Cargando cuentas por cobrar...
                  </td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                    No hay cuentas pendientes por cobrar con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredCuentas.map((c) => {
                  const totalNum = Number(c.monto_total || 0);
                  const pagadoNum = Number(c.monto_pagado || 0);
                  const saldoNum = Number(c.saldo_pendiente || 0);

                  return (
                    <tr
                      key={c.id_transaccion}
                      className="hover:bg-gray-50/60 dark:hover:bg-dark-bg/40 transition-colors"
                    >
                      {/* Folio y Documento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-gray-900 dark:text-white">
                          {c.codigo_transaccion}
                        </div>
                        {c.num_comprobante ? (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Receipt className="w-3 h-3" />
                            {c.num_comprobante}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Sin Doc.</span>
                        )}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {c.cliente?.nombre || "Cliente General"}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                          {c.cliente?.nit && <span>NIT: {c.cliente.nit}</span>}
                          {c.cliente?.telefono && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-3 h-3" />
                              {c.cliente.telefono}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Concepto */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {c.concepto}
                        </div>
                        <span className="text-[11px] text-gray-400">{c.categoria}</span>
                      </td>

                      {/* Emisión / Vencimiento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-gray-700 dark:text-gray-300">
                          Em: {c.fecha_emision?.substring(0, 10)}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Venc: {c.fecha_vencimiento?.substring(0, 10) || "Inmediato"}
                        </div>
                      </td>

                      {/* Monto Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-gray-900 dark:text-white">
                        Q{totalNum.toFixed(2)}
                      </td>

                      {/* Monto Cobrado */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400">
                        Q{pagadoNum.toFixed(2)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                        Q{saldoNum.toFixed(2)}
                      </td>

                      {/* Estado Vencimiento */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {c.estado_vencimiento === "Al Día" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Al Día
                          </span>
                        ) : c.estado_vencimiento === "Por Vencer" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            Por Vencer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="w-3 h-3" />
                            Vencida ({c.dias_vencido}d)
                          </span>
                        )}
                      </td>

                      {/* Acción Cobrar */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenCobro(c)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Registrar Cobro
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Pago/Cobro */}
      {modalPagoOpen && selectedCuenta && (
        <RegistrarPagoModal
          item={selectedCuenta}
          onClose={() => {
            setModalPagoOpen(false);
            setSelectedCuenta(null);
          }}
          onSuccess={handleSuccessPago}
        />
      )}
    </div>
  );
};

export default CuentasCobrarTab;
