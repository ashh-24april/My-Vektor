import api from "./axios";

export interface NotificacionItem {
  id_notificacion: string;
  tipo: "inventario" | "ventas" | "mecanica" | "auditoria" | "sistema";
  titulo: string;
  mensaje: string;
  fecha: string | Date;
  leida: boolean;
  link?: string;
  prioridad?: "alta" | "media" | "normal";
}

export interface NotificacionesResponse {
  notificaciones: NotificacionItem[];
  unreadCount: number;
}

export const getNotificaciones = async (): Promise<NotificacionesResponse> => {
  const res = await api.get<NotificacionesResponse>("/api/notificaciones");
  return res.data;
};

export const marcarNotificacionLeida = async (id: string): Promise<void> => {
  await api.patch(`/api/notificaciones/${id}/leida`);
};

export const marcarTodasNotificacionesLeidas = async (): Promise<void> => {
  await api.post("/api/notificaciones/marcar-todas");
};

export const registrarAuditoriaExportacion = async (
  modulo: string,
  formato: "XLSX" | "CSV",
  totalRegistros: number
): Promise<void> => {
  await api.post("/api/notificaciones/auditoria-exportacion", {
    modulo,
    formato,
    totalRegistros
  });
};
