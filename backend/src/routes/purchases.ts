import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { checkoutSchema } from '../utils/validation';
import { createOfferingCheckoutSession } from '../services/stripeService';
import { createPayPalOrder } from '../services/paypalService';
import { PENDING_CHECKOUT_PREFIX } from '../services/purchaseService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

// POST /api/purchases/checkout -- sin auth, es para invitados.
//
// Limitacion conocida y aceptada: esta ruta no tiene proteccion de idempotencia contra un
// doble submit (doble click, o dos pestanas) -- cada llamada siempre crea una sesion/orden
// nueva en el proveedor de pago, lo que en teoria podria generar dos sesiones de Stripe o
// dos ordenes de PayPal (y, para PayPal, dos filas de PendingOfferingCheckout) para una sola
// intencion de compra. El boton "Comprar" de la pagina publica del Offering (Tarea 10) ya se
// deshabilita mientras la peticion esta en curso, lo que cubre el caso comun de doble click
// accidental; el caso mas raro de dos pestanas requeriria infraestructura real de
// idempotencia (header Idempotency-Key / PayPal-Request-Id) que todavia no existe en este
// codebase, y construirla ahora seria prematuro para una funcionalidad sin trafico real.
router.post('/checkout', async (req, res, next) => {
  try {
    const data = checkoutSchema.parse(req.body);

    const offering = await prisma.offering.findUnique({ where: { id: data.offeringId } });
    if (!offering || offering.status !== 'PUBLISHED') {
      throw new AppError(404, 'Oferta no encontrada');
    }

    if (data.currency === 'MXN' && !offering.priceMXN) {
      throw new AppError(400, 'Esta oferta no tiene precio en MXN');
    }

    if (offering.type === 'LIVE_WORKSHOP' && offering.scheduledAt && offering.scheduledAt < new Date()) {
      throw new AppError(400, 'Este taller ya se llevo a cabo');
    }

    if (offering.capacity) {
      const purchaseCount = await prisma.purchase.count({ where: { offeringId: offering.id } });
      if (purchaseCount >= offering.capacity) {
        throw new AppError(400, 'Este taller ya alcanzo su cupo maximo');
      }
    }

    // .toNumber() explicito -- son instancias de Decimal (decimal.js), no numbers nativos.
    const priceDecimal = data.currency === 'MXN' ? offering.priceMXN! : offering.priceUSD;
    const priceAmount = priceDecimal.toNumber();
    const buyerPhone = data.buyerPhone || '';

    if (data.provider === 'stripe') {
      const redirectUrl = await createOfferingCheckoutSession({
        offeringId: offering.id,
        offeringTitle: offering.title,
        priceAmount,
        currency: data.currency,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone,
      });
      res.json({ redirectUrl });
      return;
    }

    // provider === 'paypal': PayPal no soporta metadata libre (limite de 127 caracteres
    // en custom_id), asi que los datos del comprador se guardan en PendingOfferingCheckout
    // y solo se pasa su id (con un prefijo reservado) como custom_id.
    const pending = await prisma.pendingOfferingCheckout.create({
      data: {
        offeringId: offering.id,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: buyerPhone || null,
        currency: data.currency,
      },
    });

    const { approvalUrl } = await createPayPalOrder(
      priceAmount.toFixed(2),
      `${env.FRONTEND_URL}/oferta/${offering.id}/paypal-retorno`,
      `${env.FRONTEND_URL}/oferta/${offering.id}/cancelado`,
      data.currency,
      `${PENDING_CHECKOUT_PREFIX}${pending.id}`,
      offering.title,
    );
    res.json({ redirectUrl: approvalUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
