import { useState, useRef, useCallback } from 'react';
import { Film, X, Loader2 } from 'lucide-react';
import { useUpload } from '../hooks/useUpload';

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function VideoUpload({ value, onChange }: VideoUploadProps) {
  const { uploadVideo, uploading, progress, error } = useUpload();
  const [preview, setPreview] = useState<string>(value || '');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^video\/(mp4|quicktime)$/)) {
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const result = await uploadVideo(file);
    if (result) {
      setPreview(result.url);
      onChange(result.url);
    } else {
      setPreview(value || '');
    }
    URL.revokeObjectURL(localUrl);
  }, [uploadVideo, onChange, value]);

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
      <label className="block text-sm font-medium text-slate-700 mb-1">Video de presentacion</label>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 group max-w-sm">
          <video src={preview} controls className="w-full h-auto max-h-48" />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
              <div className="w-32 bg-white/20 rounded-full h-1.5 mt-2">
                <div className="bg-white rounded-full h-1.5 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-white text-xs mt-1">{progress}%</span>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={remove}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Eliminar video"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`max-w-sm h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              <div className="w-32 bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-indigo-500 rounded-full h-1.5 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-500 mt-1">{progress}%</span>
            </>
          ) : (
            <>
              <Film className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-400 mt-1">Arrastra o haz click</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-xs text-slate-400 mt-1">MP4 o MOV. Max 50MB.</p>
    </div>
  );
}
