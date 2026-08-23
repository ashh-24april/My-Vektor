import api from "./axios";

export interface ResumenOperativo {
  totalVehiculos: number;
  vehiculosEnRuta: number;
  vehiculosDisponibles: number;
  vehiculosEnTaller: number;
  vehiculosFueraServicio: number;
  totalPilotos: number;
  pilotosDisponibles: number;
  otsEnProcesoCount: number;
}

export interface ResumenFinanciero {
  totalVentasPeriodo: number;
  tendenciaVentas: number;
  totalPendientesMonto: number;
  totalPendientesCount: number;
  totalCostosTaller: number;
  tendenciaTaller: number;
  utilidadEstimada: number;
}

export interface RepuestoCriticoItem {
  id_producto: number;
  codigo: string;
  descripcion: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  precio_compra: number;
}

export interface ResumenInventario {
  totalProductos: number;
  repuestosCriticosCount: number;
  valorInventario: number;
  repuestosPorReabastecer: RepuestoCriticoItem[];
}

export interface ComparativoMensual {
  mes: string;
  ingresos: number;
  costos: number;
  margen: number;
}

export interface DistribucionFlotaItem {
  name: string;
  value: number;
  color: string;
}

export interface TopRepuestoConsumo {
  id_producto: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  total_gastado: number;
}

export interface UltimaOTItem {
  id_orden: number;
  numero_ot: string;
  placa: string;
  vehiculo_desc: string;
  mecanico: string;
  tipo_mantenimiento: string;
  estado: string;
  costo_total: number;
  fecha_ingreso: string;
}

export interface DashboardOverviewData {
  periodo: "mes_actual" | "trimestre" | "anio_actual";
  operativo: ResumenOperativo;
  financiero: ResumenFinanciero;
  inventario: ResumenInventario;
  graficos: {
    comparativoMensual: ComparativoMensual[];
    distribucionFlota: DistribucionFlotaItem[];
    topRepuestosConsumo: TopRepuestoConsumo[];
  };
  ultimasOTs: UltimaOTItem[];
}

export const getDashboardOverview = async (
  periodo: "mes_actual" | "trimestre" | "anio_actual" = "mes_actual"
): Promise<DashboardOverviewData> => {
  const res = await api.get<DashboardOverviewData>("/api/dashboard/overview", {
    params: { periodo }
  });
  return res.data;
};
