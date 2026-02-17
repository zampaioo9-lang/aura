import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useUpload } from '../hooks/useUpload';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Foto de perfil' }: ImageUploadProps) {
  const { uploadImage, uploading, progress, error } = useUpload();
  const [preview, setPreview] = useState<string>(value || '');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const result = await uploadImage(file);
    if (result) {
      setPreview(result.url);
      onChange(result.url);
    } else {
      setPreview(value || '');
    }
    URL.revokeObjectURL(localUrl);
  }, [uploadImage, onChange, value]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const remove = () => {
    setPreview('');
    onChange('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>

      {preview ? (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 group">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
              <span className="text-white text-xs mt-1">{progress}%</span>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={remove}
              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Eliminar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-32 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-500 mt-1">{progress}%</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-400 mt-1">Subir foto</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-slate-400 mt-1">JPG, PNG o WebP. Max 5MB.</p>
    </div>
  );
}
