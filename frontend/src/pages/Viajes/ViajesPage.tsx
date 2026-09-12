
import React, { useState, useEffect, useCallback } from "react";
import {
  Navigation,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronDown,
  Truck,
  UserCheck,
  Building2,
  MapPin,
  DollarSign,
  Fuel,
  FileSpreadsheet,
  CheckCircle2,
  Play,
} from "lucide-react";
import {
  getViajes,
  getViajesKPIs,
  deleteViaje,
  updateViajeEstado,
  type Viaje,
  type EstadoViaje,
  type ViajesKPIs,
} from "../../api/viajes";
import { hasPermission } from "../../types/auth";
import { useAuthStore } from "../../store/authStore";
import ViajeModal from "./components/ViajeModal";
import LiquidacionModal from "./components/LiquidacionModal";
import ExportDropdown from "../../components/ExportDropdown";
import { type ExportColumn } from "../../utils/exportUtils";

const VIAJES_COLUMNS: ExportColumn<Viaje>[] = [
  { header: "Folio Viaje", accessor: "codigo_viaje" },
  { header: "Cliente", accessor: row => row.cliente?.nombre || "General" },
  { header: "Origen", accessor: "origen" },
  { header: "Destino", accessor: "destino" },
  { header: "Unidad", accessor: row => row.vehiculo?.placa || "N/A" },
  { header: "Piloto", accessor: row => row.piloto ? `${row.piloto.nombre} ${row.piloto.apellido}` : "N/A" },
  { header: "Tipo Carga", accessor: "tipo_carga" },
  { header: "Fecha Salida", accessor: row => (row.fecha_salida ? new Date(row.fecha_salida).toLocaleDateString("es-GT") : "") },
  { header: "Flete (Q)", accessor: "monto_flete", format: v => Number(v || 0).toFixed(2) },
  { header: "Gastos (Q)", accessor: "costo_total", format: v => Number(v || 0).toFixed(2) },
  { header: "Estado", accessor: "estado" },
];

const ESTADO_BADGES: Record<EstadoViaje, { bg: string; text: string; dot: string }> = {
  Programado:        { bg: "bg-slate-100 border-slate-200",     text: "text-slate-700",   dot: "bg-slate-500" },
  "En Ruta":         { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    dot: "bg-blue-500 animate-pulse" },
  "En Carga/Descarga":{ bg: "bg-purple-50 border-purple-200",   text: "text-purple-700",  dot: "bg-purple-500" },
  Completado:        { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  Liquidado:         { bg: "bg-teal-50 border-teal-200",       text: "text-teal-800",    dot: "bg-teal-600" },
  Cancelado:         { bg: "bg-red-50 border-red-200",        text: "text-red-700",     dot: "bg-red-500" },
};

const ViajesPage: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Viajes", "crear");
  const canEdit   = hasPermission(user, "Viajes", "editar");
  const canDelete = hasPermission(user, "Viajes", "eliminar");

  const [viajes, setViajes]           = useState<Viaje[]>([]);
  const [kpis, setKpis]               = useState<ViajesKPIs | null>(null);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Filtros
  const [q, setQ]                     = useState("");
  const [estadoFilter, setEstado]     = useState("todos");
  const [page, setPage]               = useState(1);

  // Modales
  const [modalViaje, setModalViaje]   = useState<{ open: boolean; viaje: Viaje | null }>({
    open: false,
    viaje: null,
  });
  const [liquidacionViaje, setLiquidacionViaje] = useState<Viaje | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Viaje | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const loadViajesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, kpisData] = await Promise.all([
        getViajes({
          q: q || undefined,
          estado: estadoFilter,
          page,
          limit: 15,
        }),
        getViajesKPIs().catch(() => null),
      ]);
      setViajes(res.viajes);
      setTotal(res.total);
      if (kpisData) setKpis(kpisData);
    } catch {
      setError("No se pudieron cargar los viajes.");
    } finally {
      setLoading(false);
    }
  }, [q, estadoFilter, page]);

  useEffect(() => {
    loadViajesData();
  }, [loadViajesData]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteViaje(confirmDelete.id_viaje);
      setConfirmDelete(null);
      loadViajesData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al desactivar viaje.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCambiarEstadoRapido = async (viaje: Viaje, nuevoEstado: EstadoViaje) => {
    try {
      await updateViajeEstado(viaje.id_viaje, { estado: nuevoEstado });
      loadViajesData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al cambiar estado.");
    }
  };

  // Verificar permiso de módulo
  if (!hasPermission(user, "Viajes", "ver")) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Navigation className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tienes acceso al módulo de viajes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── KPIS SUPERIORES EN TIEMPO REAL ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* En Ruta */}
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">En Ruta</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Play className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-950">{kpis?.viajesEnRuta ?? 0}</span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Viajes en tránsito</p>
          </div>
        </div>

        {/* Programados */}
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Programados</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900">{kpis?.viajesProgramados ?? 0}</span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">En espera de salida</p>
          </div>
        </div>

        {/* Completados */}
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Completados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700">{kpis?.viajesCompletados ?? 0}</span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Entregas exitosas</p>
          </div>
        </div>

        {/* Fletes Totales */}
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#041954]">Total Fletes</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#041954] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[#041954]">
              Q {Number(kpis?.totalFletes || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Facturación estimada</p>
          </div>
        </div>

        {/* Galones de Combustible */}
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Combustible</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-900">
              {Number(kpis?.totalGalones || 0).toLocaleString()} Gal
            </span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Consumo acumulado</p>
          </div>
        </div>
      </div>

      {/* ─── FILTROS Y ACCIONES ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por folio, ruta, cliente, piloto o placa..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="relative">
          <select
            value={estadoFilter}
            onChange={e => { setEstado(e.target.value); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="todos">Todos los estados</option>
            <option value="Programado">Programado</option>
            <option value="En Ruta">En Ruta</option>
            <option value="En Carga/Descarga">En Carga/Descarga</option>
            <option value="Completado">Completado</option>
            <option value="Liquidado">Liquidado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => loadViajesData()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          title="Refrescar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <ExportDropdown
          data={viajes}
          columns={VIAJES_COLUMNS}
          filename={`Reporte_Viajes_Fletes_${new Date().toISOString().split("T")[0]}`}
          sheetName="Viajes"
          modulo="Viajes"
        />

        {canCreate && (
          <button
            onClick={() => setModalViaje({ open: true, viaje: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors ml-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Programar Viaje</span>
          </button>
        )}
      </div>

      {/* ─── TABLA DE VIAJES ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando lista de fletes y viajes...
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : viajes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No se encontraron órdenes de viaje.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Folio & Cliente</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Ruta / Itinerario</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Unidad & Piloto</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Flete & Gastos</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {viajes.map(v => {
                  const badge = ESTADO_BADGES[v.estado] || ESTADO_BADGES.Programado;

                  return (
                    <tr key={v.id_viaje} className="hover:bg-gray-50/60 transition-colors">
                      {/* Folio & Cliente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {v.codigo_viaje}
                          </span>
                        </div>
                        <div className="text-xs text-gray-700 font-semibold mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span>{v.cliente?.nombre || "Cliente General"}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{v.tipo_carga}</span>
                      </td>

                      {/* Ruta */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs font-medium text-gray-900">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{v.origen}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-gray-900 pl-4">
                            <span>&darr; {v.destino}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 pl-4">
                            Salida: {new Date(v.fecha_salida).toLocaleDateString("es-GT")}
                          </p>
                        </div>
                      </td>

                      {/* Unidad & Piloto */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-800">
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{v.vehiculo?.placa || "Sin unidad"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{v.piloto ? `${v.piloto.nombre} ${v.piloto.apellido}` : "Sin piloto"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {v.estado}
                        </span>

                        {/* Cambios rápidos de estado */}
                        {canEdit && v.estado === "Programado" && (
                          <button
                            onClick={() => handleCambiarEstadoRapido(v, "En Ruta")}
                            className="block mt-1 text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            &rarr; Iniciar Ruta
                          </button>
                        )}
                        {canEdit && v.estado === "En Ruta" && (
                          <button
                            onClick={() => handleCambiarEstadoRapido(v, "En Carga/Descarga")}
                            className="block mt-1 text-[10px] font-bold text-purple-600 hover:underline"
                          >
                            &rarr; En Carga/Descarga
                          </button>
                        )}
                      </td>

                      {/* Flete & Gastos */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-gray-900">
                          Q {Number(v.monto_flete || 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-red-600 font-medium">
                          Gastos: Q {Number(v.costo_total || 0).toFixed(2)}
                        </div>
                        {v.rendimiento_calculado ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {Number(v.rendimiento_calculado).toFixed(2)} KM/G
                          </span>
                        ) : null}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón Liquidación y Gastos */}
                          <button
                            onClick={() => setLiquidacionViaje(v)}
                            title="Liquidación y Gastos de Viaje"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => setModalViaje({ open: true, viaje: v })}
                              title="Editar orden de viaje"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete(v)}
                              title="Desactivar viaje"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
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

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Mostrando {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} de {total} viajes
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 15 >= total}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Viaje */}
      {modalViaje.open && (
        <ViajeModal
          viaje={modalViaje.viaje}
          onClose={() => setModalViaje({ open: false, viaje: null })}
          onSuccess={() => {
            setModalViaje({ open: false, viaje: null });
            loadViajesData();
          }}
          canEdit={canEdit || canCreate}
        />
      )}

      {/* Modal Liquidación / Gastos */}
      {liquidacionViaje && (
        <LiquidacionModal
          viaje={liquidacionViaje}
          onClose={() => setLiquidacionViaje(null)}
          onSuccess={() => {
            loadViajesData();
          }}
          canEdit={canEdit}
        />
      )}

      {/* Confirmar Desactivación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Desactivar Viaje</h3>
                <p className="text-xs text-gray-500">Se ocultará del listado operativo</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Desactivar la orden de viaje <strong>{confirmDelete.codigo_viaje}</strong> ({confirmDelete.origen} &rarr; {confirmDelete.destino})?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-70 cursor-pointer"
              >
                {deleting ? "Desactivando..." : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViajesPage;
