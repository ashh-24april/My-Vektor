import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import supabase from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import type { LoginCredentials } from "../types/auth";
import { ROLE_ROUTES } from "../types/auth";

export const useAuth = () => {
  const { user, accessToken, isAuthenticated, isInitializing, isLoading, setAuth, clearAuth } =
    useAuthStore();
  const navigate = useNavigate();

  /**
   * Inicia sesión con las credenciales del usuario.
   * En caso de éxito, actualiza el store y redirige usando replace: true.
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await api.post("/api/auth/login", credentials);
      const { accessToken, user } = response.data;
      setAuth(user, accessToken);

      // Redirigir según el rol reemplazando el historial del navegador
      const route = ROLE_ROUTES[user.rol] || "/dashboard";
      navigate(route, { replace: true });

      return response.data;
    },
    [setAuth, navigate]
  );

  /**
   * Cierra la sesión del usuario actual y limpia el almacenamiento.
   */
  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Ignorar errores de red al hacer logout
    } finally {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignorar errores de Supabase al salir
      }
      clearAuth();
      localStorage.removeItem("myvektor_auth_session");
      localStorage.removeItem("myvektor_supabase_auth");
      navigate("/login", { replace: true });
    }
  }, [clearAuth, navigate]);

  /**
   * Renueva silenciosamente la sesión al cargar la app.
   */
  const tryRefresh = useCallback(async () => {
    try {
      const response = await api.post("/api/auth/refresh");
      const { accessToken, user } = response.data;
      setAuth(user, accessToken);
    } catch {
      clearAuth();
    }
  }, [setAuth, clearAuth]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isInitializing,
    isLoading,
    login,
    logout,
    tryRefresh,
  };
};
