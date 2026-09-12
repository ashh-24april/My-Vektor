
import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  ChevronDown,
  Phone,
  AlertTriangle,
  Truck,
} from "lucide-react";
import {
  getPilotos,
  deletePiloto,
  type Piloto,
  type EstadoPiloto,
} from "../../../api/operaciones";
import { hasPermission } from "../../../types/auth";
import { useAuthStore } from "../../../store/authStore";
import PilotoModal from "../components/PilotoModal";
import ExportDropdown from "../../../components/ExportDropdown";
import { type ExportColumn } from "../../../utils/exportUtils";

const PILOTOS_COLUMNS: ExportColumn<Piloto>[] = [
  { header: "Nombre Completo", accessor: row => `${row.nombre} ${row.apellido}` },
  { header: "DPI / CUI", accessor: "dpi" },
  { header: "Teléfono", accessor: row => row.telefono || "N/A" },
  { header: "Correo", accessor: row => row.correo || "N/A" },
  { header: "No. Licencia", accessor: "num_licencia" },
  { header: "Tipo Licencia", accessor: "tipo_licencia" },
  { header: "Vencimiento Licencia", accessor: row => (row.venc_licencia ? new Date(row.venc_licencia).toLocaleDateString("es-GT") : "") },
  { header: "Estado", accessor: "estado" },
  { header: "Unidades Asignadas", accessor: row => row.vehiculos_asignados?.map(v => v.placa).join(", ") || "Ninguna" },
];

const ESTADO_BADGES: Record<EstadoPiloto, { bg: string; text: string; dot: string }> = {
  Disponible:  { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  "En Viaje":   { bg: "bg-blue-50 border-blue-200",       text: "text-blue-700",    dot: "bg-blue-500" },
  "De Licencia":{ bg: "bg-amber-50 border-amber-200",    text: "text-amber-700",   dot: "bg-amber-500" },
  Inactivo:    { bg: "bg-red-50 border-red-200",        text: "text-red-700",     dot: "bg-red-500" },
};

const PilotosTab: React.FC = () => {
  const { user } = useAuthStore();
  const canCreate = hasPermission(user, "Operaciones", "crear");
  const canEdit   = hasPermission(user, "Operaciones", "editar");
  const canDelete = hasPermission(user, "Operaciones", "eliminar");

  const [pilotos, setPilotos]       = useState<Piloto[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Filtros
  const [q, setQ]                   = useState("");
  const [estadoFilter, setEstado]   = useState("todos");
  const [page, setPage]             = useState(1);

  // Modales
  const [formPiloto, setFormPiloto] = useState<{ open: boolean; piloto: Piloto | null }>({
    open: false,
    piloto: null,
  });
  const [confirmDelete, setConfirmDelete] = useState<Piloto | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const loadPilotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPilotos({
        q: q || undefined,
        estado: estadoFilter,
        page,
        limit: 15,
      });
      setPilotos(res.pilotos);
      setTotal(res.total);
    } catch {
      setError("No se pudieron cargar los pilotos.");
    } finally {
      setLoading(false);
    }
  }, [q, estadoFilter, page]);

  useEffect(() => {
    loadPilotos();
  }, [loadPilotos]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePiloto(confirmDelete.id_piloto);
      setConfirmDelete(null);
      loadPilotos();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al desactivar piloto.");
    } finally {
      setDeleting(false);
    }
  };

  const getLicenciaStatus = (fechaStr: string) => {
    const diff = new Date(fechaStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days < 0) {
      return { status: "expired", label: "Vencida", color: "text-red-700 bg-red-50 border-red-200" };
    }
    if (days <= 30) {
      return { status: "warning", label: `Vence en ${days}d`, color: "text-amber-700 bg-amber-50 border-amber-200" };
    }
    return { status: "ok", label: "Vigente", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, apellido, DPI o licencia..."
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
            <option value="Disponible">Disponible</option>
            <option value="En Viaje">En Viaje</option>
            <option value="De Licencia">De Licencia</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => loadPilotos()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
          title="Refrescar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <ExportDropdown
          data={pilotos}
          columns={PILOTOS_COLUMNS}
          filename={`Reporte_Pilotos_Operadores_${new Date().toISOString().split("T")[0]}`}
          sheetName="Pilotos"
          modulo="Operaciones"
        />

        {canCreate && (
          <button
            onClick={() => setFormPiloto({ open: true, piloto: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-colors ml-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Piloto</span>
          </button>
        )}
      </div>

      {/* Tabla de Pilotos */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando lista de pilotos...
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : pilotos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No se encontraron pilotos registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Operador / Piloto</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">DPI & Contacto</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Licencia Conducir</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Unidad Asignada</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pilotos.map(p => {
                  const badge = ESTADO_BADGES[p.estado] || ESTADO_BADGES.Disponible;
                  const licStatus = getLicenciaStatus(p.venc_licencia);

                  return (
                    <tr key={p.id_piloto} className="hover:bg-gray-50/60 transition-colors">
                      {/* Nombre */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{p.nombre} {p.apellido}</div>
                        <div className="text-xs text-gray-400">ID #{p.id_piloto}</div>
                      </td>

                      {/* DPI & Contacto */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-semibold text-gray-700">{p.dpi}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          {p.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {p.telefono}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Licencia */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {p.num_licencia}
                          </span>
                          <span className="text-xs text-gray-500">{p.tipo_licencia}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${licStatus.color}`}>
                            {licStatus.status !== "ok" && <AlertTriangle className="w-3 h-3" />}
                            <span>{licStatus.label} ({new Date(p.venc_licencia).toLocaleDateString("es-GT")})</span>
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {p.estado}
                        </span>
                      </td>

                      {/* Unidades asignadas */}
                      <td className="py-3 px-4">
                        {p.vehiculos_asignados && p.vehiculos_asignados.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.vehiculos_asignados.map(v => (
                              <span
                                key={v.id_vehiculo}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[#041954] font-mono text-xs font-bold border border-slate-200"
                              >
                                <Truck className="w-3 h-3 text-blue-600" />
                                {v.placa}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin unidad asignada</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => setFormPiloto({ open: true, piloto: p })}
                              title="Editar piloto"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete(p)}
                              title="Desactivar piloto"
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
              Mostrando {Math.min((page - 1) * 15 + 1, total)}–{Math.min(page * 15, total)} de {total} pilotos
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

      {/* Modal Piloto */}
      {formPiloto.open && (
        <PilotoModal
          piloto={formPiloto.piloto}
          onClose={() => setFormPiloto({ open: false, piloto: null })}
          onSuccess={() => {
            setFormPiloto({ open: false, piloto: null });
            loadPilotos();
          }}
          canEdit={canEdit || canCreate}
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
                <h3 className="font-semibold text-gray-900">Desactivar Piloto</h3>
                <p className="text-xs text-gray-500">Se desvinculará de las unidades activas</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Desactivar al piloto <strong>{confirmDelete.nombre} {confirmDelete.apellido}</strong> (Lic. {confirmDelete.num_licencia})?
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

export default PilotosTab;
