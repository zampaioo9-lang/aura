import multer from 'multer';
import { AppError } from './errorHandler';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  limits: { fileSize: IMAGE_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, 'Solo se permiten imagenes JPG, PNG o WebP'));
    }
    cb(null, true);
  },
}).single('file');

export const uploadVideo = multer({
  storage,
  limits: { fileSize: VIDEO_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, 'Solo se permiten videos MP4 o MOV'));
    }
    cb(null, true);
  },
}).single('file');
