import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "../types/auth";

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;

  // Acciones
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: true, // Inicializa en true para permitir verificación previa al cargar
      isLoading: false,

      setAuth: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isInitializing: false,
          isLoading: false,
        }),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setInitializing: (initializing) =>
        set({ isInitializing: initializing, isLoading: false }),

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isInitializing: false,
          isLoading: false,
        });
      },
    }),
    {
      name: "myvektor_auth_session", // Persistencia en localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
