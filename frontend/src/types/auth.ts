// Tipos compartidos del sistema de autenticación MyVektor

export interface User {
  id: number;
  nombre: string;
  usuario: string;
  email: string;
  correo?: string;
  telefono?: string;
  rol: string;
  foto_url?: string;
  en_linea?: boolean;
  permitir_cambio_password?: boolean;
  ultimo_cambio_password?: string;
  permisos_modulos?: string[];
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  usuario: string;
  contrasena: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Mapeo de roles (nombre exacto BD → alias corto)
export const ROLE_ROUTES: Record<string, string> = {
  "Superadministrador": "/admin/dashboard",
  "Gerente":            "/dashboard",
  "Jefe de Operaciones": "/operaciones",
  "Encargado de Bodega": "/inventario",
  "Recepcionista":      "/ventas",
  "Mecanico":           "/mecanica",
  "Piloto":             "/viajes",
  "Contador":           "/finanzas",
};

// Mapeo inverso alias corto → nombre BD
export const ROLE_ALIAS: Record<string, string> = {
  superadmin:       "Superadministrador",
  gerente:          "Gerente",
  jefe_operaciones: "Jefe de Operaciones",
  bodeguero:        "Encargado de Bodega",
  recepcionista:    "Recepcionista",
  mecanico:         "Mecanico",
  piloto:           "Piloto",
  contador:         "Contador",
};
