import { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, AlertCircle } from 'lucide-react';
import { useAudioTranscription } from '../../hooks/useAudioTranscription';

interface Props {
  clientId: string;
  onTranscriptReady: (text: string) => void;
  onBusyChange?: (busy: boolean) => void;
  isDark: boolean;
}

export default function AudioUploadBlock({ clientId, onTranscriptReady, onBusyChange, isDark }: Props) {
  const { status, transcript, error, startTranscription, reset } = useAudioTranscription(clientId);
  const [consentChecked, setConsentChecked] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deliveredRef = useRef(false);

  useEffect(() => {
    if (status === 'completed' && !deliveredRef.current) {
      deliveredRef.current = true;
      onTranscriptReady(transcript);
    }
    if (status === 'idle') deliveredRef.current = false;
  }, [status, transcript, onTranscriptReady]);

  useEffect(() => {
    onBusyChange?.(status === 'uploading' || status === 'processing');
  }, [status, onBusyChange]);

  const textColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';
  const boxBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    setConsentChecked(false);
  };

  const handleConfirm = () => {
    if (!pendingFile) return;
    startTranscription(pendingFile);
    setPendingFile(null);
  };

  const handleRetry = () => {
    reset();
    setPendingFile(null);
    setConsentChecked(false);
  };

  if (status === 'uploading' || status === 'processing') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: `1px dashed ${boxBorder}`, borderRadius: 10, marginBottom: 10 }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: textColor }} />
        <span style={{ fontSize: 12.5, color: textColor }}>
          Transcribiendo tu audio… puede tardar unos minutos
        </span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', border: '1px dashed rgba(239,68,68,0.4)', borderRadius: 10, marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#ef4444' }}>
          <AlertCircle size={15} />
          {error ?? 'No se pudo transcribir el audio'}
        </span>
        <button onClick={handleRetry} style={{ fontSize: 12, fontWeight: 600, color: textColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
      />
      <button
        className="btn-lift"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px 18px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
          color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 3px 12px rgba(124,58,237,0.35)',
        }}
      >
        <Mic size={16} /> Subir audio de la sesión
      </button>
      <p style={{ fontSize: 11, color: textColor, opacity: 0.75, margin: '6px 0 0', textAlign: 'center' }}>
        Hasta 1 hora de audio · el audio nunca se almacena
      </p>

      {pendingFile && (
        <div style={{ marginTop: 8, padding: '10px 12px', border: `1px dashed ${boxBorder}`, borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: textColor, marginBottom: 8 }}>{pendingFile.name}</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: textColor, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={e => setConsentChecked(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            Confirmo que el paciente dio su consentimiento para esta grabación
          </label>
          <button
            onClick={handleConfirm}
            disabled={!consentChecked}
            style={{
              marginTop: 8, padding: '6px 14px', borderRadius: 8, border: 'none',
              background: consentChecked ? '#7c3aed' : 'rgba(124,58,237,0.3)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: consentChecked ? 'pointer' : 'not-allowed',
            }}
          >
            Transcribir
          </button>
        </div>
      )}
    </div>
  );
}
