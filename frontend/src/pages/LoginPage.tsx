import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, AlertCircle, Loader2, Lock, User, ShieldAlert } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { Navigate, Link, useLocation } from "react-router-dom";
import { ROLE_ROUTES } from "../types/auth";

const BACKGROUND_IMAGE_URL = import.meta.env.VITE_BACKGROUND_IMAGE_URL || "";

const LOGO_MYVEKTOR_URL = import.meta.env.VITE_LOGO_URL || "";

const loginSchema = z.object({
  usuario: z.string().min(1, "El usuario es requerido."),
  contrasena: z.string().min(1, "La contraseña es requerida."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { isAuthenticated, isInitializing, isLoading, user } = useAuthStore();
  const location = useLocation();

  const { register, handleSubmit, setValue } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Autorellenar usuario si "Recuérdame" fue marcado en un login anterior
  useEffect(() => {
    const savedUsername = localStorage.getItem("remembered_username");
    if (savedUsername) {
      setValue("usuario", savedUsername);
      setRememberMe(true);
    }
  }, [setValue]);

  useEffect(() => {
    // Detectar mensaje de expiración de sesión desde sessionStorage o router state
    const expired = sessionStorage.getItem("session_expired_msg") || (location.state as any)?.sessionExpiredMessage;
    if (expired) {
      setSessionExpiredMsg(expired);
      sessionStorage.removeItem("session_expired_msg");
    }
  }, [location]);

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#041954]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-white/70 text-sm font-medium">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const route = ROLE_ROUTES[user.rol] || "/dashboard";
    return <Navigate to={route} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setSessionExpiredMsg(null);
    setIsSubmitting(true);
    try {
      await login(data);
      // Login exitoso: guardar o limpiar usuario según "Recuérdame"
      // NOTA: NUNCA se guarda la contraseña en localStorage por seguridad.
      if (rememberMe) {
        localStorage.setItem("remembered_username", data.usuario);
      } else {
        localStorage.removeItem("remembered_username");
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string }; status?: number } };
      if (axiosError?.response?.status === 429) {
        setServerError("Demasiados intentos. Por favor espera unos minutos e intenta de nuevo.");
      } else {
        setServerError("Credenciales inválidas. Verifica tu usuario y contraseña.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#041954] bg-cover bg-center overflow-x-hidden select-none"
      style={{
        backgroundImage: BACKGROUND_IMAGE_URL ? `url("${BACKGROUND_IMAGE_URL}")` : undefined,
      }}
    >
      <div className="absolute inset-0 bg-[#041954]/60 backdrop-blur-[5px] pointer-events-none" />

      <div
        className="relative z-10 w-full max-w-[1150px] mx-auto flex flex-col items-center"
        style={{
          animation: "card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div className="w-full bg-[#f9f9f9] border border-gray-200/80 shadow-2xl rounded-3xl sm:rounded-[32px] p-6 sm:p-10 lg:p-12 transition-all">
          
          <div className="flex flex-col items-center mb-8 text-center">
            <img
              src={LOGO_MYVEKTOR_URL}
              alt="MyVektor Logo"
              className="h-16 sm:h-20 mb-3 object-contain"
            />
            <h1
              className="font-bold tracking-tight text-2xl sm:text-3xl text-[#092C92]"
              style={{ letterSpacing: "-0.02em" }}
            >
              MY VEKTOR
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-wider mt-1 text-[#092C92]/60 uppercase">
              SISTEMA ERP DE TRANSPORTE PESADO
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full space-y-5">
            {/* Banner de sesión expirada */}
            {sessionExpiredMsg && (
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800"
                style={{ animation: "fade-up 0.25s ease both" }}
              >
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <p className="text-sm font-medium leading-snug">{sessionExpiredMsg}</p>
              </div>
            )}

            {/* Banner de error de credenciales o servidor */}
            {serverError && (
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3.5 bg-red-500/10 border border-red-500/30"
                style={{ animation: "fade-up 0.25s ease both" }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm text-red-600 font-medium leading-snug">{serverError}</p>
              </div>
            )}

            <div className="flex flex-col lg:flex-row items-stretch lg:items-start justify-center gap-5 lg:gap-6 w-full pt-1 pb-2">
              
              <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3 w-full lg:flex-1">
                <label
                  htmlFor="usuario-input"
                  className="text-sm font-bold text-[#092C92] shrink-0 w-full lg:w-auto text-left"
                >
                  Usuario:
                </label>
                <div className="relative w-full flex-1">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="usuario-input"
                    {...register("usuario")}
                    type="text"
                    autoComplete="username"
                    disabled={isSubmitting}
                    placeholder="Ingresa tu usuario"
                    className="w-full h-11 rounded-xl pl-10 pr-4 text-sm font-medium text-gray-800 bg-white border border-gray-300 outline-none transition-all focus:border-[#092C92] focus:ring-2 focus:ring-[#092C92]/20 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-start gap-1.5 lg:gap-3 w-full lg:flex-1">
                <label
                  htmlFor="contrasena-input"
                  className="text-sm font-bold text-[#092C92] shrink-0 w-full lg:w-auto text-left lg:pt-3"
                >
                  Contraseña:
                </label>
                <div className="flex flex-col w-full flex-1 min-w-0">
                  <div className="relative w-full">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      id="contrasena-input"
                      {...register("contrasena")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      placeholder="••••••••"
                      className="w-full h-11 rounded-xl pl-10 pr-10 text-sm font-medium text-gray-800 bg-white border border-gray-300 outline-none transition-all focus:border-[#092C92] focus:ring-2 focus:ring-[#092C92]/20 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between w-full mt-1.5">
                    {/* Checkbox Recuérdame */}
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 rounded border-gray-300 accent-[#041954] cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-xs font-semibold text-gray-500 group-hover:text-[#092C92] transition-colors">
                        Recuérdame
                      </span>
                    </label>

                    <Link
                      to="/recuperar-password"
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors truncate"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
                <button
                  id="btn-ingresar"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full lg:w-auto h-11 min-w-[130px] px-8 rounded-xl bg-[#092C92] hover:bg-[#072273] active:bg-[#051854] text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    "Ingresar"
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>

        <p className="text-center text-xs font-medium mt-6 text-white/50 tracking-wider">
          © {new Date().getFullYear()} MyVektor · Sistema de Gestión de Transporte
        </p>
      </div>

      <style>{`
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(16px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder {
          color: #9ca3af;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #1f2937 !important;
          caret-color: #1f2937 !important;
          transition: background-color 50000s ease-in-out 0s !important;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;