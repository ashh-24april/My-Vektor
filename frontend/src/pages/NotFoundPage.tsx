import React from "react";
import { SearchX, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  return (
    <div className="w-full flex-1 flex items-center justify-center py-12 px-4 bg-[#F8FAFC] min-h-[400px]">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 bg-blue-50 text-[#041954] rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
          <SearchX className="w-8 h-8 text-[#041954]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Aquí no hay nada
          </h2>
          <p className="text-xs font-semibold text-blue-600 tracking-wide uppercase">
            (Excepto polvo digital)
          </p>
          <p className="text-sm text-gray-500 leading-relaxed font-normal pt-1">
            La ruta o página a la que intentas acceder no existe en el sistema o fue movida a otra ubicación.
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

export default NotFoundPage;
