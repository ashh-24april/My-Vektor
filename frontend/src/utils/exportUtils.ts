import * as XLSX from "xlsx";
import { registrarAuditoriaExportacion } from "../api/notificaciones";

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
  format?: (val: any) => string | number;
}

export interface ExportMeta {
  modulo: string;
  usuarioNombre?: string;
  usuarioCorreo?: string;
}

/**
 * Prepara los datos tabulares extrayendo los valores según las columnas definidas
 */
function prepareData<T>(data: T[], columns: ExportColumn<T>[]) {
  return data.map(row => {
    const rowObj: Record<string, any> = {};
    columns.forEach(col => {
      let val: any;
      if (typeof col.accessor === "function") {
        val = col.accessor(row);
      } else {
        val = row[col.accessor];
      }

      if (col.format) {
        rowObj[col.header] = col.format(val);
      } else if (val === null || val === undefined) {
        rowObj[col.header] = "";
      } else {
        rowObj[col.header] = val;
      }
    });
    return rowObj;
  });
}

/**
 * Exporta a formato Excel (.xlsx) con encabezados de auditoría corporativos
 */
export const exportToExcel = async <T>(
  filename: string,
  sheetName: string,
  data: T[],
  columns: ExportColumn<T>[],
  meta: ExportMeta
) => {
  const preparedData = prepareData(data, columns);
  const nowStr = new Date().toLocaleString("es-GT", {
    dateStyle: "full",
    timeStyle: "medium"
  });

  // Metadatos de auditoría en las primeras filas
  const auditHeader = [
    ["MYVEKTOR ERP - REPORTE OFICIAL DE AUDITORÍA Y CONTROL"],
    [`Módulo: ${meta.modulo}`],
    [`Fecha y Hora de Generación: ${nowStr}`],
    [`Generado por: ${meta.usuarioNombre || "Usuario del Sistema"} (${meta.usuarioCorreo || "N/A"})`],
    [`Total de Registros Exportados: ${data.length}`],
    [] // Fila vacía separadora
  ];

  // Crear la hoja con los metadatos
  const ws = XLSX.utils.aoa_to_sheet(auditHeader);

  // Agregar los datos tabulares a partir de la fila 7
  XLSX.utils.sheet_add_json(ws, preparedData, { origin: "A7" });

  // Configurar ancho de columnas automático
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length + 4, 15)
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  // Descargar archivo
  XLSX.writeFile(wb, `${filename}.xlsx`);

  // Registrar en el log de auditoría del servidor
  try {
    await registrarAuditoriaExportacion(meta.modulo, "XLSX", data.length);
  } catch (e) {
    console.warn("No se pudo registrar la auditoría de exportación:", e);
  }
};

/**
 * Exporta a formato CSV (.csv) con soporte completo UTF-8 BOM
 */
export const exportToCSV = async <T>(
  filename: string,
  data: T[],
  columns: ExportColumn<T>[],
  meta: ExportMeta
) => {
  const preparedData = prepareData(data, columns);
  const nowStr = new Date().toLocaleString("es-GT", {
    dateStyle: "full",
    timeStyle: "medium"
  });

  const lines: string[] = [];

  // Metadatos de auditoría
  lines.push(`"MYVEKTOR ERP - REPORTE OFICIAL DE AUDITORÍA Y CONTROL"`);
  lines.push(`"Módulo: ${meta.modulo}"`);
  lines.push(`"Fecha y Hora de Generación: ${nowStr}"`);
  lines.push(`"Generado por: ${meta.usuarioNombre || "Usuario"} (${meta.usuarioCorreo || ""})"`);
  lines.push(`"Total Registros: ${data.length}"`);
  lines.push(""); // Separador

  // Encabezados
  const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(",");
  lines.push(headers);

  // Filas
  preparedData.forEach(row => {
    const rowValues = columns.map(col => {
      const val = row[col.header] ?? "";
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    lines.push(rowValues.join(","));
  });

  // UTF-8 BOM para apertura correcta en Excel sin problemas de acentos
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Registrar en el log de auditoría
  try {
    await registrarAuditoriaExportacion(meta.modulo, "CSV", data.length);
  } catch (e) {
    console.warn("No se pudo registrar la auditoría de exportación:", e);
  }
};
