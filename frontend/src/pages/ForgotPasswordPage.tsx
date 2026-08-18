import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestSupabasePasswordReset } from "../api/users";
import { Mail, KeyRound, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const ForgotPasswordPage: React.FC = () => {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim()) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const frontendUrl = window.location.origin;
      const res = await requestSupabasePasswordReset(correo.trim(), frontendUrl);

      // Respuesta de seguridad genérica conforme a OWASP
      setSuccessMsg(
        res.message ||
          "Si el correo electrónico coincide con una cuenta registrada, recibirás un mensaje con las instrucciones en unos minutos."
      );
    } catch (err: any) {
      // En producción mostramos el mensaje seguro genérico para evitar filtrado de información
      setSuccessMsg(
        "Si el correo electrónico coincide con una cuenta registrada, recibirás un mensaje con las instrucciones en unos minutos."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-8 relative overflow-hidden">
        {/* Barra superior con gradiente */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        {/* Encabezado */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar Contraseña</h1>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Ingresa tu correo electrónico registrado para recibir el enlace seguro de restablecimiento.
          </p>
        </div>

        {/* Mensaje de Error (si existe falla de red o validación básica) */}
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Mensaje de Éxito Seguro (Mitigación de Enumeración de Usuarios OWASP) */}
        {successMsg && (
          <div className="mb-6 bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-200 text-xs flex items-start gap-3 shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-emerald-950">Solicitud Procesada</p>
              <p className="text-emerald-800 leading-relaxed">
                {successMsg}
              </p>
              <p className="text-[11px] text-emerald-700 mt-2 font-medium">
                * Revisa tu bandeja de entrada y la carpeta de correo no deseado (Spam).
              </p>
            </div>
          </div>
        )}

        {/* Formulario de Recuperación */}
        {!successMsg ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  disabled={loading}
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu-correo@gmail.com"
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando enlace...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Enviar Enlace de Recuperación</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <button
            onClick={() => {
              setSuccessMsg("");
              setCorreo("");
            }}
            className="w-full py-2.5 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs rounded-xl transition-colors mb-2"
          >
            Probar con otra dirección de correo
          </button>
        )}

        {/* Pie de página -> Regresar a Iniciar Sesión */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link to="/login" className="inline-flex items-center text-xs font-medium text-blue-600 hover:underline gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Iniciar Sesión</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
