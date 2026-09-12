
import api from "./axios";

// ─── TIPOS FINANCIEROS ────────────────────────────────────────────────────────

export type TipoTransaccion = "Ingreso" | "Egreso";

export type CategoriaFinanzas =
  | "Flete Cobrado"
  | "Venta Repuestos"
  | "Servicio Mecánico"
  | "Combustible"
  | "Viáticos Piloto"
  | "Peajes"
  | "Compra Repuestos"
  | "Mantenimiento Taller"
  | "Planilla"
  | "Seguros"
  | "Alquiler/Servicios"
  | "Otros Ingresos"
  | "Otros Egresos";

export type EstadoTransaccion =
  | "Pendiente"
  | "Cobrado Parcial"
  | "Cobrado Total"
  | "Pagado"
  | "Vencido"
  | "Anulado";

export type MetodoPago =
  | "Transferencia"
  | "Efectivo"
  | "Cheque"
  | "Depósito"
  | "Tarjeta";

export interface TransaccionFinanzas {
  id_transaccion: number;
  codigo_transaccion: string;
  tipo: TipoTransaccion;
  categoria: CategoriaFinanzas;
  concepto: string;
  monto: number;
  monto_pagado: number;
  estado: EstadoTransaccion;
  fecha: string;
  fecha_vencimiento?: string | null;
  fecha_pago?: string | null;
  metodo_pago?: MetodoPago | string | null;
  num_comprobante?: string | null;
  id_cliente?: number | null;
  id_proveedor?: number | null;
  id_vehiculo?: number | null;
  id_viaje?: number | null;
  id_venta?: number | null;
  id_compra?: number | null;
  id_usuario: number;
  observaciones?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  cliente?: {
    id_cliente: number;
    nombre: string;
    nit?: string;
  } | null;
  proveedor?: {
    id_proveedor: number;
    nombre: string;
    nit?: string;
  } | null;
  vehiculo?: {
    id_vehiculo: number;
    placa: string;
    marca: string;
    modelo: string;
  } | null;
  viaje?: {
    id_viaje: number;
    codigo_viaje?: string;
    origen: string;
    destino: string;
  } | null;
  venta?: {
    id_venta: number;
    folio_factura?: string;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
    usuario: string;
  } | null;
}

export interface FinanzasKPIs {
  ingresos_mes: number;
  gastos_mes: number;
  utilidad_neta_mes: number;
  cuentas_por_cobrar: number;
  cuentas_por_pagar: number;
}

export interface RentabilidadVehiculo {
  id_vehiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  tipo?: string;
  estado: string;
  total_ingresos: number;
  costo_combustible: number;
  costo_mecanica: number;
  costo_viaticos_ruta: number;
  costo_total: number;
  margen_neto: number;
  margen_porcentaje: number;
}

export interface CuentaPorCobrar {
  id_transaccion: number;
  codigo_transaccion: string;
  concepto: string;
  categoria: CategoriaFinanzas;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_emision: string;
  fecha_vencimiento?: string | null;
  estado: EstadoTransaccion;
  estado_vencimiento: "Al Día" | "Por Vencer" | "Vencida";
  dias_vencido: number;
  num_comprobante?: string | null;
  cliente?: {
    id_cliente: number;
    nombre: string;
    nit?: string;
    telefono?: string;
  } | null;
}

export interface GetTransaccionesParams {
  q?: string;
  tipo?: string;
  categoria?: string;
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  id_vehiculo?: string | number;
  page?: number;
  limit?: number;
}

export interface TransaccionesResponse {
  data: TransaccionFinanzas[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── FUNCIONES DE API ─────────────────────────────────────────────────────────

export const getFinanzasKPIs = async (): Promise<FinanzasKPIs> => {
  const { data } = await api.get<FinanzasKPIs>("/finanzas/kpis");
  return data;
};

export const getSiguienteFolioTransaccion = async (): Promise<string> => {
  const { data } = await api.get<{ siguiente_folio: string }>("/finanzas/siguiente-folio");
  return data.siguiente_folio;
};

export const getTransacciones = async (
  params?: GetTransaccionesParams
): Promise<TransaccionesResponse> => {
  const { data } = await api.get<TransaccionesResponse>("/finanzas", { params });
  return data;
};

export const getTransaccionById = async (id: number): Promise<TransaccionFinanzas> => {
  const { data } = await api.get<TransaccionFinanzas>(`/finanzas/${id}`);
  return data;
};

export const createTransaccion = async (
  payload: Partial<TransaccionFinanzas>
): Promise<TransaccionFinanzas> => {
  const { data } = await api.post<TransaccionFinanzas>("/finanzas", payload);
  return data;
};

export const updateTransaccion = async (
  id: number,
  payload: Partial<TransaccionFinanzas>
): Promise<TransaccionFinanzas> => {
  const { data } = await api.put<TransaccionFinanzas>(`/finanzas/${id}`, payload);
  return data;
};

export const registrarPagoCobro = async (
  id: number,
  payload: {
    monto_abono: number;
    metodo_pago?: string;
    num_comprobante?: string;
    observaciones?: string;
  }
): Promise<TransaccionFinanzas> => {
  const { data } = await api.patch<TransaccionFinanzas>(`/finanzas/${id}/pago`, payload);
  return data;
};

export const anularTransaccion = async (id: number): Promise<void> => {
  await api.delete(`/finanzas/${id}`);
};

export const getRentabilidadVehiculos = async (): Promise<RentabilidadVehiculo[]> => {
  const { data } = await api.get<RentabilidadVehiculo[]>("/finanzas/rentabilidad-vehiculos");
  return data;
};

export const getCuentasPorCobrar = async (): Promise<CuentaPorCobrar[]> => {
  const { data } = await api.get<CuentaPorCobrar[]>("/finanzas/cuentas-cobrar");
  return data;
};
