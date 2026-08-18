import api from "./axios";

export interface Role {
  id_rol: number;
  nombre: string;
  descripcion?: string;
}

export const getRoles = async () => {
  const response = await api.get<Role[]>("/api/roles");
  return response.data;
};
