
import api from "./axios";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type TipoVehiculo = "Cabezal" | "Camión Rígido" | "Remolque/Cisterna" | "Plataforma" | "Furgón" | "Pickup";
export type EstadoVehiculo = "Disponible" | "En Ruta" | "En Mantenimiento" | "Fuera de Servicio";
export type EstadoPiloto = "Disponible" | "En Viaje" | "De Licencia" | "Inactivo";

export interface PilotoAsignadoSummary {
  id_piloto: number;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  num_licencia: string;
  tipo_licencia: string;
  venc_licencia: string;
  estado: string;
}

export interface Vehiculo {
  id_vehiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo?: string | null;
  color?: string | null;
  num_motor?: string | null;
  num_chasis?: string | null;
  capacidad_carga?: number | null;
  kilometraje: number;
  horometro?: number | null;
  rendimiento_km_l?: number | null;
  estado: EstadoVehiculo;
  venc_circulacion?: string | null;
  venc_seguro?: string | null;
  venc_revision?: string | null;
  id_piloto_asignado?: number | null;
  activo: boolean;
  foto_url?: string | null;
  created_at: string;
  updated_at: string;
  piloto_asignado?: PilotoAsignadoSummary | null;
  _count?: {
    viajes: number;
    ordenes_servicio: number;
  };
}

export interface Piloto {
  id_piloto: number;
  nombre: string;
  apellido: string;
  dpi: string;
  telefono?: string | null;
  correo?: string | null;
  num_licencia: string;
  tipo_licencia: string;
  venc_licencia: string;
  estado: EstadoPiloto;
  alerta_enviada: boolean;
  disponible: boolean;
  activo: boolean;
  foto_url?: string | null;
  foto_dpi_url?: string | null;
  foto_lic_url?: string | null;
  created_at: string;
  updated_at: string;
  vehiculos_asignados?: {
    id_vehiculo: number;
    placa: string;
    marca: string;
    modelo: string;
    estado: string;
  }[];
  _count?: {
    viajes: number;
  };
}

export interface OperacionesKPIs {
  totalVehiculos: number;
  vehiculosDisponibles: number;
  vehiculosEnRuta: number;
  vehiculosEnTaller: number;
  vehiculosFueraServicio: number;
  tasaDisponibilidad: number;
  totalPilotos: number;
  pilotosDisponibles: number;
  pilotosEnViaje: number;
  pilotosLicenciaProxima: number;
  alertasDocsVehiculos: number;
}

export interface VehiculosResponse {
  vehiculos: Vehiculo[];
  total: number;
  page: number;
  limit: number;
}

export interface PilotosResponse {
  pilotos: Piloto[];
  total: number;
  page: number;
  limit: number;
}

// ─── LLAMADAS API ─────────────────────────────────────────────────────────────

export const getOperacionesKPIs = async (): Promise<OperacionesKPIs> => {
  const res = await api.get<{ kpis: OperacionesKPIs }>("/operaciones/kpis");
  return res.data.kpis;
};

export const getVehiculos = async (params?: {
  q?: string;
  estado?: string;
  tipo?: string;
  page?: number;
  limit?: number;
}): Promise<VehiculosResponse> => {
  const res = await api.get<VehiculosResponse>("/operaciones/vehiculos", { params });
  return res.data;
};

export const getVehiculoById = async (id: number): Promise<Vehiculo> => {
  const res = await api.get<Vehiculo>(`/operaciones/vehiculos/${id}`);
  return res.data;
};

export const createVehiculo = async (data: Partial<Vehiculo>): Promise<Vehiculo> => {
  const res = await api.post<Vehiculo>("/operaciones/vehiculos", data);
  return res.data;
};

export const updateVehiculo = async (id: number, data: Partial<Vehiculo>): Promise<Vehiculo> => {
  const res = await api.put<Vehiculo>(`/operaciones/vehiculos/${id}`, data);
  return res.data;
};

export const deleteVehiculo = async (id: number): Promise<{ message: string; vehiculo: Vehiculo }> => {
  const res = await api.delete<{ message: string; vehiculo: Vehiculo }>(`/operaciones/vehiculos/${id}`);
  return res.data;
};

export const getPilotos = async (params?: {
  q?: string;
  estado?: string;
  page?: number;
  limit?: number;
}): Promise<PilotosResponse> => {
  const res = await api.get<PilotosResponse>("/operaciones/pilotos", { params });
  return res.data;
};

export const getPilotoById = async (id: number): Promise<Piloto> => {
  const res = await api.get<Piloto>(`/operaciones/pilotos/${id}`);
  return res.data;
};

export const createPiloto = async (data: Partial<Piloto>): Promise<Piloto> => {
  const res = await api.post<Piloto>("/operaciones/pilotos", data);
  return res.data;
};

export const updatePiloto = async (id: number, data: Partial<Piloto>): Promise<Piloto> => {
  const res = await api.put<Piloto>(`/operaciones/pilotos/${id}`, data);
  return res.data;
};

export const deletePiloto = async (id: number): Promise<{ message: string; piloto: Piloto }> => {
  const res = await api.delete<{ message: string; piloto: Piloto }>(`/operaciones/pilotos/${id}`);
  return res.data;
};

export const asignarPilotoVehiculo = async (id_vehiculo: number, id_piloto: number | null): Promise<Vehiculo> => {
  const res = await api.post<Vehiculo>("/operaciones/asignar", { id_vehiculo, id_piloto });
  return res.data;
};
