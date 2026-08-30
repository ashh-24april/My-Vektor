import api from "./axios";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  _count?: { productos: number };
}

export interface Proveedor {
  id_proveedor: number;
  nombre: string;
  nit?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  tipo_producto?: string | null;
  activo: boolean;
  contactos?: ContactoProveedor[];
  _count?: { productos: number };
}

export interface ContactoProveedor {
  id_contacto: number;
  id_proveedor: number;
  nombre: string;
  cargo?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

export interface Producto {
  id_producto: number;
  codigo: string;
  descripcion: string;
  id_categoria: number;
  id_proveedor?: number | null;
  ubicacion?: string | null;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
  numero_factura?: string | null;
  rotacion?: string | null;
  origen?: string | null;
  activo: boolean;
  foto_url?: string | null;
  created_at: string;
  categoria?: { id_categoria: number; nombre: string };
  proveedor?: { id_proveedor: number; nombre: string } | null;
}

export interface MovimientoInventario {
  id_movimiento: number;
  id_producto: number;
  id_usuario: number;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  referencia?: string | null;
  numero_factura?: string | null;
  motivo?: string | null;
  fecha: string;
  usuario?: { nombre: string; usuario: string };
}

export interface Compra {
  id_compra: number;
  id_proveedor: number;
  id_usuario: number;
  num_factura?: string | null;
  fecha: string;
  subtotal: number;
  descuento: number;
  total: number;
  estado: "Pendiente" | "Recibida" | "Cancelada";
  observaciones?: string | null;
  created_at: string;
  proveedor?: { id_proveedor: number; nombre: string };
  usuario?: { nombre: string; usuario: string };
  detalles?: DetalleCompra[];
  _count?: { detalles: number };
}

export interface DetalleCompra {
  id_detalle_compra: number;
  id_compra: number;
  id_producto: number;
  cantidad: number;
  precio_unit: number;
  subtotal: number;
  producto?: { id_producto: number; codigo: string; descripcion: string; unidad_medida: string };
}

// ─── Categorías ──────────────────────────────────────────────────────────────

export const getCategorias = async (): Promise<Categoria[]> => {
  const res = await api.get("/api/inventario/categorias");
  return res.data;
};

export const createCategoria = async (data: { nombre: string; descripcion?: string }): Promise<Categoria> => {
  const res = await api.post("/api/inventario/categorias", data);
  return res.data;
};

export const updateCategoria = async (id: number, data: { nombre: string; descripcion?: string }): Promise<Categoria> => {
  const res = await api.put(`/api/inventario/categorias/${id}`, data);
  return res.data;
};

export const deleteCategoria = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/categorias/${id}`);
};

// ─── Proveedores ─────────────────────────────────────────────────────────────

export const getProveedores = async (): Promise<Proveedor[]> => {
  const res = await api.get("/api/inventario/proveedores");
  return res.data;
};

export const createProveedor = async (data: Partial<Proveedor> & { contactos?: Partial<ContactoProveedor>[] }): Promise<Proveedor> => {
  const res = await api.post("/api/inventario/proveedores", data);
  return res.data;
};

export const updateProveedor = async (id: number, data: Partial<Proveedor>): Promise<Proveedor> => {
  const res = await api.put(`/api/inventario/proveedores/${id}`, data);
  return res.data;
};

export const deleteProveedor = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/proveedores/${id}`);
};

// ─── Productos ────────────────────────────────────────────────────────────────

export interface GetProductosParams {
  q?: string;
  categoria?: number;
  stock_bajo?: boolean;
  activo?: "true" | "false" | "all";
  page?: number;
  limit?: number;
}

export const getProductos = async (params?: GetProductosParams): Promise<{ productos: Producto[]; total: number; page: number; limit: number }> => {
  const res = await api.get("/api/inventario/productos", { params });
  return res.data;
};

export const getProductoById = async (id: number): Promise<Producto & { movimientos_inventario: MovimientoInventario[] }> => {
  const res = await api.get(`/api/inventario/productos/${id}`);
  return res.data;
};

export const getSiguienteCodigoSKU = async (id_categoria: number): Promise<{
  prefix: string;
  categoria: string;
  siguienteCodigo: string;
  siguienteNumero: number;
}> => {
  const res = await api.get("/api/inventario/productos/siguiente-codigo", {
    params: { id_categoria }
  });
  return res.data;
};

export const createProducto = async (data: Partial<Producto>): Promise<Producto> => {
  const res = await api.post("/api/inventario/productos", data);
  return res.data;
};

export const updateProducto = async (id: number, data: Partial<Producto>): Promise<Producto> => {
  const res = await api.put(`/api/inventario/productos/${id}`, data);
  return res.data;
};

export const deleteProducto = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/productos/${id}`);
};

// ─── Movimientos ─────────────────────────────────────────────────────────────

export const getMovimientos = async (productoId: number): Promise<MovimientoInventario[]> => {
  const res = await api.get(`/api/inventario/movimientos/${productoId}`);
  return res.data;
};

export const registrarMovimiento = async (data: {
  id_producto: number;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  referencia?: string;
  numero_factura?: string;
  motivo?: string;
}): Promise<{ movimiento: MovimientoInventario; stock_actual: number }> => {
  const res = await api.post("/api/inventario/movimientos", data);
  return res.data;
};

// ─── Compras ─────────────────────────────────────────────────────────────────

export const getCompras = async (params?: { estado?: string; page?: number; limit?: number }): Promise<{ compras: Compra[]; total: number }> => {
  const res = await api.get("/api/inventario/compras", { params });
  return res.data;
};

export const getCompraById = async (id: number): Promise<Compra> => {
  const res = await api.get(`/api/inventario/compras/${id}`);
  return res.data;
};

export const createCompra = async (data: {
  id_proveedor: number;
  num_factura?: string;
  fecha?: string;
  observaciones?: string;
  detalles: { id_producto: number; cantidad: number; precio_unit: number }[];
}): Promise<Compra> => {
  const res = await api.post("/api/inventario/compras", data);
  return res.data;
};

export const updateCompraEstado = async (id: number, estado: string): Promise<Compra> => {
  const res = await api.put(`/api/inventario/compras/${id}/estado`, { estado });
  return res.data;
};
