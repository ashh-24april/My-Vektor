
import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Truck,
  RefreshCw,
  ChevronDown,
  UserCheck,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import {
  getVehiculos,
  deleteVehiculo,
  type Vehiculo,
  type EstadoVehiculo,
} from "../../../api/operaciones";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";
import VehiculoModal from "../components/VehiculoModal";
import AsignacionModal from "../components/AsignacionModal";
import ExportDropdown from "../../../components/ExportDropdown";
import { type ExportColumn } from "../../../utils/exportUtils";

const VEHICULOS_COLUMNS: ExportColumn<Vehiculo>[] = [
  { header: "Placa", accessor: "placa" },
  { header: "Tipo", accessor: row => row.tipo || "Cabezal" },
  { header: "Marca", accessor: "marca" },
  { header: "Modelo", accessor: "modelo" },
  { header: "Año", accessor: "anio" },
  { header: "Estado", accessor: "estado" },
  { header: "Odómetro (KM)", accessor: "kilometraje" },
  { header: "Horómetro (Hrs)", accessor: row => row.horometro || 0 },
  { header: "Piloto Asignado", accessor: row => row.piloto_asignado ? `${row.piloto_asignado.nombre} ${row.piloto_asignado.apellido}` : "Sin asignar" },
  { header: "Venc. Seguro", accessor: row => row.venc_seguro ? new Date(row.venc_seguro).toLocaleDateString("es-GT") : "N/A" },
  { header: "Venc. Circulación", accessor: row => row.venc_circulacion ? new Date(row.venc_circulacion).toLocaleDateString("es-GT") : "N/A" },
];

const ESTADO_BADGES: Record<EstadoVehiculo, { bg: string; text: string; dot: string }> = {
  Disponible:        { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  "En Ruta":         { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    dot: "bg-blue-500" },
  "En Mantenimiento": { bg: "bg-amber-50 border-amber-200",    text: "text-amber-700",   dot: "bg-amber-500" },
  "Fuera de Servicio":{ bg: "bg-red-50 border-red-200",        text: "text-red-700",     dot: "bg-red-500" },
};

const VehiculosTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Operaciones", "crear");
  const canEdit   = hasPermission(user, "Operaciones", "editar");
  const canDelete = hasPermission(user, "Operaciones", "eliminar");

  const [vehiculos, setVehiculos]   = useState<Vehiculo[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Filtros
  const [q, setQ]                   = useState("");
  const [estadoFilter, setEstado]   = useState("todos");
  const [tipoFilter, setTipo]       = useState("todos");
  const [page, setPage]             = useState(1);

  // Modales
  const [formVehiculo, setFormVehiculo] = useState<{ open: boolean; vehiculo: Vehiculo | null }>({
    open: false,
    vehiculo: null,
  });
  const [asignarVehiculo, setAsignarVehiculo] = useState<Vehiculo | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<Vehiculo | null>(null);
  const [deleting, setDeleting]             = useState(false);

  const loadVehiculos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVehiculos({
        q: q || undefined,
        estado: estadoFilter,
        tipo: tipoFilter,
        page,
        limit: 15,
      });
      setVehiculos(res.vehiculos);
      setTotal(res.total);
    } catch {
      setError("No se pudieron cargar los vehículos.");
    } finally {
      setLoading(false);
    }
  }, [q, estadoFilter, tipoFilter, page]);

  useEffect(() => {
    loadVehiculos();
  }, [loadVehiculos]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteVehiculo(confirmDelete.id_vehiculo);
      setConfirmDelete(null);
      loadVehiculos();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al desactivar vehículo.");
    } finally {
      setDeleting(false);
    }
  };

  const isProximoAVencer = (fechaStr?: string | null) => {
    if (!fechaStr) return false;
    const diff = new Date(fechaStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days <= 30;
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por placa, marca, modelo o VIN..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Filtro de Estado */}
        <div className="relative">
          <select
            value={estadoFilter}
            onChange={e => { setEstado(e.target.value); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="todos">Todos los estados</option>
            <option value="Disponible">Disponible</option>
            <option value="En Ruta">En Ruta</option>
            <option value="En Mantenimiento">En Mantenimiento</option>
            <option value="Fuera de Servicio">Fuera de Servicio</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Filtro de Tipo */}
        <div className="relative">
          <select
            value={tipoFilter}
            onChange={e => { setTipo(e.target.value); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="todos">Todos los tipos</option>
            <option value="Cabezal">Cabezal</option>
            <option value="Camión Rígido">Camión Rígido</option>
            <option value="Remolque/Cisterna">Remolque/Cisterna</option>
            <option value="Plataforma">Plataforma</option>
            <option value="Furgón">Furgón</option>
            <option value="Pickup">Pickup</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => loadVehiculos()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          title="Refrescar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <ExportDropdown
          data={vehiculos}
          columns={VEHICULOS_COLUMNS}
          filename={`Reporte_Flota_Vehicular_${new Date().toISOString().split("T")[0]}`}
          sheetName="Flota"
          modulo="Operaciones"
        />

        {canCreate && (
          <button
            onClick={() => setFormVehiculo({ open: true, vehiculo: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors ml-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Unidad</span>
          </button>
        )}
      </div>

      {/* Tabla de Vehículos */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando unidades de flota...
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : vehiculos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No se encontraron unidades de transporte.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Placa / Unidad</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo & Ficha</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Piloto Asignado</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Odómetro</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Documentación</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehiculos.map(v => {
                  const badge = ESTADO_BADGES[v.estado] || ESTADO_BADGES.Disponible;
                  const docWarning = isProximoAVencer(v.venc_seguro) || isProximoAVencer(v.venc_circulacion) || isProximoAVencer(v.venc_revision);

                  return (
                    <tr key={v.id_vehiculo} className="hover:bg-gray-50/60 transition-colors">
                      {/* Placa */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-950 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {v.placa}
                          </span>
                        </div>
                      </td>

                      {/* Tipo & Ficha */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{v.marca} {v.modelo}</div>
                        <div className="text-xs text-gray-400">
                          {v.tipo || "Cabezal"} · Año {v.anio}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {v.estado}
                        </span>
                      </td>

                      {/* Piloto */}
                      <td className="py-3 px-4">
                        {v.piloto_asignado ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-medium text-gray-800">
                              {v.piloto_asignado.nombre} {v.piloto_asignado.apellido}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAsignarVehiculo(v)}
                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            + Asignar Piloto
                          </button>
                        )}
                      </td>

                      {/* Odómetro */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-gray-800">
                          {v.kilometraje.toLocaleString()} KM
                        </span>
                        {v.horometro ? (
                          <span className="block text-[10px] text-gray-400">{v.horometro} Hrs</span>
                        ) : null}
                      </td>

                      {/* Documentación Legal */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {docWarning ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Vencimiento &lt; 30d</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Vigente</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => setAsignarVehiculo(v)}
                                title="Asignar piloto"
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setFormVehiculo({ open: true, vehiculo: v })}
                                title="Editar unidad"
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete(v)}
                              title="Desactivar unidad"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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
              Mostrando {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} de {total} unidades
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

      {/* Modal Vehículo */}
      {formVehiculo.open && (
        <VehiculoModal
          vehiculo={formVehiculo.vehiculo}
          onClose={() => setFormVehiculo({ open: false, vehiculo: null })}
          onSuccess={() => {
            setFormVehiculo({ open: false, vehiculo: null });
            loadVehiculos();
          }}
          canEdit={canEdit || canCreate}
        />
      )}

      {/* Modal Asignar Piloto */}
      {asignarVehiculo && (
        <AsignacionModal
          vehiculo={asignarVehiculo}
          onClose={() => setAsignarVehiculo(null)}
          onSuccess={() => {
            setAsignarVehiculo(null);
            loadVehiculos();
          }}
        />
      )}

      {/* Confirmación de Desactivación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Desactivar Unidad</h3>
                <p className="text-xs text-gray-500">Se ocultará de la flota activa</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Desactivar la unidad con placa <strong>{confirmDelete.placa}</strong> ({confirmDelete.marca} {confirmDelete.modelo})?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50"
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

export default VehiculosTab;
