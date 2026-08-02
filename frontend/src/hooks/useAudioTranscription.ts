import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api/client';

export type TranscriptionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // 120 * 5s = 10 minutos

export function useAudioTranscription(clientId: string) {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback((jobId: string) => {
    timeoutRef.current = setTimeout(async () => {
      attemptsRef.current += 1;
      try {
        const { data } = await api.get(`/audio-notes/transcribe/${jobId}`);
        if (data.status === 'completed') {
          setTranscript(data.transcript ?? '');
          setStatus('completed');
          return;
        }
        if (data.status === 'failed') {
          setError(data.errorMessage ?? 'No se pudo transcribir el audio');
          setStatus('failed');
          return;
        }
        if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
          setError('La transcripción está tardando más de lo normal. Intenta de nuevo.');
          setStatus('failed');
          return;
        }
        poll(jobId);
      } catch {
        setError('Se perdió la conexión mientras se transcribía el audio');
        setStatus('failed');
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const startTranscription = useCallback(async (file: File) => {
    setStatus('uploading');
    setError(null);
    setTranscript('');
    attemptsRef.current = 0;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consentConfirmed', 'true');
      const { data } = await api.post(`/audio-notes/transcribe/${clientId}`, formData);
      setStatus('processing');
      poll(data.jobId);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo subir el audio');
      setStatus('failed');
    }
  }, [clientId, poll]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setError(null);
    setTranscript('');
  }, [stopPolling]);

  return { status, transcript, error, startTranscription, reset };
}
