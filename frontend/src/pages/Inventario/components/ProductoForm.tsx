import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Save,
  Loader2,
  Package,
  Sparkles,
  AlertTriangle,
  FileText,
  Calculator,
  ShieldAlert,
  ArrowRight,
  Tag
} from "lucide-react";
import {
  createProducto,
  updateProducto,
  getCategorias,
  getProveedores,
  getSiguienteCodigoSKU,
  type Producto,
  type Categoria,
  type Proveedor,
} from "../../../api/inventario";
import ProductoImageUploader from "./ProductoImageUploader";

interface ProductoFormProps {
  producto: Producto | null;
  onClose: () => void;
  onSuccess: (p: Producto) => void;
  canEdit?: boolean;
}

const UNIDADES = ["Unidad", "Caja", "Litro", "Galón", "Kg", "Gramo", "Metro", "Par", "Juego", "Rollo"];
const ROTACIONES = [
  { value: "Alta", label: "Alta Rotación", desc: "Filtros, aceites, frenos frecuentes" },
  { value: "Media", label: "Media Rotación", desc: "Correas, mangueras, bujías" },
  { value: "Baja", label: "Baja Rotación", desc: "Sensores, bombas, componentes mayores" },
];
const ORIGENES = [
  { value: "OEM (Original)", label: "OEM (Original)", desc: "Repuesto de fabricante original" },
  { value: "Genérico", label: "Genérico (Aftermarket)", desc: "Repuesto alternativo homologado" },
];

const ProductoForm: React.FC<ProductoFormProps> = ({ producto, onClose, onSuccess, canEdit = true }) => {
  const isEdit = !!producto;

  const [form, setForm] = useState({
    codigo:         producto?.codigo         ?? "",
    descripcion:    producto?.descripcion    ?? "",
    id_categoria:   producto?.id_categoria   ?? 0,
    id_proveedor:   producto?.id_proveedor   ?? null as number | null,
    numero_factura: producto?.numero_factura ?? "",
    rotacion:       producto?.rotacion       ?? "Media",
    origen:         producto?.origen         ?? "Genérico",
    ubicacion:      producto?.ubicacion      ?? "",
    unidad_medida:  producto?.unidad_medida  ?? "Unidad",
    stock:          producto?.stock !== undefined ? String(producto.stock) : "0",
    stock_minimo:   producto?.stock_minimo !== undefined ? String(producto.stock_minimo) : "0",
    precio_compra:  producto?.precio_compra !== undefined ? String(producto.precio_compra) : "",
    precio_venta:   producto?.precio_venta !== undefined ? String(producto.precio_venta) : "",
    foto_url:       producto?.foto_url       ?? "",
  });

  const [categorias, setCategorias]         = useState<Categoria[]>([]);
  const [proveedores, setProveedores]       = useState<Proveedor[]>([]);
  const [loading, setLoading]               = useState(false);
  const [generatingSKU, setGeneratingSKU]   = useState(false);
  const [manualCodeEdit, setManualCodeEdit] = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCategorias(), getProveedores()]).then(([cats, provs]) => {
      setCategorias(cats);
      setProveedores(provs);
    });
  }, []);

  // Función para autogenerar SKU según la categoría seleccionada
  const fetchNextSKU = useCallback(async (catId: number) => {
    if (!catId || isEdit) return;
    setGeneratingSKU(true);
    try {
      const res = await getSiguienteCodigoSKU(catId);
      if (res?.siguienteCodigo) {
        setForm(prev => ({ ...prev, codigo: res.siguienteCodigo }));
      }
    } catch {
      // Fallback local si la API fallara
      const cat = categorias.find(c => c.id_categoria === catId);
      if (cat) {
        const raw = cat.nombre
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase();
        const prefix = raw.length >= 3 ? raw.substring(0, 3) : raw.padEnd(3, "X");
        setForm(prev => ({ ...prev, codigo: `${prefix}-100` }));
      }
    } finally {
      setGeneratingSKU(false);
    }
  }, [categorias, isEdit]);

  // Al cambiar categoría en modo creación, generar automáticamente el SKU
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = Number(e.target.value);
    setForm(prev => ({ ...prev, id_categoria: catId }));
    if (catId > 0 && !isEdit && !manualCodeEdit) {
      fetchNextSKU(catId);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "id_proveedor" ? (value === "" ? null : Number(value)) : value,
    }));
  };

  // ─── HELPERS PARA VALIDACIÓN Y CONTROL DE INPUTS NUMÉRICOS ───────────────────
  
  // 1. Bloqueo en onKeyDown de signos negativos ('-'), positivos ('+'), y notación científica ('e', 'E')
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimals = true) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
    if (!allowDecimals && (e.key === "." || e.key === ",")) {
      e.preventDefault();
    }
  };

  // 2. Sanitización en onChange: eliminación de ceros a la izquierda y caracteres inválidos
  const handleNumericChange = (
    fieldName: "stock" | "stock_minimo" | "precio_compra" | "precio_venta",
    rawValue: string,
    allowDecimals = true
  ) => {
    let val = rawValue.replace(/,/g, "."); // Normalizar coma a punto

    if (!allowDecimals) {
      // Solo dígitos enteros positivos
      val = val.replace(/\D/g, "");
      // Si el usuario escribe sobre "0" (ej: "010" -> "10"), remover el cero inicial
      if (val.length > 1 && val.startsWith("0")) {
        val = val.replace(/^0+/, "") || "0";
      }
    } else {
      // Decimales: permitir solo dígitos y un único punto
      val = val.replace(/[^0-9.]/g, "");
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }
      // Remover ceros a la izquierda si no son seguidos por un punto decimal (ej: "05" -> "5", pero "0.5" es válido)
      if (/^0[0-9]/.test(val)) {
        val = val.replace(/^0+/, "");
      }
    }

    setForm(prev => ({
      ...prev,
      [fieldName]: val,
    }));
  };

  // 3. Formateo en onBlur si la caja quedó vacía
  const handleNumericBlur = (
    fieldName: "stock" | "stock_minimo" | "precio_compra" | "precio_venta",
    defaultValue = "0"
  ) => {
    setForm(prev => {
      let val = prev[fieldName];
      if (val === "" || val === undefined) {
        return { ...prev, [fieldName]: defaultValue };
      }
      if (typeof val === "string" && val.endsWith(".")) {
        val = val.slice(0, -1);
      }
      return { ...prev, [fieldName]: val };
    });
  };

  // ─── ALGORITMO Y MATRIZ DE FIJACIÓN DE PRECIOS ──────────────────────────────
  const precioCompraNum = parseFloat(form.precio_compra) || 0;
  const precioVentaNum  = parseFloat(form.precio_venta) || 0;

  // 1. Piso mínimo obligatorio de seguridad: Costo + 10%
  const pisoMinimoSeguridad = useMemo(() => {
    return Math.round(precioCompraNum * 1.10 * 100) / 100;
  }, [precioCompraNum]);

  // 2. Cálculo Inteligente según Matriz (Costo Base + Flete 5% y Margen por Rotación/Origen)
  const calculoPrecios = useMemo(() => {
    const costoBase = Math.round(precioCompraNum * 1.05 * 100) / 100; // +5% flete y logística oculta

    let margenBase = 0.25; // default 25%
    const rot = form.rotacion;
    const orig = form.origen;

    if (rot === "Alta") {
      margenBase = orig.includes("OEM") ? 0.25 : 0.15; // 15% Genérico / 25% OEM
    } else if (rot === "Media") {
      margenBase = orig.includes("OEM") ? 0.35 : 0.25; // 25% Genérico / 35% OEM
    } else if (rot === "Baja") {
      margenBase = orig.includes("OEM") ? 0.60 : 0.40; // 40% Genérico / 60% OEM
    }

    const precioSugerido = Math.round(costoBase * (1 + margenBase) * 100) / 100;
    const gananciaNetaEstimada = Math.round((precioSugerido - precioCompraNum) * 100) / 100;
    const porcentajeMargenTotal = Math.round(((precioSugerido - precioCompraNum) / (precioCompraNum || 1)) * 100);

    return {
      costoBase,
      margenPorcentaje: Math.round(margenBase * 100),
      precioSugerido,
      gananciaNetaEstimada,
      porcentajeMargenTotal,
    };
  }, [precioCompraNum, form.rotacion, form.origen]);

  // Validador de violación del piso mínimo de precio de venta
  const esPrecioVentaInvalido = precioCompraNum > 0 && precioVentaNum > 0 && precioVentaNum < (pisoMinimoSeguridad - 0.009);

  // Aplicar sugerencia inteligente al formulario
  const aplicarPrecioSugerido = () => {
    if (calculoPrecios.precioSugerido > 0) {
      setForm(prev => ({ ...prev, precio_venta: String(calculoPrecios.precioSugerido) }));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim()) return setError("El código SKU es requerido.");
    if (!form.descripcion.trim()) return setError("La descripción es requerida.");
    if (!form.id_categoria) return setError("La categoría es requerida.");

    // Validación estricta de impedimento de pérdidas
    if (precioCompraNum > 0 && precioVentaNum < (pisoMinimoSeguridad - 0.009)) {
      return setError(
        `El precio de venta (Q${precioVentaNum.toFixed(2)}) no puede ser inferior al costo más el 10% de margen mínimo de seguridad (Mínimo permitido: Q${pisoMinimoSeguridad.toFixed(2)}).`
      );
    }

    setLoading(true);
    setError(null);
    try {
      const stockNum = Math.max(0, parseInt(form.stock, 10) || 0);
      const stockMinNum = Math.max(0, parseInt(form.stock_minimo, 10) || 0);

      const payload = {
        ...form,
        codigo:         form.codigo.trim().toUpperCase(),
        descripcion:    form.descripcion.trim(),
        numero_factura: form.numero_factura?.trim() || null,
        rotacion:       form.rotacion || "Media",
        origen:         form.origen || "Genérico",
        stock:          stockNum,
        stock_minimo:   stockMinNum,
        precio_compra:  precioCompraNum,
        precio_venta:   precioVentaNum,
        foto_url:       form.foto_url || null,
        id_proveedor:   form.id_proveedor || null,
      };
      const result = isEdit
        ? await updateProducto(producto!.id_producto, payload)
        : await createProducto(payload);
      onSuccess(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar producto.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 font-medium
    focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
    placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#041954]/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#041954]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Editar Producto" : "Nuevo Producto"}</h2>
              <p className="text-xs text-gray-500">{isEdit ? `Código: ${producto!.codigo}` : "Completa la ficha técnica y fijación de precios"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* Imagen + Categoría + Código Autogenerado */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <ProductoImageUploader
              currentUrl={form.foto_url || null}
              onUpload={(url) => setForm(prev => ({ ...prev, foto_url: url }))}
              disabled={!canEdit}
            />
            <div className="flex-1 w-full space-y-3">
              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría *</label>
                <select
                  name="id_categoria"
                  value={form.id_categoria}
                  onChange={handleCategoriaChange}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  <option value={0}>Selecciona una categoría</option>
                  {categorias.map(c => (
                    <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Código SKU (Autogenerado según categoría y secuencia desde 100) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Código SKU *</span>
                  </label>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={() => setManualCodeEdit(!manualCodeEdit)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {manualCodeEdit ? "Bloquear autogenerado" : "Editar manualmente"}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    name="codigo"
                    value={form.codigo}
                    onChange={handleChange}
                    disabled={(!canEdit || (!manualCodeEdit && !isEdit)) && !manualCodeEdit}
                    placeholder={generatingSKU ? "Generando SKU..." : "Ej. FIL-100"}
                    className={`${inputCls} uppercase font-mono font-bold ${!manualCodeEdit && !isEdit ? "bg-blue-50/50 text-blue-900 border-blue-200" : ""}`}
                  />
                  {generatingSKU && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[10px]">Secuencia...</span>
                    </div>
                  )}
                  {!isEdit && form.codigo && !generatingSKU && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      SKU Auto
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Descripción Completa */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción / Nombre del Repuesto *</label>
            <input
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              disabled={!canEdit}
              placeholder="Ej. Filtro de Aceite Primario Heavy Duty para Cabezal Freightliner"
              className={inputCls}
            />
          </div>

          {/* Sección de Compra y Proveedor: Proveedor + Número de Factura */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Datos de Compra y Comprobante</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Proveedor Asignado</label>
                <select
                  name="id_proveedor"
                  value={form.id_proveedor ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  <option value="">Sin proveedor asignado</option>
                  {proveedores.map(p => (
                    <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Número de Factura de Compra</span>
                  <span className="text-[10px] font-normal text-gray-400">Auditoría / Kardex</span>
                </label>
                <input
                  name="numero_factura"
                  value={form.numero_factura || ""}
                  onChange={handleChange}
                  disabled={!canEdit}
                  placeholder="Ej. FAC-2026-9812"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Unidad de Medida + Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad de Medida</label>
              <select
                name="unidad_medida"
                value={form.unidad_medida}
                onChange={handleChange}
                disabled={!canEdit}
                className={inputCls}
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ubicación en Bodega</label>
              <input
                name="ubicacion"
                value={form.ubicacion}
                onChange={handleChange}
                disabled={!canEdit}
                placeholder="Ej. Estante B-4 / Gaveta 12"
                className={inputCls}
              />
            </div>
          </div>

          {/* Stock Inicial / Mínimo con Saneamiento Numérico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isEdit ? "Stock Actual" : "Stock Inicial"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                name="stock"
                value={form.stock}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => handleNumericChange("stock", e.target.value, false)}
                onBlur={() => handleNumericBlur("stock", "0")}
                disabled={isEdit || !canEdit}
                placeholder="0"
                className={`${inputCls} ${isEdit ? "bg-gray-50 text-gray-400" : ""}`}
              />
              {isEdit && <p className="text-[11px] text-gray-400 mt-1">Usa la opción "Movimiento" para registrar entradas/salidas.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Mínimo (Alerta de Reabastecimiento)</label>
              <input
                type="text"
                inputMode="numeric"
                name="stock_minimo"
                value={form.stock_minimo}
                onKeyDown={e => handleNumericKeyDown(e, false)}
                onChange={e => handleNumericChange("stock_minimo", e.target.value, false)}
                onBlur={() => handleNumericBlur("stock_minimo", "0")}
                disabled={!canEdit}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          {/* ─── SECCIÓN: MATRIZ DE PRECIOS Y PROTECCIÓN CONTRA PÉRDIDAS ─────────── */}
          <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#041954] uppercase tracking-wider">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Matriz de Precios e Inteligencia de Márgenes</span>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                Piso Mínimo: Costo + 10%
              </span>
            </div>

            {/* Selectores de Rotación y Origen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nivel de Rotación</label>
                <select
                  name="rotacion"
                  value={form.rotacion}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  {ROTACIONES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {ROTACIONES.find(r => r.value === form.rotacion)?.desc}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Origen del Repuesto</label>
                <select
                  name="origen"
                  value={form.origen}
                  onChange={handleChange}
                  disabled={!canEdit}
                  className={inputCls}
                >
                  {ORIGENES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {ORIGENES.find(o => o.value === form.origen)?.desc}
                </p>
              </div>
            </div>

            {/* Campos de Precio de Compra y Precio de Venta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Precio de Compra / Costo (Q) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Q</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="precio_compra"
                    value={form.precio_compra}
                    onKeyDown={e => handleNumericKeyDown(e, true)}
                    onChange={e => handleNumericChange("precio_compra", e.target.value, true)}
                    onBlur={() => handleNumericBlur("precio_compra", "0")}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className={`${inputCls} pl-7 font-semibold`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Precio de Venta Final (Q) *</span>
                  {pisoMinimoSeguridad > 0 && (
                    <span className="text-[10px] font-bold text-gray-500">
                      Mínimo: Q{pisoMinimoSeguridad.toFixed(2)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Q</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="precio_venta"
                    value={form.precio_venta}
                    onKeyDown={e => handleNumericKeyDown(e, true)}
                    onChange={e => handleNumericChange("precio_venta", e.target.value, true)}
                    onBlur={() => handleNumericBlur("precio_venta", "0")}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className={`${inputCls} pl-7 font-bold ${
                      esPrecioVentaInvalido
                        ? "border-red-500 focus:ring-red-500/30 focus:border-red-500 text-red-700 bg-red-50/50"
                        : "text-blue-900"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Tarjeta de Sugerencia Inteligente de Precios */}
            {precioCompraNum > 0 && (
              <div className="p-3.5 bg-white rounded-xl border border-blue-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-950 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Precio Sugerido por Algoritmo:</span>
                    <span className="text-sm font-black text-blue-700">Q{calculoPrecios.precioSugerido.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Costo Base (+5% flete): <strong>Q{calculoPrecios.costoBase.toFixed(2)}</strong> · Margen: <strong>{calculoPrecios.margenPorcentaje}%</strong> (Ganancia: ~Q{calculoPrecios.gananciaNetaEstimada.toFixed(2)})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={aplicarPrecioSugerido}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Aplicar Sugerencia</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Alerta de Error si el precio es inferior al piso mínimo */}
            {esPrecioVentaInvalido && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 animate-shake">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Piso Mínimo de Seguridad Violado</strong>
                  <span>
                    El precio de venta (Q{precioVentaNum.toFixed(2)}) genera pérdida o margen insuficiente. Debe ser igual o mayor al costo más el 10% de margen mínimo de seguridad (<strong>Q{pisoMinimoSeguridad.toFixed(2)}</strong>).
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mensajes de Error Generales */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Acciones del Modal */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={loading || esPrecioVentaInvalido}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#041954] hover:bg-[#092C92] rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Producto"}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProductoForm;
