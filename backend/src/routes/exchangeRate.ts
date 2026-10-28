import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Cache en memoria: el tipo de cambio no necesita consultarse en cada peticion -- evita
// pegarle a la API externa por cada tecla que el profesional escribe en el precio MXN
// (el frontend consulta este endpoint, no la API externa directo). 6 horas es suficiente
// margen para un precio de oferta, que no requiere precision de mercado al segundo.
let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

router.get('/usd-mxn', async (_req, res, next) => {
  try {
    if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
      return res.json({ rate: cachedRate.rate });
    }

    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new AppError(502, 'No se pudo obtener el tipo de cambio');

    const data = (await response.json()) as { rates?: Record<string, number> };
    const rate = data?.rates?.MXN;
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throw new AppError(502, 'Tipo de cambio invalido');
    }

    cachedRate = { rate, fetchedAt: Date.now() };
    res.json({ rate });
  } catch (err) {
    // Si hay un valor en cache (aunque ya este vencido), es mejor devolver ese que fallar
    // del todo -- un tipo de cambio de hace mas de 6 horas sigue siendo mejor estimado que
    // ninguno, y el campo USD en el frontend siempre queda editable a mano de todas formas.
    if (cachedRate) {
      return res.json({ rate: cachedRate.rate });
    }
    next(err);
  }
});

export default router;
