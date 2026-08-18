import api from "./axios";

export interface User {
  id_usuario: number;
  nombre: string;
  usuario: string;
  correo: string;
  correo_recuperacion?: string;
  permitir_cambio_password?: boolean;
  activo: boolean;
  en_linea?: boolean;
  ultima_conexion?: string;
  ultimo_cambio_password?: string;
  intentos_fallidos?: number;
  max_intentos_fallidos?: number;
  dias_cambio_password?: number;
  foto_url?: string;
  telefono?: string;
  created_at: string;
  rol: {
    id_rol: number;
    nombre: string;
  };
  permisos_modulos?: {
    modulo: string;
    permitido: boolean;
  }[];
}

export const getUsers = async () => {
  const response = await api.get<User[]>("/api/users");
  return response.data;
};

export const getUserById = async (id: number) => {
  const response = await api.get(`/api/users/${id}`);
  return response.data;
};

export const createUser = async (data: any) => {
  const response = await api.post("/api/users", data);
  return response.data;
};

export const updateUser = async (id: number, data: any) => {
  const response = await api.put(`/api/users/${id}`, data);
  return response.data;
};

export const changePassword = async (id: number, data: any) => {
  const response = await api.put(`/api/users/${id}/password`, data);
  return response.data;
};

export const requestPasswordReset = async (correo: string) => {
  const response = await api.post("/api/auth/forgot-password", { correo });
  return response.data;
};

export const resetPasswordWithToken = async (data: { correo: string; token: string; nuevaContrasena: string }) => {
  const response = await api.post("/api/auth/reset-password", data);
  return response.data;
};

export const requestSupabasePasswordReset = async (correo: string, frontendUrl?: string) => {
  const response = await api.post("/api/auth/forgot-password-supabase", { correo, frontendUrl });
  return response.data;
};

export const syncPasswordWithSupabase = async (data: { correo: string; nuevaContrasena: string }) => {
  const response = await api.post("/api/auth/sync-password-supabase", data);
  return response.data;
};

export const lookupUserEmail = async (identifier: string) => {
  const response = await api.post("/api/auth/lookup-email", { identifier });
  return response.data;
};
