import { useEffect, useRef } from 'react';
import { useCheckUsername } from '../hooks/useProfile';
import { Check, X, Loader2 } from 'lucide-react';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  currentSlug?: string;
  error?: string;
}

export default function UsernameInput({ value, onChange, currentSlug, error }: UsernameInputProps) {
  const { available, checking, check } = useCheckUsername();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (value.length >= 3) {
      debounceRef.current = setTimeout(() => check(value, currentSlug), 400);
    }
    return () => clearTimeout(debounceRef.current);
  }, [value, currentSlug]);

  const handleChange = (raw: string) => {
    const sanitized = raw.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
    onChange(sanitized);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Username <span className="text-red-500">*</span></label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">aura.com/</span>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="mi-nombre"
          className={`w-full pl-[5.5rem] pr-10 py-2 border rounded-lg outline-none transition-colors ${
            error ? 'border-red-300 focus:ring-red-500' :
            available === true ? 'border-green-300 focus:ring-green-500' :
            available === false ? 'border-red-300 focus:ring-red-500' :
            'border-slate-300 focus:ring-indigo-500'
          } focus:ring-2`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {checking && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
          {!checking && available === true && <Check className="h-4 w-4 text-green-500" />}
          {!checking && available === false && <X className="h-4 w-4 text-red-500" />}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!error && !checking && available === false && (
        <p className="text-xs text-red-500 mt-1">Este username ya esta en uso</p>
      )}
      {!error && !checking && available === true && value.length >= 3 && (
        <p className="text-xs text-green-600 mt-1">Disponible</p>
      )}
    </div>
  );
}
