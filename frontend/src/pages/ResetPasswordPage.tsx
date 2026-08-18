import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { syncPasswordWithSupabase } from "../api/users";
import { Lock, KeyRound, CheckCircle, AlertCircle, ArrowLeft, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    // Escuchar cambios en la sesión de autenticación de Supabase (especialmente para la recuperación)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase Auth Event en /reset-password:", event, session);
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasValidSession(true);
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      }
      setCheckingSession(false);
    });

    // Comprobar la sesión actual existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasValidSession(true);
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
      }
      setCheckingSession(false);
    }).catch(() => {
      setCheckingSession(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Validación básica de campos
    if (!nuevaContrasena || !confirmarContrasena) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (nuevaContrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError("Las contraseñas no coinciden. Verifícalas e intenta de nuevo.");
      return;
    }

    setLoading(true);

    try {
      // 1. Actualizar la contraseña en el cliente de Supabase Auth
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: nuevaContrasena
      });

      if (updateError) {
        throw new Error(updateError.message || "Error al actualizar la contraseña en Supabase.");
      }

      // 2. Sincronizar la contraseña en la base de datos de la aplicación
      const emailToSync = userEmail || data?.user?.email || "";
      if (emailToSync) {
        await syncPasswordWithSupabase({
          correo: emailToSync,
          nuevaContrasena
        }).catch((err) => {
          console.warn("Advertencia al sincronizar con BD local:", err);
        });
      }

      setSuccessMsg("¡Tu contraseña ha sido actualizada con éxito! Redirigiendo al inicio de sesión...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-8 relative overflow-hidden">
        {/* Adorno superior */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        {/* Encabezado */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Establecer Nueva Contraseña</h1>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Ingresa tu nueva contraseña para actualizar el acceso de forma segura.
          </p>
        </div>

        {/* Estado de Carga Inicial de Sesión */}
        {checkingSession ? (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-medium text-gray-500">Validando sesión de recuperación de Supabase...</p>
          </div>
        ) : !hasValidSession ? (
          /* Enlace o Sesión Inválida */
          <div className="space-y-4">
            <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-amber-900">Enlace expirado o no válido</p>
                <p className="text-amber-800 leading-relaxed">
                  No se detectó una sesión activa de recuperación de contraseña de Supabase. El enlace puede haber expirable o haber sido utilizado previamente.
                </p>
              </div>
            </div>

            <Link
              to="/recuperar-password"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Solicitar un nuevo correo de recuperación</span>
            </Link>

            <div className="pt-2 text-center">
              <Link to="/login" className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-blue-600 gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Login</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Formulario de Restablecimiento */
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {userEmail && (
              <div className="bg-blue-50/80 border border-blue-100 p-3 rounded-xl flex items-center gap-2 text-xs text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Recuperando cuenta para: <strong className="font-semibold">{userEmail}</strong></span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  disabled={loading}
                  type={showNueva ? "text" : "password"}
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNueva(!showNueva)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  disabled={loading}
                  type={showConfirmar ? "text" : "password"}
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmar(!showConfirmar)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Actualizando contraseña...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Guardar Nueva Contraseña</span>
                </>
              )}
            </button>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <Link to="/login" className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-blue-600 gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
