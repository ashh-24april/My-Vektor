
import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Truck,
  Receipt,
  Calendar,
} from "lucide-react";
import {
  getTransacciones,
  anularTransaccion,
  type TransaccionFinanzas,
  type TipoTransaccion,
  type CategoriaFinanzas,
} from "../../../api/finanzas";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";
import TransaccionModal from "../components/TransaccionModal";
import RegistrarPagoModal from "../components/RegistrarPagoModal";
import ExportDropdown from "../../../components/ExportDropdown";
import { type ExportColumn } from "../../../utils/exportUtils";

interface TransaccionesTabProps {
  onDataChanged?: () => void;
}

const CATEGORIAS_TODAS: CategoriaFinanzas[] = [
  "Flete Cobrado",
  "Venta Repuestos",
  "Servicio Mecánico",
  "Combustible",
  "Viáticos Piloto",
  "Peajes",
  "Compra Repuestos",
  "Mantenimiento Taller",
  "Planilla",
  "Seguros",
  "Alquiler/Servicios",
  "Otros Ingresos",
  "Otros Egresos",
];

const TransaccionesTab: React.FC<TransaccionesTabProps> = ({ onDataChanged }) => {
  const { user } = useAuthStore();
  const canEdit = hasPermission(user, "Finanzas", "editar") || hasPermission(user, "Finanzas", "crear");

  const [transacciones, setTransacciones] = useState<TransaccionFinanzas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("Todos");
  const [filterCategoria, setFilterCategoria] = useState<string>("Todas");
  const [filterEstado, setFilterEstado] = useState<string>("Todos");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransaccion, setSelectedTransaccion] = useState<TransaccionFinanzas | null>(null);
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [itemParaPago, setItemParaPago] = useState<TransaccionFinanzas | null>(null);
  const [defaultTipoModal, setDefaultTipoModal] = useState<TipoTransaccion>("Ingreso");

  const loadTransacciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransacciones({
        q: search || undefined,
        tipo: filterTipo !== "Todos" ? filterTipo : undefined,
        categoria: filterCategoria !== "Todas" ? filterCategoria : undefined,
        estado: filterEstado !== "Todos" ? filterEstado : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page,
        limit: 20,
      });

      setTransacciones(res.data || []);
      setTotalPages(res.meta.totalPages || 1);
      setTotalCount(res.meta.total || 0);
    } catch (err) {
      console.error("[TransaccionesTab] Error load:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterTipo, filterCategoria, filterEstado, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    loadTransacciones();
  }, [loadTransacciones]);

  const handleOpenNew = (tipo: TipoTransaccion) => {
    setSelectedTransaccion(null);
    setDefaultTipoModal(tipo);
    setModalOpen(true);
  };

  const handleEdit = (t: TransaccionFinanzas) => {
    setSelectedTransaccion(t);
    setDefaultTipoModal(t.tipo);
    setModalOpen(true);
  };

  const handleOpenPago = (t: TransaccionFinanzas) => {
    setItemParaPago(t);
    setModalPagoOpen(true);
  };

  const handleAnular = async (t: TransaccionFinanzas) => {
    if (!window.confirm(`¿Estás seguro de anular la transacción ${t.codigo_transaccion} (${t.concepto})?`)) {
      return;
    }
    try {
      await anularTransaccion(t.id_transaccion);
      loadTransacciones();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("[TransaccionesTab] Error anular:", err);
      alert("No se pudo anular la transacción.");
    }
  };

  const handleSuccess = () => {
    loadTransacciones();
    if (onDataChanged) onDataChanged();
  };

  // Definición de columnas para ExportDropdown
  const exportColumns: ExportColumn<TransaccionFinanzas>[] = [
    { header: "Folio", accessor: (r) => r.codigo_transaccion || "" },
    { header: "Tipo", accessor: (r) => r.tipo },
    { header: "Categoría", accessor: (r) => r.categoria },
    { header: "Concepto", accessor: (r) => r.concepto },
    { header: "Monto Total (Q)", accessor: (r) => Number(r.monto || 0).toFixed(2) },
    { header: "Monto Pagado (Q)", accessor: (r) => Number(r.monto_pagado || 0).toFixed(2) },
    { header: "Saldo Pendiente (Q)", accessor: (r) => Math.max(0, Number(r.monto || 0) - Number(r.monto_pagado || 0)).toFixed(2) },
    { header: "Estado", accessor: (r) => r.estado },
    { header: "Fecha", accessor: (r) => r.fecha?.substring(0, 10) || "" },
    { header: "Vencimiento", accessor: (r) => r.fecha_vencimiento?.substring(0, 10) || "N/A" },
    { header: "Método Pago", accessor: (r) => r.metodo_pago || "N/A" },
    { header: "No. Comprobante", accessor: (r) => r.num_comprobante || "N/A" },
    { header: "Cliente / Proveedor", accessor: (r) => r.cliente?.nombre || r.proveedor?.nombre || "General" },
    { header: "Vehículo", accessor: (r) => r.vehiculo?.placa || "N/A" },
  ];

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acciones */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por folio, concepto, comprobante, cliente o placa..."
            className="w-full pl-10 pr-4 py-2 bg-white text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo */}
          <select
            value={filterTipo}
            onChange={(e) => {
              setFilterTipo(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-white text-gray-800 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Todos">Todos los Tipos</option>
            <option value="Ingreso">Solo Ingresos (+)</option>
            <option value="Egreso">Solo Egresos (-)</option>
          </select>

          {/* Categoría */}
          <select
            value={filterCategoria}
            onChange={(e) => {
              setFilterCategoria(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-white text-gray-800 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Todas">Todas las Categorías</option>
            {CATEGORIAS_TODAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={filterEstado}
            onChange={(e) => {
              setFilterEstado(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-white text-gray-800 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="Todos">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Cobrado Parcial">Cobrado Parcial</option>
            <option value="Cobrado Total">Cobrado Total</option>
            <option value="Pagado">Pagado</option>
            <option value="Vencido">Vencido</option>
          </select>

          {/* Rango de Fechas */}
          <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-800">
            <span className="text-gray-400 text-xs font-semibold">Del:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-gray-800 focus:outline-none text-xs"
            />
            <span className="text-gray-400 text-xs font-semibold">Al:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-gray-800 focus:outline-none text-xs"
            />
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={loadTransacciones}
            disabled={loading}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium p-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
            title="Refrescar transacciones"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Exportación Excel y CSV */}
          <ExportDropdown<TransaccionFinanzas>
            data={transacciones}
            columns={exportColumns}
            filename="flujo_caja_transacciones"
            modulo="Finanzas"
            buttonText="Exportar"
          />

          {/* Botones de Nueva Transacción */}
          {canEdit && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenNew("Ingreso")}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-3.5 py-2 rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>+ Ingreso</span>
              </button>
              <button
                onClick={() => handleOpenNew("Egreso")}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-3.5 py-2 rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>- Egreso</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Transacciones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider py-3.5 px-4 border-b border-gray-100">
                <th className="py-3.5 px-4">Folio / Fecha</th>
                <th className="py-3.5 px-4">Tipo & Categoría</th>
                <th className="py-3.5 px-4">Concepto / Referencia</th>
                <th className="py-3.5 px-4">Tercero / Unidad</th>
                <th className="py-3.5 px-4 text-right">Monto Total</th>
                <th className="py-3.5 px-4 text-right">Pagado / Saldo</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Cargando transacciones financieras...
                  </td>
                </tr>
              ) : transacciones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No se encontraron transacciones financieras con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                transacciones.map((t) => {
                  const montoNum = Number(t.monto || 0);
                  const pagadoNum = Number(t.monto_pagado || 0);
                  const saldoNum = Math.max(0, montoNum - pagadoNum);

                  return (
                    <tr
                      key={t.id_transaccion}
                      className="hover:bg-gray-50/60 dark:hover:bg-dark-bg/40 transition-colors"
                    >
                      {/* Folio y Fecha */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-gray-900 dark:text-white">
                          {t.codigo_transaccion}
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {t.fecha ? t.fecha.substring(0, 10) : ""}
                        </div>
                      </td>

                      {/* Tipo & Categoría */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {t.tipo === "Ingreso" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                              <TrendingUp className="w-3 h-3" />
                              Ingreso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                              <TrendingDown className="w-3 h-3" />
                              Egreso
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mt-1">
                          {t.categoria}
                        </div>
                      </td>

                      {/* Concepto / Referencia */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {t.concepto}
                        </div>
                        {t.num_comprobante && (
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                            <Receipt className="w-3 h-3 flex-shrink-0" />
                            <span>Doc: {t.num_comprobante}</span>
                          </div>
                        )}
                      </td>

                      {/* Tercero / Unidad */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {t.cliente ? (
                          <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {t.cliente.nombre}
                          </div>
                        ) : t.proveedor ? (
                          <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {t.proveedor.nombre}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">General</span>
                        )}
                        {t.vehiculo && (
                          <div className="text-[11px] text-primary dark:text-primary-light flex items-center gap-1 mt-0.5">
                            <Truck className="w-3 h-3" />
                            {t.vehiculo.placa} ({t.vehiculo.marca})
                          </div>
                        )}
                      </td>

                      {/* Monto Total */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-sm ${
                            t.tipo === "Ingreso"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {t.tipo === "Ingreso" ? "+Q" : "-Q"}
                          {montoNum.toFixed(2)}
                        </span>
                      </td>

                      {/* Pagado / Saldo */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px]">
                        <div className="text-gray-600 dark:text-gray-300">
                          Pag: <span className="font-bold">Q{pagadoNum.toFixed(2)}</span>
                        </div>
                        {saldoNum > 0 && (
                          <div className="text-amber-600 dark:text-amber-400 font-semibold">
                            Pend: Q{saldoNum.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {t.estado === "Cobrado Total" || t.estado === "Pagado" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {t.estado}
                          </span>
                        ) : t.estado === "Cobrado Parcial" || t.estado === "Pendiente" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            {t.estado}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                            {t.estado}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Registrar Pago si queda saldo */}
                          {canEdit && saldoNum > 0 && t.estado !== "Anulado" && (
                            <button
                              onClick={() => handleOpenPago(t)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                              title="Registrar Cobro / Abono"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => handleEdit(t)}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                              title="Editar transacción"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {canEdit && t.estado !== "Anulado" && (
                            <button
                              onClick={() => handleAnular(t)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="Anular transacción"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 border-t border-gray-100 dark:border-dark-border flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Mostrando {transacciones.length} de {totalCount} transacciones
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-bg disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {modalOpen && (
        <TransaccionModal
          transaccion={selectedTransaccion}
          defaultTipo={defaultTipoModal}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccess}
          canEdit={canEdit}
        />
      )}

      {modalPagoOpen && itemParaPago && (
        <RegistrarPagoModal
          item={itemParaPago}
          onClose={() => {
            setModalPagoOpen(false);
            setItemParaPago(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default TransaccionesTab;
