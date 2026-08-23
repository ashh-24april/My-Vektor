import api from "./axios";

export interface AuditLog {
  id_auditoria: number;
  fecha_hora: string;
  id_usuario: number;
  usuario_nombre: string;
  usuario_email: string;
  usuario_username?: string;
  foto_url?: string | null;
  rol_usuario: string;
  accion: string;
  modulo: string;
  registro_id?: string | null;
  descripcion?: string | null;
  detalles_cambio?: string | null;
  ip_origen: string;
  navegador?: string | null;
}

export interface AuditKPIs {
  totalAcciones: number;
  cambiosCriticosMes: number;
  exportacionesMes: number;
  usuariosActivos: number;
}

export interface GetAuditLogsParams {
  q?: string;
  modulo?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  id_usuario?: number;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export const getAuditLogs = async (params?: GetAuditLogsParams): Promise<AuditLogsResponse> => {
  const res = await api.get<AuditLogsResponse>("/api/auditoria", { params });
  return res.data;
};

export const getAuditKPIs = async (): Promise<AuditKPIs> => {
  const res = await api.get<AuditKPIs>("/api/auditoria/kpis");
  return res.data;
};

export const createAuditLog = async (data: {
  accion: string;
  modulo: string;
  descripcion?: string;
  registro_id?: string;
  detalles_cambio?: any;
}): Promise<{ message: string; log: AuditLog }> => {
  const res = await api.post("/api/auditoria", data);
  return res.data;
};
