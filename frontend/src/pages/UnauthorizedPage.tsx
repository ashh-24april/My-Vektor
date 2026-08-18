import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="w-full flex-1 flex items-center justify-center py-12 px-4 bg-[#F8FAFC] min-h-[400px]">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 bg-blue-50 text-[#041954] rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
          <ShieldAlert className="w-8 h-8 text-[#041954]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Acceso No Autorizado
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed font-normal">
            No tienes los permisos ni el rol necesario para acceder a este módulo. Si consideras que se trata de un error, consulta con el administrador del sistema.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#041954] hover:bg-[#092C92] active:bg-[#020e30] text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
