import React, { useState, useRef } from "react";
import { Camera, X, Loader2, ImageOff } from "lucide-react";
import supabase from "../../../lib/supabase";

interface ProductoImageUploaderProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  disabled?: boolean;
}

const ProductoImageUploader: React.FC<ProductoImageUploaderProps> = ({ currentUrl, onUpload, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe ser menor a 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `producto_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("Productos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("Productos").getPublicUrl(fileName);
      if (!data?.publicUrl) throw new Error("No se pudo obtener la URL pública.");

      onUpload(data.publicUrl);
    } catch (err: any) {
      setError(err.message || "Error al subir imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Preview */}
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`relative w-28 h-28 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-blue-400 hover:bg-blue-50/30"}
          ${currentUrl ? "border-gray-200 bg-white" : "border-gray-300 bg-gray-50"}`}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="Producto" className="w-full h-full object-cover" />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </>
        ) : uploading ? (
          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <ImageOff className="w-7 h-7" />
            <span className="text-[10px] text-center px-1">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          {uploading ? "Subiendo..." : currentUrl ? "Cambiar" : "Subir imagen"}
        </button>
        {currentUrl && !disabled && (
          <button
            type="button"
            onClick={() => onUpload("")}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 text-center max-w-[120px]">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default ProductoImageUploader;
