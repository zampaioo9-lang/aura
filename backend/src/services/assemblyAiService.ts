import axios from 'axios';
import { env } from '../config/env';

const BASE_URL = 'https://api.assemblyai.com/v2';

function authHeaders() {
  return { authorization: env.ASSEMBLYAI_API_KEY };
}

export async function uploadAndStartTranscription(buffer: Buffer): Promise<string> {
  const uploadRes = await axios.post(`${BASE_URL}/upload`, buffer, {
    headers: { ...authHeaders(), 'content-type': 'application/octet-stream' },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const audioUrl = uploadRes.data.upload_url as string;

  const transcriptRes = await axios.post(
    `${BASE_URL}/transcript`,
    { audio_url: audioUrl, speaker_labels: true, language_code: 'es' },
    { headers: { ...authHeaders(), 'content-type': 'application/json' } }
  );
  return transcriptRes.data.id as string;
}

export type TranscriptionResult =
  | { status: 'processing' }
  | { status: 'completed'; transcript: string; audioDurationSeconds: number }
  | { status: 'failed'; errorMessage: string };

interface AssemblyAiUtterance { speaker: string; text: string; }

export async function getTranscriptionResult(assemblyAiId: string): Promise<TranscriptionResult> {
  const res = await axios.get(`${BASE_URL}/transcript/${assemblyAiId}`, {
    headers: authHeaders(),
  });
  const data = res.data;

  if (data.status === 'error') {
    return { status: 'failed', errorMessage: data.error ?? 'Error desconocido de transcripción' };
  }

  if (data.status !== 'completed') {
    return { status: 'processing' };
  }

  const utterances = data.utterances as AssemblyAiUtterance[] | null;
  const transcript = utterances?.length
    ? utterances.map(u => `Hablante ${u.speaker}: ${u.text}`).join('\n')
    : ((data.text as string) ?? '');
  const audioDurationSeconds = Math.round((data.audio_duration as number) ?? 0);

  try {
    await axios.delete(`${BASE_URL}/transcript/${assemblyAiId}`, { headers: authHeaders() });
  } catch (err) {
    console.error('[AssemblyAI] No se pudo borrar el transcript tras recuperarlo:', err);
  }

  return { status: 'completed', transcript, audioDurationSeconds };
}
