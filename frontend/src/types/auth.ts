// Estructura granular de permisos por módulo
export interface PermisoModulo {
  modulo: string;
  permitido: boolean;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

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
  permisos_modulos?: PermisoModulo[];
}

/**
 * Verifica si el usuario tiene una acción específica sobre un módulo.
 * - Superadministrador y Gerente: siempre true.
 * - Sin permisos configurados: true (compatibilidad con cuentas sin restricciones).
 * - Con permisos: busca el módulo y verifica la acción exacta.
 */
export const hasPermission = (
  user: User | null,
  modulo: string,
  accion: keyof Omit<PermisoModulo, 'modulo' | 'permitido'>
): boolean => {
  if (!user) return false;
  const rol = (user.rol || "").toLowerCase();
  if (rol.includes("admin") || rol.includes("geren")) return true;
  if (!user.permisos_modulos || user.permisos_modulos.length === 0) return true;
  const permiso = user.permisos_modulos.find(
    p => p.modulo && p.modulo.toLowerCase() === modulo.toLowerCase()
  );
  if (!permiso) return true;
  if (!permiso.permitido) return false;
  return permiso[accion] === true;
};

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
