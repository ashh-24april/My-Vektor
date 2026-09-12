
import api from "./axios";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type TipoCarga = "Contenedor" | "Carga Seca" | "Líquidos/Cisterna" | "Granel/Materiales" | "Refrigerada" | "Vehículos";
export type EstadoViaje = "Programado" | "En Ruta" | "En Carga/Descarga" | "Completado" | "Liquidado" | "Cancelado";
export type CategoriaGasto = "Combustible" | "Viáticos" | "Peajes" | "Mantenimiento en Ruta" | "Otros";

export interface GastoViaje {
  id_gasto: number;
  id_viaje: number;
  id_usuario: number;
  categoria: CategoriaGasto;
  concepto: string;
  tipo: string;
  monto: number;
  galones?: number | null;
  odometro_km?: number | null;
  num_comprobante?: string | null;
  comprobante?: string | null;
  fecha: string;
  created_at: string;
  usuario?: {
    id_usuario: number;
    nombre: string;
  };
}

export interface Viaje {
  id_viaje: number;
  codigo_viaje: string;
  id_vehiculo: number;
  id_remolque?: number | null;
  id_piloto: number;
  id_cliente?: number | null;
  id_usuario: number;
  tipo_carga: TipoCarga;
  origen: string;
  destino: string;
  escala_puntos?: string | null;
  descripcion_carga?: string | null;
  monto_flete: number;
  anticipo_viaticos: number;
  fecha_salida: string;
  fecha_estimada_llegada?: string | null;
  fecha_llegada_real?: string | null;
  km_inicial?: number | null;
  km_final?: number | null;
  km_real?: number | null;
  galones_combustible?: number | null;
  costo_combustible?: number | null;
  rendimiento_calculado?: number | null;
  ingreso_total: number;
  costo_total: number;
  estado: EstadoViaje;
  observaciones?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  vehiculo?: {
    id_vehiculo: number;
    placa: string;
    marca: string;
    modelo: string;
    kilometraje: number;
    estado: string;
  };
  piloto?: {
    id_piloto: number;
    nombre: string;
    apellido: string;
    telefono?: string | null;
    num_licencia: string;
    estado: string;
  };
  cliente?: {
    id_cliente: number;
    nombre: string;
    nit?: string | null;
    telefono?: string | null;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
  };
  gastos?: GastoViaje[];
}

export interface ViajesKPIs {
  viajesEnRuta: number;
  viajesProgramados: number;
  viajesCompletados: number;
  totalFletes: number;
  totalGalones: number;
  totalCostos: number;
}

export interface ViajesResponse {
  viajes: Viaje[];
  total: number;
  page: number;
  limit: number;
}

// ─── LLAMADAS API ─────────────────────────────────────────────────────────────

export const getViajesKPIs = async (): Promise<ViajesKPIs> => {
  const res = await api.get<{ kpis: ViajesKPIs }>("/viajes/kpis");
  return res.data.kpis;
};

export const getSiguienteFolioViaje = async (): Promise<{ siguienteFolio: string }> => {
  const res = await api.get<{ siguienteFolio: string }>("/viajes/siguiente-folio");
  return res.data;
};

export const getViajes = async (params?: {
  q?: string;
  estado?: string;
  id_cliente?: number;
  id_piloto?: number;
  id_vehiculo?: number;
  page?: number;
  limit?: number;
}): Promise<ViajesResponse> => {
  const res = await api.get<ViajesResponse>("/viajes", { params });
  return res.data;
};

export const getViajeById = async (id: number): Promise<Viaje> => {
  const res = await api.get<Viaje>(`/viajes/${id}`);
  return res.data;
};

export const createViaje = async (data: Partial<Viaje>): Promise<Viaje> => {
  const res = await api.post<Viaje>("/viajes", data);
  return res.data;
};

export const updateViaje = async (id: number, data: Partial<Viaje>): Promise<Viaje> => {
  const res = await api.put<Viaje>(`/viajes/${id}`, data);
  return res.data;
};

export const updateViajeEstado = async (
  id: number,
  data: { estado: EstadoViaje; km_final?: number; fecha_llegada_real?: string }
): Promise<Viaje> => {
  const res = await api.patch<Viaje>(`/viajes/${id}/estado`, data);
  return res.data;
};

export const deleteViaje = async (id: number): Promise<{ message: string }> => {
  const res = await api.delete<{ message: string }>(`/viajes/${id}`);
  return res.data;
};

export const registrarGastoViaje = async (
  idViaje: number,
  data: Partial<GastoViaje>
): Promise<GastoViaje> => {
  const res = await api.post<GastoViaje>(`/viajes/${idViaje}/gastos`, data);
  return res.data;
};

export const eliminarGastoViaje = async (
  idViaje: number,
  idGasto: number
): Promise<{ message: string }> => {
  const res = await api.delete<{ message: string }>(`/viajes/${idViaje}/gastos/${idGasto}`);
  return res.data;
};
