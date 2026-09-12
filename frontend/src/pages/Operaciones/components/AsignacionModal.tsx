
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, UserCheck, Loader2, Save, Truck, AlertTriangle } from "lucide-react";
import {
  asignarPilotoVehiculo,
  getPilotos,
  type Vehiculo,
  type Piloto,
} from "../../../api/operaciones";

interface AsignacionModalProps {
  vehiculo: Vehiculo;
  onClose: () => void;
  onSuccess: () => void;
}

const AsignacionModal: React.FC<AsignacionModalProps> = ({
  vehiculo,
  onClose,
  onSuccess,
}) => {
  const [pilotos, setPilotos]       = useState<Piloto[]>([]);
  const [selectedPiloto, setSelectedPiloto] = useState<string>(
    vehiculo.id_piloto_asignado ? String(vehiculo.id_piloto_asignado) : ""
  );
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    getPilotos({ limit: 100 })
      .then(res => setPilotos(res.pilotos))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const pilotoId = selectedPiloto ? parseInt(selectedPiloto, 10) : null;
      await asignarPilotoVehiculo(vehiculo.id_vehiculo, pilotoId);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al asignar piloto.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center text-[#041954]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Asignar Piloto</h3>
              <p className="text-xs text-gray-500">Unidad: <span className="font-mono font-bold text-blue-900">{vehiculo.placa}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-gray-100 text-xs text-gray-600 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio}) — {vehiculo.tipo || "Cabezal"}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Seleccionar Operador / Piloto</label>
            <select
              value={selectedPiloto}
              onChange={e => setSelectedPiloto(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Sin piloto asignado (Liberar unidad)</option>
              {pilotos.map(p => (
                <option key={p.id_piloto} value={p.id_piloto}>
                  {p.nombre} {p.apellido} — {p.num_licencia} [{p.estado}]
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar Asignación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AsignacionModal;
