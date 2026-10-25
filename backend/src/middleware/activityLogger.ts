import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { classifyModule, logActivity } from '../services/activityService';

/**
 * Registra un evento VIEW por cada peticion autenticada, clasificando el
 * modulo por el prefijo de la ruta. Se apoya en que authMiddleware (que
 * corre despues, a nivel de router) muta el mismo objeto req y setea
 * req.userId antes de que la respuesta termine.
 */
export function activityLogger(req: Request, res: Response, next: NextFunction) {
  // Se captura req.path aqui, antes de que la peticion entre a cualquier
  // router anidado. Express reescribe req.url mientras atraviesa routers
  // montados por prefijo, y solo lo restaura al desenrollar la pila via
  // next() — algo que NUNCA ocurre cuando el handler final responde
  // directamente con res.json()/res.send() (el caso normal de esta API).
  // Leer req.path dentro de res.on('finish') devolveria entonces la ruta
  // relativa al router mas interno (p.ej. "/" o "/:id") en vez de la ruta
  // completa ("/api/clients"), y classifyModule nunca haria match.
  const requestPath = req.path;
  res.on('finish', () => {
    const userId = (req as AuthRequest).userId;
    if (!userId) return;
    const module = classifyModule(requestPath);
    if (!module) return;
    logActivity({ userId, module, type: 'VIEW' });
  });
  next();
}
