
import React, { useState, useEffect } from "react";
import {
  Truck,
  Users,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Gauge,
  UserX,
} from "lucide-react";
import {
  getOperacionesKPIs,
  getVehiculos,
  getPilotos,
  type OperacionesKPIs,
  type Vehiculo,
  type Piloto,
} from "../../../api/operaciones";
import AsignacionModal from "../components/AsignacionModal";

const DispatchBoardTab: React.FC = () => {
  const [kpis, setKpis]             = useState<OperacionesKPIs | null>(null);
  const [vehiculos, setVehiculos]   = useState<Vehiculo[]>([]);
  const [pilotos, setPilotos]       = useState<Piloto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpisData, vehData, pilData] = await Promise.all([
        getOperacionesKPIs(),
        getVehiculos({ limit: 100 }),
        getPilotos({ limit: 100 }),
      ]);
      setKpis(kpisData);
      setVehiculos(vehData.vehiculos);
      setPilotos(pilData.pilotos);
    } catch (err) {
      console.error("Error cargando Dispatch Board:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unidadesDisponibles = vehiculos.filter(v => v.estado === "Disponible");
  const unidadesEnRuta     = vehiculos.filter(v => v.estado === "En Ruta");
  const unidadesEnTaller   = vehiculos.filter(v => v.estado === "En Mantenimiento");
  const unidadesFueraServ  = vehiculos.filter(v => v.estado === "Fuera de Servicio");

  const pilotosDisponibles = pilotos.filter(p => p.estado === "Disponible");

  const isLicenciaProxima = (fechaStr?: string) => {
    if (!fechaStr) return false;
    const diff = new Date(fechaStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days <= 30;
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-[#041954]" />
        <span>Cargando matriz de disponibilidad...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── KPIS EN TIEMPO REAL ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Flota */}
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Flota</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#041954] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900">{kpis?.totalVehiculos ?? 0}</span>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Unidades registradas</p>
          </div>
        </div>

        {/* Disponibles */}
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Disponibles</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700">{kpis?.vehiculosDisponibles ?? 0}</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{kpis?.tasaDisponibilidad ?? 0}% de operatividad</p>
          </div>
        </div>

        {/* En Ruta */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">En Ruta</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-800">{kpis?.vehiculosEnRuta ?? 0}</span>
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">Viajes en tránsito</p>
          </div>
        </div>

        {/* En Taller */}
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">En Taller</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-800">{kpis?.vehiculosEnTaller ?? 0}</span>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Mantenimiento</p>
          </div>
        </div>

        {/* Pilotos Disponibles */}
        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Pilotos Libres</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-900">{kpis?.pilotosDisponibles ?? 0}</span>
            <p className="text-[10px] text-indigo-600 font-medium mt-0.5">De {kpis?.totalPilotos ?? 0} pilotos</p>
          </div>
        </div>

        {/* Alertas de Vencimiento */}
        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800">Alertas Legales</span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-700">
              {(kpis?.pilotosLicenciaProxima ?? 0) + (kpis?.alertasDocsVehiculos ?? 0)}
            </span>
            <p className="text-[10px] text-red-600 font-bold mt-0.5">Vencimientos &lt; 30d</p>
          </div>
        </div>
      </div>

      {/* ─── TABLERO MATRIZ DISPATCH (KANBAN OPERATIVO) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna 1: Unidades Disponibles para Despacho */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-sm text-gray-900">Unidades Disponibles</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {unidadesDisponibles.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {unidadesDisponibles.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No hay unidades en patio actualmente.</p>
            ) : (
              unidadesDisponibles.map(v => (
                <div
                  key={v.id_vehiculo}
                  className="p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100/70 hover:border-emerald-300 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-blue-950 bg-white px-2.5 py-1 rounded-xl border border-blue-200">
                      {v.placa}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">{v.tipo || "Cabezal"}</span>
                  </div>

                  <div className="text-xs text-gray-700 font-medium">
                    {v.marca} {v.modelo} ({v.anio})
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-emerald-100/50 text-[11px]">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-gray-400" />
                      {v.kilometraje.toLocaleString()} KM
                    </span>
                    {v.piloto_asignado ? (
                      <span className="font-semibold text-[#041954] flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {v.piloto_asignado.nombre}
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedVehiculo(v)}
                        className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        + Asignar Piloto
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 2: Unidades en Ruta / Viaje Activo */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="font-bold text-sm text-gray-900">En Ruta / En Tránsito</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {unidadesEnRuta.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {unidadesEnRuta.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No hay unidades en ruta en este momento.</p>
            ) : (
              unidadesEnRuta.map(v => (
                <div
                  key={v.id_vehiculo}
                  className="p-3.5 bg-blue-50/20 rounded-2xl border border-blue-100/70 hover:border-blue-300 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-blue-900 bg-white px-2.5 py-1 rounded-xl border border-blue-200">
                      {v.placa}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      En Tránsito
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 font-medium">
                    {v.marca} {v.modelo} — {v.tipo}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-blue-100/50 text-[11px]">
                    <span className="text-gray-500">Odómetro: {v.kilometraje.toLocaleString()} KM</span>
                    <span className="font-semibold text-blue-950">
                      {v.piloto_asignado ? `${v.piloto_asignado.nombre} ${v.piloto_asignado.apellido}` : "Sin piloto asignado"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 3: En Taller y Fuera de Servicio */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="font-bold text-sm text-gray-900">En Taller / Mantenimiento</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {unidadesEnTaller.length + unidadesFueraServ.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {unidadesEnTaller.length === 0 && unidadesFueraServ.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Taller sin unidades pendientes de entrega.</p>
            ) : (
              <>
                {unidadesEnTaller.map(v => (
                  <div
                    key={v.id_vehiculo}
                    className="p-3.5 bg-amber-50/20 rounded-2xl border border-amber-200/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-amber-950 bg-white px-2.5 py-1 rounded-xl border border-amber-200">
                        {v.placa}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Mantenimiento
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{v.marca} {v.modelo} ({v.anio})</p>
                  </div>
                ))}

                {unidadesFueraServ.map(v => (
                  <div
                    key={v.id_vehiculo}
                    className="p-3.5 bg-red-50/20 rounded-2xl border border-red-200/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-red-950 bg-white px-2.5 py-1 rounded-xl border border-red-200">
                        {v.placa}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 flex items-center gap-1">
                        <UserX className="w-3 h-3" /> Fuera de Servicio
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{v.marca} {v.modelo}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── RESUMEN DE PILOTOS DISPONIBLES & ALERTAS DE LICENCIAS ─────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#041954]" />
            <h3 className="font-bold text-sm text-gray-900">Operadores Disponibles para Asignación Inmediata</h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {pilotosDisponibles.length} de {pilotos.length} pilotos disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pilotosDisponibles.map(p => {
            const warning = isLicenciaProxima(p.venc_licencia);
            return (
              <div
                key={p.id_piloto}
                className="p-3.5 bg-slate-50/60 rounded-2xl border border-gray-200/70 hover:border-blue-300 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">{p.nombre} {p.apellido}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Lic. {p.num_licencia} ({p.tipo_licencia})</span>
                  <span>{p.telefono || "Sin tel."}</span>
                </div>
                {warning && (
                  <div className="pt-1 text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Licencia próxima a vencer: {new Date(p.venc_licencia).toLocaleDateString("es-GT")}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Asignación Rápida */}
      {selectedVehiculo && (
        <AsignacionModal
          vehiculo={selectedVehiculo}
          onClose={() => setSelectedVehiculo(null)}
          onSuccess={() => {
            setSelectedVehiculo(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default DispatchBoardTab;
