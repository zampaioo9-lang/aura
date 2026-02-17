import { useState } from 'react';
import api from '../api/client';

interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const uploadImage = async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir imagen');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadVideo = async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir video');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { uploadImage, uploadVideo, uploading, progress, error };
}
