import React, { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";
import supabase from "../lib/supabase";

/**
 * AuthInitializer
 * Inicializador global de autenticación:
 * 1. Verifica y restaura la sesión activa al recargar la página (F5) usando localStorage / Supabase / backend API.
 * 2. Mantiene 'isInitializing' en true durante la comprobación previa para evitar redirecciones prematuras.
 * 3. Escucha cambios de estado en Supabase Auth (onAuthStateChange).
 * 4. Escucha el evento 'storage' para la sincronización y cierre de sesión multi-pestaña en tiempo real.
 */
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { setAuth, clearAuth, setInitializing, setLoading } = useAuthStore();
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    // 1. Verificación e inicialización de la sesión al cargar o recargar
    const initializeAuth = async () => {
      if (initAttemptedRef.current) return;
      initAttemptedRef.current = true;

      // Timeout de seguridad máximo de 4 segundos para impedir que el usuario se quede atrapado en "Verificando sesión..."
      const safetyTimeout = setTimeout(() => {
        const state = useAuthStore.getState();
        if (!state.isAuthenticated) {
          clearAuth();
        }
        setInitializing(false);
        setLoading(false);
      }, 4000);

      try {
        // Si ya existe sesión rehidratada en el store Zustand via persist (localStorage)
        const storedState = useAuthStore.getState();
        if (storedState.isAuthenticated && storedState.accessToken && storedState.user) {
          clearTimeout(safetyTimeout);
          setInitializing(false);
          setLoading(false);
          return;
        }

        // Intentar obtener sesión desde Supabase Auth nativo con timeout de 2.5s
        let session = null;
        try {
          const supabaseResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: { session: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null } }), 2500)
            ),
          ]);
          session = supabaseResult?.data?.session;
        } catch {
          session = null;
        }

        if (session && session.user) {
          const userMeta = session.user.user_metadata || {};
          const user = {
            id: Number(session.user.id) || 1,
            nombre: userMeta.nombre || session.user.email?.split("@")[0] || "Usuario",
            usuario: userMeta.usuario || session.user.email?.split("@")[0] || "usuario",
            email: session.user.email || "",
            correo: session.user.email || "",
            rol: userMeta.rol || "Gerente",
          };
          setAuth(user, session.access_token);
        } else {
          // Si no hay sesión Supabase, intentar refrescar mediante el backend propio
          const res = await api.post("/api/auth/refresh");
          const { accessToken, user } = res.data;
          setAuth(user, accessToken);
        }
      } catch {
        // Si falla la inicialización/refresh, se limpia el estado
        clearAuth();
      } finally {
        clearTimeout(safetyTimeout);
        setInitializing(false);
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listener para eventos de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        clearAuth();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      } else if (event === "SIGNED_IN" && session) {
        const userMeta = session.user.user_metadata || {};
        const user = {
          id: Number(session.user.id) || 1,
          nombre: userMeta.nombre || session.user.email?.split("@")[0] || "Usuario",
          usuario: userMeta.usuario || session.user.email?.split("@")[0] || "usuario",
          email: session.user.email || "",
          correo: session.user.email || "",
          rol: userMeta.rol || "Gerente",
        };
        setAuth(user, session.access_token);
      }
    });

    // 3. Listener para Sincronización Multi-Pestaña (Cross-Tab Logout Synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "myvektor_auth_session" || e.key === "myvektor_supabase_auth") {
        if (!e.newValue) {
          // La sesión fue eliminada en otra pestaña
          clearAuth();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            const stateData = parsed.state || parsed;
            if (!stateData.isAuthenticated || !stateData.accessToken) {
              clearAuth();
              if (window.location.pathname !== "/login") {
                window.location.href = "/login";
              }
            }
          } catch {
            clearAuth();
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [setAuth, clearAuth, setInitializing]);

  return <>{children}</>;
};

export default AuthInitializer;
