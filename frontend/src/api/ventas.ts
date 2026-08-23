import api from "./axios";

export interface ClienteAux {
  id_cliente: number;
  nombre: string;
  nit?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

export interface VehiculoAux {
  id_vehiculo: number;
  placa: string;
  marca: string;
  modelo: string;
}

export interface ProductoAux {
  id_producto: number;
  codigo: string;
  descripcion: string;
  precio_venta: number;
  stock: number;
  unidad_medida: string;
}

export interface DetalleVenta {
  id_detalle?: number;
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

export interface Venta {
  id_venta: number;
  folio_factura: string | null;
  id_cliente: number | null;
  id_usuario: number;
  id_vehiculo: number | null;
  cliente_nombre: string | null;
  cliente_nit: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  concepto_servicio: string;
  num_comprobante?: string | null;
  subtotal: number;
  impuesto: number;
  descuento: number;
  total: number;
  estado: string;
  estado_pago: "Pagada" | "Pendiente" | "Anulada";
  metodo_pago?: string | null;
  fecha: string;
  fecha_emision: string;
  fecha_vencimiento?: string | null;
  fecha_pago?: string | null;
  observaciones?: string | null;
  activo: boolean;
  created_at: string;
  cliente?: ClienteAux | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
    usuario: string;
  } | null;
  vehiculo?: VehiculoAux | null;
  detalles?: DetalleVenta[];
}

export interface VentasKPIs {
  totalVentasMes: number;
  totalPendientesMonto: number;
  totalPendientesCantidad: number;
  totalPagadasMonto: number;
  totalPagadasCantidad: number;
  anuladasCount: number;
}

export interface GetVentasParams {
  q?: string;
  estado_pago?: string;
  concepto_servicio?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}

export interface VentasResponse {
  ventas: Venta[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateVentaPayload {
  id_cliente?: number | null;
  cliente_nombre: string;
  cliente_nit?: string;
  cliente_telefono?: string;
  cliente_direccion?: string;
  concepto_servicio: string;
  id_vehiculo?: number | null;
  monto_subtotal: number;
  impuesto?: number;
  descuento?: number;
  monto_total: number;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  estado_pago?: "Pagada" | "Pendiente";
  metodo_pago?: string;
  observaciones?: string;
  detalles?: Array<{
    id_producto: number;
    cantidad: number;
    precio_unit: number;
    descuento?: number;
  }>;
}

export const getVentasKPIs = async (): Promise<VentasKPIs> => {
  const res = await api.get<VentasKPIs>("/api/ventas/kpis");
  return res.data;
};

export const getVentas = async (params?: GetVentasParams): Promise<VentasResponse> => {
  const res = await api.get<VentasResponse>("/api/ventas", { params });
  return res.data;
};

export const getVentaById = async (id: number): Promise<Venta> => {
  const res = await api.get<Venta>(`/api/ventas/${id}`);
  return res.data;
};

export const createVenta = async (payload: CreateVentaPayload): Promise<{ message: string; venta: Venta }> => {
  const res = await api.post("/api/ventas", payload);
  return res.data;
};

export const updateEstadoPago = async (
  id: number,
  data: {
    estado_pago: "Pagada" | "Pendiente" | "Anulada";
    metodo_pago?: string;
    fecha_pago?: string;
    observaciones?: string;
  }
): Promise<{ message: string; venta: Venta }> => {
  const res = await api.patch(`/api/ventas/${id}/estado`, data);
  return res.data;
};

export const anularVenta = async (id: number): Promise<{ message: string; venta: Venta }> => {
  const res = await api.delete(`/api/ventas/${id}`);
  return res.data;
};

export const getVentasAuxiliares = async (): Promise<{
  clientes: ClienteAux[];
  vehiculos: VehiculoAux[];
  productos: ProductoAux[];
}> => {
  const res = await api.get("/api/ventas/auxiliares");
  return res.data;
};
