import axios from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

// URL base de la API del backend
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Instancia principal de Axios
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Necesario para enviar/recibir cookies (refreshToken)
  headers: {
    "Content-Type": "application/json",
  },
});

// Control de condición de carrera para el refresh
let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const resolvePendingRequests = (token: string) => {
  pendingRequests.forEach(({ resolve }) => resolve(token));
  pendingRequests = [];
};

const rejectPendingRequests = (error: unknown) => {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
};

// Función auxiliar para forzar el cierre de sesión e informar expiración
const handleSessionExpired = () => {
  const wasAuthenticated = useAuthStore.getState().isAuthenticated;
  useAuthStore.getState().clearAuth();
  localStorage.removeItem("myvektor_auth_session");
  localStorage.removeItem("myvektor_supabase_auth");
  
  if (wasAuthenticated) {
    sessionStorage.setItem("session_expired_msg", "Tu sesión ha expirado por seguridad.");
  }
  
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// Interceptor de REQUEST: adjunta el Access Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: manejo de 401 con refresh silencioso y expiración
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response?.status === 401;
    const isLoginEndpoint = originalRequest.url?.includes("/auth/login");
    const isRefreshEndpoint = originalRequest.url?.includes("/auth/refresh");

    // Si el 401 proviene de login o de refresh, forzar sesión expirada
    if (is401 && (isRefreshEndpoint || isLoginEndpoint)) {
      if (!isLoginEndpoint) {
        handleSessionExpired();
      }
      return Promise.reject(error);
    }

    // Para peticiones 401 normales, intentar el refresh silencioso
    if (is401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post("/api/auth/refresh");
        const { accessToken, user } = response.data;

        // Actualizar el store con el nuevo token
        useAuthStore.getState().setAuth(user, accessToken);
        resolvePendingRequests(accessToken);

        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        rejectPendingRequests(refreshError);
        handleSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
