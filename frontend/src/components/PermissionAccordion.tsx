import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface ModulePermission {
  modulo: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

interface PermissionAccordionProps {
  permission: ModulePermission;
  isRolBase: boolean;
  onChange: (updated: ModulePermission) => void;
}

const ACTIONS: {
  key: keyof Omit<ModulePermission, 'modulo'>;
  label: string;
  desc: string;
}[] = [
  { key: 'ver',      label: 'Visualización', desc: 'Puede ver y consultar registros' },
  { key: 'crear',    label: 'Crear',         desc: 'Puede crear nuevos registros' },
  { key: 'editar',   label: 'Editar',        desc: 'Puede modificar registros existentes' },
  { key: 'eliminar', label: 'Eliminar',      desc: 'Puede eliminar registros del sistema' },
];

const PermissionAccordion: React.FC<PermissionAccordionProps> = ({
  permission,
  isRolBase,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isModuleActive =
    permission.ver || permission.crear || permission.editar || permission.eliminar;

  // Botón cabecera: si está activo desactiva todo; si no, activa solo "ver"
  const handleToggleAll = () => {
    if (isModuleActive) {
      onChange({ ...permission, ver: false, crear: false, editar: false, eliminar: false });
    } else {
      onChange({ ...permission, ver: true, crear: false, editar: false, eliminar: false });
    }
  };

  const handleToggleAction = (key: keyof Omit<ModulePermission, 'modulo'>) => {
    onChange({ ...permission, [key]: !permission[key] });
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isModuleActive
          ? 'border-blue-200 bg-blue-50/30'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Cabecera del acordeón */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        {/* Chevron + nombre del módulo */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span
            className={`text-sm font-semibold truncate ${
              isModuleActive ? 'text-blue-800' : 'text-gray-500'
            }`}
          >
            {permission.modulo}
          </span>
          {isRolBase && (
            <span className="shrink-0 ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
              Rol Base
            </span>
          )}
        </button>

        {/* Botón Activado / Desactivado */}
        <button
          type="button"
          onClick={handleToggleAll}
          className={`shrink-0 ml-2 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            isModuleActive
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
        >
          {isModuleActive ? 'Activado' : 'Desactivado'}
        </button>
      </div>

      {/* Panel desplegable con los 4 toggles de acciones */}
      {isOpen && (
        <div className="border-t border-gray-100 px-3.5 py-3 space-y-3 bg-white/60">
          {ACTIONS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </div>
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => handleToggleAction(key)}
                aria-label={`Toggle ${label}`}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                  permission[key] ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    permission[key] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermissionAccordion;
