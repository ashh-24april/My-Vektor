import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { createUser, updateUser, getUsers, type User } from "../../api/users";
import { getRoles, type Role } from "../../api/roles";
import PermissionAccordion, { type ModulePermission } from "../../components/PermissionAccordion";

interface Props {
  user: User | null;
  onClose: () => void;
  onSuccess: (info?: { nombre: string; usuario: string; correo: string }) => void;
  requireAdminKey?: boolean;
}

interface FormErrors {
  nombres?: string;
  apellidos?: string;
  correo?: string;
  correo_recuperacion?: string;
  contrasena?: string;
  id_rol?: string;
}

interface FormTouched {
  nombres?: boolean;
  apellidos?: boolean;
  correo?: boolean;
  correo_recuperacion?: boolean;
  contrasena?: boolean;
  id_rol?: boolean;
}

const ALL_MODULES = [
  "Dashboard",
  "Usuarios",
  "Operaciones",
  "Inventario",
  "Ventas",
  "Mecánica",
  "Viajes",
  "Finanzas"
];

const normalizeStr = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

/**
 * Genera un nombre de usuario incremental basado en los usuarios registrados en la BD.
 * Ejemplo:
 * - "Ingrid Calderon" -> "icalderon" (si no existe)
 * - "Ivan Calderon" -> "icalderon01" (si "icalderon" ya existe)
 * - "Ian Calderon" -> "icalderon02" (si "icalderon01" ya existe)
 */
const generateIncrementalUsername = (
  nombres: string,
  apellidos: string,
  existingUsers: User[],
  currentUserId?: number
): string => {
  if (!nombres.trim() || !apellidos.trim()) return "";

  const firstWordName = nombres.trim().split(/\s+/)[0];
  const firstWordApellido = apellidos.trim().split(/\s+/)[0];

  if (!firstWordName || !firstWordApellido) return "";

  const firstLetter = normalizeStr(firstWordName.charAt(0));
  const normalizedApellido = normalizeStr(firstWordApellido);
  const baseUsername = firstLetter + normalizedApellido;

  if (!baseUsername) return "";

  const occupiedSet = new Set(
    existingUsers
      .filter((u) => u.id_usuario !== currentUserId)
      .flatMap((u) => [
        u.usuario?.toLowerCase(),
        u.correo?.split("@")[0]?.toLowerCase(),
      ])
      .filter(Boolean) as string[]
  );

  if (!occupiedSet.has(baseUsername)) {
    return baseUsername;
  }

  let counter = 1;
  while (counter <= 99) {
    const candidate = `${baseUsername}${counter.toString().padStart(2, "0")}`;
    if (!occupiedSet.has(candidate)) {
      return candidate;
    }
    counter++;
  }

  return `${baseUsername}${counter}`;
};

const splitNombre = (fullName: string) => {
  const words = fullName.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return { nombres: "", apellidos: "" };
  if (words.length === 1) return { nombres: words[0], apellidos: "" };
  if (words.length === 2) return { nombres: words[0], apellidos: words[1] };
  
  const N = words.length;
  const nombres = words.slice(0, N - 2).join(" ");
  const apellidos = words.slice(N - 2).join(" ");
  return { nombres, apellidos };
};

const validateStep1 = (
  data: {
    nombres: string;
    apellidos: string;
    correo: string;
    correo_recuperacion: string;
    contrasena: string;
    id_rol: number;
  },
  isEditMode: boolean,
  existingUsers: User[],
  currentUserId?: number
): FormErrors => {
  const errors: FormErrors = {};

  // 1. Nombres (Obligatorio): Letras (inc. acentos y ñ) y espacios. Máx 3 nombres.
  const nombresTrimmed = data.nombres.trim();
  const regexNombres = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+(\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+){0,2}$/;
  if (!nombresTrimmed) {
    errors.nombres = "El nombre es obligatorio.";
  } else if (!regexNombres.test(nombresTrimmed)) {
    errors.nombres = "Solo se permiten letras (máximo 3 nombres, sin números ni símbolos).";
  }

  // 2. Apellidos (Obligatorio): Letras (inc. acentos y ñ) y espacios. Máx 2 apellidos.
  const apellidosTrimmed = data.apellidos.trim();
  const regexApellidos = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+(\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+){0,1}$/;
  if (!apellidosTrimmed) {
    errors.apellidos = "El apellido es obligatorio.";
  } else if (!regexApellidos.test(apellidosTrimmed)) {
    errors.apellidos = "Solo se permiten letras (máximo 2 apellidos, sin números ni símbolos).";
  }

  // 3. Usuario / Prefix Correo Sistema (Obligatorio): Alfanumérico min 3 chars sin espacios/símbolos.
  const correoPrefixTrimmed = data.correo.trim().toLowerCase();
  const regexCorreoPrefix = /^[a-zA-Z0-9]{3,}$/;
  if (!correoPrefixTrimmed) {
    errors.correo = "El usuario/prefijo de correo es obligatorio.";
  } else if (!regexCorreoPrefix.test(correoPrefixTrimmed)) {
    errors.correo = "Debe ser alfanumérico sin espacios ni caracteres especiales (mínimo 3 caracteres).";
  } else {
    // Validación de Unicidad en Tiempo Real contra la lista de usuarios existentes
    const isDuplicate = existingUsers.some((u) => {
      if (isEditMode && u.id_usuario === currentUserId) return false;
      const uUsername = u.usuario?.toLowerCase();
      const uCorreoPrefix = u.correo?.split("@")[0]?.toLowerCase();
      return uUsername === correoPrefixTrimmed || uCorreoPrefix === correoPrefixTrimmed;
    });

    if (isDuplicate) {
      errors.correo = "Este usuario / correo de sistema ya se encuentra registrado.";
    }
  }

  // 4. Correo de Recuperación (Obligatorio): Formato válido terminando estrictamente en @gmail.com
  const correoRecTrimmed = data.correo_recuperacion.trim();
  const regexGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
  if (!correoRecTrimmed) {
    errors.correo_recuperacion = "El correo de recuperación es obligatorio.";
  } else if (!regexGmail.test(correoRecTrimmed)) {
    errors.correo_recuperacion = "El correo debe terminar en @gmail.com";
  }

  // 5. Contraseña Inicial (Obligatoria cuando no es edición): Min 8 car, 1 letra, 1 número, 1 símbolo.
  if (!isEditMode) {
    const contrasenaVal = data.contrasena;
    const regexContrasena = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!contrasenaVal) {
      errors.contrasena = "La contraseña es obligatoria.";
    } else if (!regexContrasena.test(contrasenaVal)) {
      errors.contrasena = "La contraseña debe tener al menos 8 caracteres, incluir letras, números y símbolos (!@#$%^&*).";
    }
  }

  // 6. Rol Principal (Obligatorio): Selección válida
  if (!data.id_rol || Number(data.id_rol) <= 0) {
    errors.id_rol = "Debe seleccionar un rol principal válido.";
  }

  return errors;
};

const UserForm: React.FC<Props> = ({ user, onClose, onSuccess, requireAdminKey }) => {
  const isEdit = !!user;
  const currentUserId = user?.id_usuario;
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [userManuallyEditedCorreo, setUserManuallyEditedCorreo] = useState(false);
  const [touched, setTouched] = useState<FormTouched>({});
  
  const { nombres: initialNombres, apellidos: initialApellidos } = user 
    ? splitNombre(user.nombre) 
    : { nombres: "", apellidos: "" };

  const buildInitialModulos = (): ModulePermission[] => {
    if (user?.permisos_modulos && user.permisos_modulos.length > 0) {
      return ALL_MODULES.map(modName => {
        const saved = (user.permisos_modulos as any[]).find((p: any) => p.modulo === modName);
        return saved
          ? { modulo: modName, ver: saved.ver ?? saved.permitido ?? true, crear: saved.crear ?? false, editar: saved.editar ?? false, eliminar: saved.eliminar ?? false }
          : { modulo: modName, ver: false, crear: false, editar: false, eliminar: false };
      });
    }
    return ALL_MODULES.map(m => ({ modulo: m, ver: true, crear: false, editar: false, eliminar: false }));
  };
  const initialModulos = buildInitialModulos();

  const [formData, setFormData] = useState({
    nombres: initialNombres,
    apellidos: initialApellidos,
    usuario: user?.usuario || "",
    correo: user ? user.correo.split("@")[0] : "",
    correo_recuperacion: user?.correo_recuperacion || "",
    contrasena: "",
    id_rol: user?.rol.id_rol || 0,
    activo: user?.activo ?? true,
    permitir_cambio_password: user?.permitir_cambio_password ?? true,
    max_intentos_fallidos: user?.max_intentos_fallidos ?? 5,
    dias_cambio_password: user?.dias_cambio_password ?? 90,
    modulosPermitidos: initialModulos,
    adminKey: "",
  });

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [rolesData, usersData] = await Promise.all([getRoles(), getUsers()]);
        setRoles(rolesData);
        setExistingUsers(usersData);

        if (!isEdit && rolesData.length > 0) {
          setFormData(prev => ({ ...prev, id_rol: rolesData[0].id_rol }));
        }
      } catch (err) {
        console.error("Error cargando datos para el formulario de usuarios", err);
      }
    };
    loadFormData();
  }, [isEdit]);

  // Generación automática incremental al escribir Nombres y Apellidos
  useEffect(() => {
    if (!isEdit && !userManuallyEditedCorreo && existingUsers.length >= 0) {
      const autoUsername = generateIncrementalUsername(
        formData.nombres,
        formData.apellidos,
        existingUsers,
        currentUserId
      );
      if (autoUsername) {
        setFormData((prev) => ({
          ...prev,
          correo: autoUsername,
          usuario: autoUsername,
        }));
      }
    }
  }, [formData.nombres, formData.apellidos, existingUsers, isEdit, userManuallyEditedCorreo, currentUserId]);

  useEffect(() => {
    if (user) {
      const { nombres, apellidos } = splitNombre(user.nombre);
      const modulos: ModulePermission[] = ALL_MODULES.map(modName => {
        const saved = (user.permisos_modulos as any[] | undefined)?.find((p: any) => p.modulo === modName);
        if (saved) return { modulo: modName, ver: saved.ver ?? saved.permitido ?? true, crear: saved.crear ?? false, editar: saved.editar ?? false, eliminar: saved.eliminar ?? false };
        return { modulo: modName, ver: false, crear: false, editar: false, eliminar: false };
      });

      setFormData(prev => ({
        ...prev,
        nombres,
        apellidos,
        usuario: user.usuario,
        correo: user.correo.split("@")[0],
        correo_recuperacion: user.correo_recuperacion || "",
        id_rol: user.rol.id_rol,
        activo: user.activo ?? true,
        permitir_cambio_password: user.permitir_cambio_password ?? true,
        max_intentos_fallidos: user.max_intentos_fallidos ?? 5,
        dias_cambio_password: user.dias_cambio_password ?? 90,
        modulosPermitidos: modulos
      }));
    }
  }, [user]);

  const errors = validateStep1(formData, isEdit, existingUsers, currentUserId);

  const touchAllStep1 = () => {
    setTouched({
      nombres: true,
      apellidos: true,
      correo: true,
      correo_recuperacion: true,
      contrasena: true,
      id_rol: true,
    });
  };

  const handleBlur = (field: keyof FormTouched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === "correo") {
      setUserManuallyEditedCorreo(true);
    }
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'id_rol' || name === 'max_intentos_fallidos' || name === 'dias_cambio_password' 
          ? parseInt(value) || 0 
          : value
      }));
    }
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      touchAllStep1();
      const currentErrors = validateStep1(formData, isEdit, existingUsers, currentUserId);
      if (Object.keys(currentErrors).length > 0) {
        return;
      }
    }
    if (activeStep < 3) {
      setActiveStep(prev => (prev + 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (targetStep: 1 | 2 | 3) => {
    if (activeStep === 1 && targetStep > 1) {
      touchAllStep1();
      const currentErrors = validateStep1(formData, isEdit, existingUsers, currentUserId);
      if (Object.keys(currentErrors).length > 0) {
        return;
      }
    }
    setActiveStep(targetStep);
  };

  const handlePermissionChange = (updated: ModulePermission) => {
    setFormData(prev => ({
      ...prev,
      modulosPermitidos: (prev.modulosPermitidos as ModulePermission[]).map(p =>
        p.modulo === updated.modulo ? updated : p
      )
    }));
  };

  const handleSelectAllModules = (select: boolean) => {
    setFormData(prev => ({
      ...prev,
      modulosPermitidos: ALL_MODULES.map(m => ({
        modulo: m,
        ver:      select,
        crear:    false,
        editar:   false,
        eliminar: false,
      } as ModulePermission))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    touchAllStep1();
    const step1Errors = validateStep1(formData, isEdit, existingUsers, currentUserId);
    if (Object.keys(step1Errors).length > 0) {
      setActiveStep(1);
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const cleanNombres = formData.nombres.trim();
      const cleanApellidos = formData.apellidos.trim();
      const cleanCorreoPrefix = formData.correo.trim().split("@")[0];
      const finalCorreo = cleanCorreoPrefix ? `${cleanCorreoPrefix}@myvektor.com` : "";
      const cleanCorreoRecuperacion = formData.correo_recuperacion.trim();
      const cleanContrasena = formData.contrasena.trim();

      const payload = {
        nombres: cleanNombres,
        apellidos: cleanApellidos,
        correo: finalCorreo,
        correo_recuperacion: cleanCorreoRecuperacion ? cleanCorreoRecuperacion : null,
        id_rol: Number(formData.id_rol),
        activo: formData.activo,
        permitir_cambio_password: formData.permitir_cambio_password,
        max_intentos_fallidos: Number(formData.max_intentos_fallidos),
        dias_cambio_password: Number(formData.dias_cambio_password),
        // Enviar solo módulos con al menos una acción activa (estructura granular completa)
        modulosPermitidos: (formData.modulosPermitidos as ModulePermission[]).filter(
          p => p.ver || p.crear || p.editar || p.eliminar
        ),
        ...(requireAdminKey ? { adminKey: formData.adminKey.trim() } : {})
      };

      if (isEdit) {
        await updateUser(user.id_usuario, payload);
        onSuccess();
      } else {
        const res = await createUser({
          ...payload,
          contrasena: cleanContrasena
        });
        onSuccess({
          nombre: `${cleanNombres} ${cleanApellidos}`,
          usuario: res.usuario,
          correo: finalCorreo
        });
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message || "";
      const isDuplicateError = 
        err.response?.status === 409 || 
        err.response?.data?.code === "23505" || 
        serverMsg.toLowerCase().includes("unique") || 
        serverMsg.toLowerCase().includes("duplicad") || 
        serverMsg.toLowerCase().includes("ya existe");

      if (isDuplicateError) {
        setError("Error: El usuario o correo especificado ya existe en el sistema.");
      } else {
        setError(serverMsg || "Ocurrió un error al guardar el usuario.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (fieldName: keyof FormErrors, extraClasses: string = "") => {
    const isInvalid = touched[fieldName] && !!errors[fieldName];
    const base = "mt-1 block w-full rounded-lg shadow-sm sm:text-sm p-2.5 border text-gray-900 transition-colors focus:outline-none";
    if (isInvalid) {
      return `${base} border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 ${extraClasses}`;
    }
    return `${base} border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${extraClasses}`;
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 overflow-y-auto custom-scrollbar-light"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto relative custom-scrollbar-light border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <p className="text-xs text-gray-500">Paso {activeStep} de 3 — Configuración de cuenta</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Indicador de Pasos / Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            type="button"
            onClick={() => handleStepClick(1)}
            className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all ${
              activeStep === 1
                ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            1. Datos
          </button>
          <button
            type="button"
            onClick={() => handleStepClick(2)}
            className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all ${
              activeStep === 2
                ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            2. Seguridad
          </button>
          <button
            type="button"
            onClick={() => handleStepClick(3)}
            className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all ${
              activeStep === 3
                ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            3. Permisos
          </button>
        </div>

        {error && <div className="mb-4 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PASO 1: DATOS PERSONALES Y CUENTA */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleChange}
                  onBlur={() => handleBlur("nombres")}
                  placeholder="Ej. Ashlly Saraí María"
                  className={getInputClass("nombres")}
                />
                {touched.nombres && errors.nombres && (
                  <p className="text-xs text-red-500 mt-1">{errors.nombres}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange}
                  onBlur={() => handleBlur("apellidos")}
                  placeholder="Ej. Pineda Belloso"
                  className={getInputClass("apellidos")}
                />
                {touched.apellidos && errors.apellidos && (
                  <p className="text-xs text-red-500 mt-1">{errors.apellidos}</p>
                )}
              </div>

              {isEdit ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usuario</label>
                  <input
                    disabled
                    type="text"
                    name="usuario"
                    value={formData.usuario}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm p-2.5 border disabled:bg-gray-100 text-gray-900"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usuario Generado</label>
                  <input
                    disabled
                    type="text"
                    value={formData.correo.trim() || "Se generará automáticamente"}
                    className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm sm:text-sm p-2.5 border disabled:bg-gray-100 ${
                      formData.nombres.trim() && formData.apellidos.trim() ? "text-gray-900 font-medium" : "text-gray-500 italic"
                    }`}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo Electrónico (Sistema) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm">
                  <input
                    type="text"
                    name="correo"
                    value={formData.correo}
                    onChange={handleChange}
                    onBlur={() => handleBlur("correo")}
                    placeholder="apineda"
                    className={`block w-full min-w-0 flex-1 rounded-none rounded-l-lg border sm:text-sm p-2.5 text-gray-900 outline-none transition-colors ${
                      touched.correo && errors.correo
                        ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  <span className={`inline-flex items-center rounded-r-lg border border-l-0 px-3 text-sm font-medium select-none ${
                    touched.correo && errors.correo
                      ? "border-red-500 bg-red-100/50 text-red-700"
                      : "border-gray-300 bg-gray-50 text-gray-500"
                  }`}>
                    @myvektor.com
                  </span>
                </div>
                {touched.correo && errors.correo ? (
                  <p className="text-xs text-red-500 mt-1">{errors.correo}</p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-1">Concatenación automática: {formData.correo.trim() ? `${formData.correo.trim()}@myvektor.com` : 'usuario@myvektor.com'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo de Recuperación (@gmail.com) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="correo_recuperacion"
                  placeholder="usuario@gmail.com"
                  value={formData.correo_recuperacion}
                  onChange={handleChange}
                  onBlur={() => handleBlur("correo_recuperacion")}
                  className={getInputClass("correo_recuperacion")}
                />
                {touched.correo_recuperacion && errors.correo_recuperacion ? (
                  <p className="text-xs text-red-500 mt-1">{errors.correo_recuperacion}</p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-1">Correo personal @gmail.com para recibir solicitudes de cambio de clave.</p>
                )}
              </div>

              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contraseña inicial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="contrasena"
                    value={formData.contrasena}
                    onChange={handleChange}
                    onBlur={() => handleBlur("contrasena")}
                    placeholder="Mínimo 8 car., 1 letra, 1 número y 1 símbolo (!@#$%^&*)"
                    className={getInputClass("contrasena")}
                  />
                  {touched.contrasena && errors.contrasena && (
                    <p className="text-xs text-red-500 mt-1">{errors.contrasena}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rol principal <span className="text-red-500">*</span>
                </label>
                <select
                  name="id_rol"
                  value={formData.id_rol}
                  onChange={handleChange}
                  onBlur={() => handleBlur("id_rol")}
                  className={getInputClass("id_rol")}
                >
                  <option value={0} disabled>Seleccionar rol</option>
                  {roles.map(r => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                  ))}
                </select>
                {touched.id_rol && errors.id_rol && (
                  <p className="text-xs text-red-500 mt-1">{errors.id_rol}</p>
                )}
              </div>

              {isEdit && (
                <div className="flex items-center pt-2">
                  <input id="activo" name="activo" type="checkbox" checked={formData.activo} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                  <label htmlFor="activo" className="ml-2 block text-sm font-medium text-gray-900">
                    Usuario Activo en el sistema
                  </label>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: SEGURIDAD Y POLÍTICAS */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="permitir_cambio_password"
                      name="permitir_cambio_password"
                      type="checkbox"
                      checked={formData.permitir_cambio_password}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="permitir_cambio_password" className="font-semibold text-gray-900 cursor-pointer">
                      Permitir cambio de contraseña
                    </label>
                    <p className="text-xs text-gray-500">
                      Aplica para administradores y cualquier rol. Habilita que este usuario pueda solicitar recuperación o cambiar contraseña.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Límite de intentos fallidos</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    name="max_intentos_fallidos"
                    value={formData.max_intentos_fallidos}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border text-gray-900 bg-white"
                  />
                  <span className="text-[11px] text-gray-500">Intentos antes de bloqueo</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Frecuencia de cambio (Días)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    name="dias_cambio_password"
                    value={formData.dias_cambio_password}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border text-gray-900 bg-white"
                  />
                  <span className="text-[11px] text-gray-500">Días para renovar clave</span>
                </div>
              </div>

              {requireAdminKey && (
                <div className="rounded-xl p-3.5 bg-red-50 border border-red-200 mt-4">
                  <label className="block text-sm font-semibold text-red-700">Clave de Protección Administrativa</label>
                  <p className="text-xs text-red-500 mb-2">Este es uno de los administradores principales. Ingrese la clave especial para guardar cambios.</p>
                  <input 
                    required 
                    type="password" 
                    name="adminKey" 
                    value={formData.adminKey} 
                    onChange={handleChange} 
                    placeholder="Ingrese la clave de acceso"
                    className="block w-full rounded-lg border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2.5 border text-gray-900 bg-white" 
                  />
                </div>
              )}
            </div>
          )}

          {/* PASO 3: PERMISOS GRANULARES DE MÓDULOS */}
          {activeStep === 3 && (() => {
            // Mapeo de módulos por rol para mostrar badge "Rol Base"
            const ROL_MODULES: Record<string, string[]> = {
              'Superadministrador': ALL_MODULES,
              'Gerente':            ALL_MODULES,
              'Jefe de Operaciones': ['Dashboard', 'Operaciones', 'Viajes'],
              'Encargado de Bodega': ['Dashboard', 'Inventario'],
              'Recepcionista':       ['Dashboard', 'Ventas'],
              'Mecanico':            ['Dashboard', 'Mecánica'],
              'Piloto':              ['Dashboard', 'Viajes'],
              'Contador':            ['Dashboard', 'Finanzas'],
            };
            const roleName = roles.find(r => r.id_rol === formData.id_rol)?.nombre || '';
            const rolBaseModules = ROL_MODULES[roleName] || [];

            return (
              <div className="space-y-3 animate-fade-in">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">Permisos por módulo</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Configura qué puede hacer este usuario en cada módulo del sistema.
                    </p>
                  </div>
                  <div className="space-x-2 text-xs shrink-0 ml-3">
                    <button
                      type="button"
                      onClick={() => handleSelectAllModules(true)}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Activar todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllModules(false)}
                      className="text-gray-500 font-medium hover:underline"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[370px] overflow-y-auto pr-0.5">
                  {ALL_MODULES.map(modName => {
                    const perm = (formData.modulosPermitidos as ModulePermission[]).find(
                      p => p.modulo === modName
                    );
                    if (!perm) return null;
                    return (
                      <PermissionAccordion
                        key={modName}
                        permission={perm}
                        isRolBase={rolBaseModules.includes(modName)}
                        onChange={handlePermissionChange}
                      />
                    );
                  })}
                </div>

                <p className="text-[11px] text-gray-400 italic pt-0.5">
                  Los módulos <span className="text-purple-600 font-semibold">Rol Base</span> corresponden
                  al paquete estándar del rol asignado. Puedes otorgar módulos adicionales libremente.
                </p>
              </div>
            );
          })()}

          {/* ACCIONES Y BOTONES DE NAVEGACIÓN */}
          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => (prev - 1) as any)}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                &larr; Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            <div className="flex gap-2">
              {activeStep < 3 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="py-2 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Siguiente &rarr;
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-5 border border-transparent shadow-md text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default UserForm;
