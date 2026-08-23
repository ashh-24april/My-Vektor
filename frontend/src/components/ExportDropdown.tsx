import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from "lucide-react";
import { exportToExcel, exportToCSV, type ExportColumn } from "../utils/exportUtils";
import { useAuthStore } from "../store/authStore";

interface ExportDropdownProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  sheetName?: string;
  modulo: string;
  disabled?: boolean;
  buttonText?: string;
}

function ExportDropdown<T>({
  data,
  columns,
  filename,
  sheetName = "Reporte",
  modulo,
  disabled = false,
  buttonText = "Exportar"
}: ExportDropdownProps<T>) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<"XLSX" | "CSV" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const meta = {
    modulo,
    usuarioNombre: user?.nombre || user?.usuario || "Usuario",
    usuarioCorreo: user?.correo || ""
  };

  const handleExportXLSX = async () => {
    setExporting("XLSX");
    try {
      await exportToExcel(filename, sheetName, data, columns, meta);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting("CSV");
    try {
      await exportToCSV(filename, data, columns, meta);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled || data.length === 0 || exporting !== null}
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : (
          <Download className="w-3.5 h-3.5 text-gray-500" />
        )}
        <span>{buttonText}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white shadow-xl border border-gray-100 py-1.5 z-40 animate-fade-in text-xs font-medium">
          <div className="px-3.5 py-1.5 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400">
            Exportar {data.length} registros
          </div>

          <button
            type="button"
            onClick={handleExportXLSX}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Libro de Excel</p>
              <p className="text-[10px] text-gray-400">Formato .xlsx con diseño</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Archivo CSV</p>
              <p className="text-[10px] text-gray-400">Texto delimitado (.csv)</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportDropdown;
