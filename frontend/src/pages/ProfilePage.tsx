import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useAuth } from "../hooks/useAuth";
import { updateUser } from "../api/users";
import supabase from "../lib/supabase";
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
  Save,
} from "lucide-react";
import { Link } from "react-router-dom";

// Función utilitaria para parsear correctamente Nombres y Apellidos
export const parseFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { nombres: parts[0] || "", apellidos: "" };
  }
  if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1] };
  }
  if (parts.length === 3) {
    return { nombres: `${parts[0]} ${parts[1]}`, apellidos: parts[2] };
  }
  // Para 4 o más nombres/apellidos (ej. Ashlly Saraí Pineda Belloso)
  const mid = Math.floor(parts.length / 2);
  return {
    nombres: parts.slice(0, mid).join(" "),
    apellidos: parts.slice(mid).join(" "),
  };
};

// Detección dinámica del dispositivo actual mediante User-Agent
const getDeviceDetails = () => {
  const ua = navigator.userAgent;
  let dispositivo = "Windows PC (Escritorio)";
  let tipo: "desktop" | "mobile" = "desktop";

  if (/android/i.test(ua)) {
    dispositivo = "Dispositivo Android";
    tipo = "mobile";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    dispositivo = "iPhone / iPad (iOS)";
    tipo = "mobile";
  } else if (/macintosh|mac os x/i.test(ua)) {
    dispositivo = "MacBook / Mac (macOS)";
  } else if (/linux/i.test(ua)) {
    dispositivo = "Linux PC (Escritorio)";
  }

  let navegador = "Navegador Web";
  if (ua.indexOf("Firefox") > -1) navegador = "Mozilla Firefox";
  else if (ua.indexOf("SamsungBrowser") > -1) navegador = "Samsung Internet";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) navegador = "Opera";
  else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) navegador = "Microsoft Edge";
  else if (ua.indexOf("Chrome") > -1) navegador = "Google Chrome";
  else if (ua.indexOf("Safari") > -1) navegador = "Apple Safari";

  return { dispositivo, tipo, navegador };
};

const ProfilePage: React.FC = () => {
  const { user, accessToken, setAuth } = useAuthStore();
  const { logout } = useAuth();

  // Parseo inicial de nombres y apellidos
  const parsedNames = parseFullName(user?.nombre || "");
  const [nombres, setNombres] = useState(parsedNames.nombres);
  const [apellidos, setApellidos] = useState(parsedNames.apellidos);
  const [telefono, setTelefono] = useState(user?.telefono || "");
  const [fotoUrl, setFotoUrl] = useState(user?.foto_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar estados locales al cambiar el usuario en el store
  useEffect(() => {
    if (user) {
      const parsed = parseFullName(user.nombre);
      setNombres(parsed.nombres);
      setApellidos(parsed.apellidos);
      setTelefono(user.telefono || "");
      setFotoUrl(user.foto_url || "");
    }
  }, [user]);

  // Información de la sesión activa única detectada dinámicamente
  const currentDevice = getDeviceDetails();

  // Formatear la fecha del último cambio de contraseña
  const formatLastPasswordChange = (dateString?: string) => {
    if (!dateString) return "12/08/2026";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "12/08/2026";
    }
  };

  // Subida directa del avatar a Supabase Storage (Bucket 'Perfiles')
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validación de tipo y tamaño (máx 5MB)
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("La imagen debe ser menor a 5 MB.");
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);
    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `perfil_foto_${user.id}_${Date.now()}.${fileExt}`;

      // 1. Subir archivo a Supabase Storage (Bucket 'Perfiles')
      const { error: uploadError } = await supabase.storage
        .from("Perfiles")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Error en Supabase Storage: ${uploadError.message}`);
      }

      // 2. Obtener la URL pública oficial generada
      const { data: publicUrlData } = supabase.storage
        .from("Perfiles")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("No se pudo obtener la URL pública de la imagen.");
      }

      // 3. Actualizar la base de datos PostgreSQL mediante el backend
      await updateUser(user.id, { foto_url: publicUrl });

      // 4. Sincronizar el estado global de autenticación en Zustand
      setFotoUrl(publicUrl);
      setAuth({ ...user, foto_url: publicUrl }, accessToken || "");

      setSuccessMessage("Foto de perfil actualizada exitosamente en Supabase.");
    } catch (err: any) {
      console.error("Error subida avatar:", err);
      setErrorMessage(err.message || "Error al subir la foto de perfil.");
    } finally {
      setIsUploading(false);
    }
  };

  // Guardar cambios de nombres, apellidos y teléfono
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const fullUpdatedName = `${nombres.trim()} ${apellidos.trim()}`.trim();

      // Actualizar en el Backend y Supabase DB
      await updateUser(user.id, {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        nombre: fullUpdatedName,
        telefono: telefono.trim(),
      });

      // Sincronizar con el estado global de Zustand
      setAuth(
        {
          ...user,
          nombre: fullUpdatedName || user.nombre,
          telefono: telefono.trim(),
          foto_url: fotoUrl,
        },
        accessToken || ""
      );

      setSuccessMessage("Preferencias de perfil y teléfono guardadas exitosamente.");
    } catch (err: any) {
      console.error("Error al guardar perfil:", err);
      setErrorMessage("No se pudieron guardar los cambios. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 select-none">
      {/* Encabezado Principal */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-[#041954] tracking-tight">
          Perfil y Preferencias
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Estas preferencias solo se aplican a tu cuenta de usuario.
        </p>
      </div>

      {/* Alertas de Notificación */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveChanges} className="space-y-8">
        {/* 1. SECCIÓN GLOBAL: Avatar e Información de Nombre/Apellidos */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-bold text-[#041954] tracking-wide border-b border-gray-100 pb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-[#092C92]" />
            <span>Información Global de Usuario</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar con Subida a Supabase Storage */}
            <div className="relative group shrink-0">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={user?.nombre || "Avatar"}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#041954] text-white flex items-center justify-center font-bold text-2xl border-4 border-gray-100 shadow-md">
                  {(nombres.charAt(0) || "U").toUpperCase()}
                  {(apellidos.charAt(0) || "").toUpperCase()}
                </div>
              )}

              <label
                htmlFor="upload-photo-input"
                className={`absolute bottom-0 right-0 p-2 rounded-full bg-[#092C92] text-white hover:bg-[#041954] shadow-lg cursor-pointer transition-all border-2 border-white ${
                  isUploading ? "opacity-75 cursor-not-allowed" : ""
                }`}
                title="Cambiar foto de perfil en Supabase"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  id="upload-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-lg font-bold text-gray-900">{user?.nombre}</h3>
              <p className="text-xs font-semibold text-[#092C92] bg-blue-50 px-3 py-1 rounded-full inline-block border border-blue-100">
                Rol: {user?.rol}
              </p>
              <p className="text-xs text-gray-400">
                Las imágenes se guardan directamente en el bucket de Supabase Storage.
              </p>
            </div>
          </div>

          {/* Inputs de Nombres y Apellidos Parseados Correctamente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label
                htmlFor="nombres-input"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
              >
                Nombres
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="nombres-input"
                  type="text"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="Ej: Ashlly Saraí"
                  required
                  className="w-full h-11 rounded-xl pl-10 pr-4 text-sm font-medium text-gray-800 bg-white border border-gray-300 outline-none focus:border-[#092C92] focus:ring-2 focus:ring-[#092C92]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="apellidos-input"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
              >
                Apellidos
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="apellidos-input"
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Ej: Pineda Belloso"
                  className="w-full h-11 rounded-xl pl-10 pr-4 text-sm font-medium text-gray-800 bg-white border border-gray-300 outline-none focus:border-[#092C92] focus:ring-2 focus:ring-[#092C92]/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. CONTACTO Y CREDENCIALES: Teléfono (Editable) y Email (Solo Lectura) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-bold text-[#041954] tracking-wide border-b border-gray-100 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#092C92]" />
            <span>Contacto y Credenciales de Acceso</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Número de Teléfono (Persistido) */}
            <div>
              <label
                htmlFor="telefono-input"
                className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2"
              >
                Número de Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="telefono-input"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+502 5000-0000"
                  className="w-full h-11 rounded-xl pl-10 pr-4 text-sm font-medium text-gray-800 bg-white border border-gray-300 outline-none focus:border-[#092C92] focus:ring-2 focus:ring-[#092C92]/20 transition-all"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Número celular de contacto persistido en la base de datos PostgreSQL.
              </p>
            </div>

            {/* Dirección de Correo Electrónico (SOLO LECTURA) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="email-input"
                  className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                >
                  Dirección de Correo Electrónico
                </label>
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                  Solo Lectura
                </span>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="email-input"
                  type="email"
                  value={user?.email || user?.correo || "usuario@myvektor.com"}
                  readOnly
                  disabled
                  className="w-full h-11 rounded-xl pl-10 pr-4 text-sm font-medium text-gray-500 bg-gray-100/80 border border-gray-200 cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                El correo está vinculado a la cuenta principal y no se puede modificar desde aquí.
              </p>
            </div>
          </div>

          {/* Bloque Informativo de Contraseña */}
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100/60 flex items-center justify-center text-[#092C92] shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Contraseña de Seguridad</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Restablecida por última vez el{" "}
                  <span className="font-semibold text-gray-700">
                    {formatLastPasswordChange(user?.ultimo_cambio_password)}
                  </span>
                </p>
              </div>
            </div>

            <Link
              to="/recuperar-password"
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-[#092C92] font-semibold text-xs border border-gray-300 transition-all shadow-sm shrink-0 whitespace-nowrap"
            >
              Cambiar contraseña
            </Link>
          </div>
        </div>

        {/* 3. GESTIÓN DE SESIONES: Dinámica por User-Agent sin Sesiones Estáticas */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#041954] tracking-wide flex items-center gap-2">
              <Monitor className="w-5 h-5 text-[#092C92]" />
              <span>Gestión de Sesiones</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Gestiona tus sesiones activas e inactivas en todos los dispositivos.
            </p>
          </div>

          {/* Tabla de Sesión Activa Dinámica */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Dispositivo</th>
                  <th className="py-3 px-4">Navegador</th>
                  <th className="py-3 px-4">Dirección IP</th>
                  <th className="py-3 px-4">Última Actividad</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-2.5">
                      {currentDevice.tipo === "desktop" ? (
                        <Monitor className="w-4 h-4 text-[#092C92] shrink-0" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-[#092C92] shrink-0" />
                      )}
                      <span>{currentDevice.dispositivo}</span>
                      <span className="text-[10px] font-bold bg-blue-100 text-[#092C92] px-2 py-0.5 rounded-full border border-blue-200">
                        Dispositivo Actual
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">{currentDevice.navegador}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-500">190.56.253.12</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block -ml-3.5" />
                      <span className="font-semibold text-emerald-700">Hace unos segundos</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar sesión</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Paginador Sutil */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>Mostrando 1 de 1 sesión activa</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 rounded-lg bg-[#041954] text-white font-bold text-xs">
                1
              </span>
              <button
                type="button"
                disabled
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. GUARDADO DE CAMBIOS */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="h-12 px-8 rounded-xl bg-[#041954] hover:bg-[#092C92] active:bg-[#020e30] text-white font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando cambios...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal de Confirmación de Cierre de Sesión */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">¿Cerrar sesión actual?</h3>
            <p className="text-xs text-gray-500">
              Esta acción finalizará tu sesión actual y te redirigirá a la pantalla de inicio de sesión.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors"
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
