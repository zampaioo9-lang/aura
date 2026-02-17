import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadImage as uploadImageMiddleware, uploadVideo as uploadVideoMiddleware } from '../middleware/upload';
import { uploadImage, uploadVideo, isCloudinaryConfigured } from '../services/cloudinaryService';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function saveLocal(buffer: Buffer, ext: string): string {
  ensureUploadsDir();
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `http://localhost:${env.PORT}/uploads/${filename}`;
}

// POST /api/upload/image
router.post('/image', authMiddleware, (req, res, next) => {
  uploadImageMiddleware(req, res, (err) => {
    if (err) return next(err instanceof Error ? err : new AppError(400, 'Error al subir imagen'));
    next();
  });
}, async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No se envio ninguna imagen');

    if (!isCloudinaryConfigured()) {
      const ext = req.file.originalname ? path.extname(req.file.originalname) : '.png';
      const url = saveLocal(req.file.buffer, ext);
      return res.json({ url, publicId: `local-${Date.now()}` });
    }

    const result = await uploadImage(req.file.buffer);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/video
router.post('/video', authMiddleware, (req, res, next) => {
  uploadVideoMiddleware(req, res, (err) => {
    if (err) return next(err instanceof Error ? err : new AppError(400, 'Error al subir video'));
    next();
  });
}, async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No se envio ningun video');

    if (!isCloudinaryConfigured()) {
      const ext = req.file.originalname ? path.extname(req.file.originalname) : '.mp4';
      const url = saveLocal(req.file.buffer, ext);
      return res.json({ url, publicId: `local-video-${Date.now()}`, thumbnailUrl: '' });
    }

    const result = await uploadVideo(req.file.buffer);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
