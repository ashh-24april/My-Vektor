import api from "./axios";

export interface MecanicoAux {
  id_mecanico: number;
  nombre: string;
  apellido: string;
  especialidad?: string | null;
  telefono?: string | null;
}

export interface PilotoAux {
  id_piloto: number;
  nombre: string;
  apellido: string;
  telefono?: string | null;
}

export interface VehiculoAux {
  id_vehiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  tipo?: string | null;
  estado?: string | null;
  kilometraje?: number | null;
}

export interface ProductoRepuestoAux {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock: number;
  precio_venta: number;
  precio_compra: number;
  unidad_medida: string;
}

export interface RepuestoOT {
  id_orden: number;
  id_producto: number;
  cantidad: number;
  precio_unit: number;
  subtotal: number;
  producto?: {
    id_producto: number;
    codigo: string;
    descripcion: string;
    unidad_medida: string;
  };
}

export interface OrdenTrabajo {
  id_orden: number;
  numero_ot: string | null;
  id_vehiculo: number;
  id_mecanico: number;
  id_piloto?: number | null;
  id_cliente?: number | null;
  id_usuario: number;
  tipo_mantenimiento: "Preventivo" | "Correctivo" | "Emergencia";
  tipo_servicio: string;
  diagnostico_inicial?: string | null;
  diagnostico?: string | null;
  trabajo_realizado?: string | null;
  km_entrada?: number | null;
  costo_mano_obra: number;
  costo_repuestos: number;
  costo_total: number;
  estado: "Pendiente" | "En Proceso" | "Completada" | "Cancelada";
  fecha_ingreso: string;
  fecha_estimada_entrega?: string | null;
  fecha_entrega?: string | null;
  fecha_cierre?: string | null;
  observaciones?: string | null;
  activo: boolean;
  created_at: string;
  vehiculo?: VehiculoAux | null;
  mecanico?: MecanicoAux | null;
  piloto?: PilotoAux | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
    usuario: string;
  } | null;
  repuestos?: RepuestoOT[];
}

export interface MecanicaKPIs {
  enProcesoCount: number;
  pendientesCount: number;
  completadasCount: number;
  preventivosCount: number;
  correctivosCount: number;
  costoTotalMes: number;
}

export interface GetOrdenesParams {
  q?: string;
  estado?: string;
  tipo_mantenimiento?: string;
  id_vehiculo?: string;
  id_mecanico?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}

export interface OrdenesResponse {
  ordenes: OrdenTrabajo[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateOTPayload {
  id_vehiculo: number;
  id_mecanico: number;
  id_piloto?: number | null;
  tipo_mantenimiento: string;
  diagnostico_inicial?: string;
  km_entrada?: number | null;
  fecha_ingreso?: string;
  fecha_estimada_entrega?: string;
  costo_mano_obra?: number;
  observaciones?: string;
}

export interface DespachoRepuestoItem {
  id_producto: number;
  cantidad: number;
  precio_unit?: number;
}

export const getMecanicaKPIs = async (): Promise<MecanicaKPIs> => {
  const res = await api.get<MecanicaKPIs>("/api/mecanica/kpis");
  return res.data;
};

export const getOrdenes = async (params?: GetOrdenesParams): Promise<OrdenesResponse> => {
  const res = await api.get<OrdenesResponse>("/api/mecanica", { params });
  return res.data;
};

export const getOrdenById = async (id: number): Promise<OrdenTrabajo> => {
  const res = await api.get<OrdenTrabajo>(`/api/mecanica/${id}`);
  return res.data;
};

export const createOrden = async (payload: CreateOTPayload): Promise<{ message: string; orden: OrdenTrabajo }> => {
  const res = await api.post("/api/mecanica", payload);
  return res.data;
};

export const addRepuestosAOrden = async (
  idOrden: number,
  items: DespachoRepuestoItem[]
): Promise<{ message: string }> => {
  const res = await api.post(`/api/mecanica/${idOrden}/repuestos`, { items });
  return res.data;
};

export const updateEstadoOrden = async (
  idOrden: number,
  data: {
    estado: "Pendiente" | "En Proceso" | "Completada" | "Cancelada";
    trabajo_realizado?: string;
    costo_mano_obra?: number;
    observaciones?: string;
  }
): Promise<{ message: string }> => {
  const res = await api.patch(`/api/mecanica/${idOrden}/estado`, data);
  return res.data;
};

export const getMecanicaAuxiliares = async (): Promise<{
  vehiculos: VehiculoAux[];
  mecanicos: MecanicoAux[];
  pilotos: PilotoAux[];
  repuestos: ProductoRepuestoAux[];
}> => {
  const res = await api.get("/api/mecanica/auxiliares");
  return res.data;
};
