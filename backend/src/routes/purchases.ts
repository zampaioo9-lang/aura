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

    // Limite conocido y aceptado desde el diseno de esta fase (ver el spec,
    // "Casos especiales y limites conocidos"): este chequeo y la creacion real del
    // Purchase (en purchaseService, al confirmarse el pago) no son atomicos ni
    // transaccionales entre si -- el pago puede tardar minutos en completarse despues de
    // pasar este chequeo, asi que varios compradores casi simultaneos podrian todos pasarlo
    // cuando solo queda 1 lugar. Dado que el pago ya se captura para todos en ese escenario,
    // no hay reembolso automatico; el profesional lo resuelve manualmente. Aceptable para el
    // volumen esperado en esta etapa.
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
      // PayPal limita purchase_units[].description a 127 caracteres, pero offering.title
      // permite hasta 150 (createOfferingSchema) -- truncar para que un titulo largo no
      // tire la orden entera con un 422 silencioso.
      offering.title.slice(0, 127),
    );
    res.json({ redirectUrl: approvalUrl });
  } catch (err) {
    next(err);
  }
});

// POST /api/purchases/paypal/capture -- sin auth. El comprador vuelve aqui desde la pagina
// de aprobacion de PayPal; el frontend llama esto con el orderId de la URL. El webhook de
// /api/subscriptions/paypal/webhook es el respaldo servidor-a-servidor si el comprador
// cierra la pestana antes de que esta llamada termine -- ambos caminos usan
// createPurchaseFromPendingCheckout, que es atomico (delete de PendingOfferingCheckout +
// create de Purchase en una sola transaccion), asi que da igual cual de los dos llegue
// primero: el otro simplemente no encuentra nada que hacer.
// Limite conocido y aceptado: si esta ruta se llama dos veces para el mismo orderId (ej.
// el comprador recarga la pagina de retorno de PayPal), la segunda llamada a
// capturePayPalOrder falla (PayPal rechaza capturar una orden ya capturada) y eso hoy se
// propaga como un 500 generico -- aunque el pago ya se completo exitosamente en la primera
// llamada. Arreglarlo bien requeriria detectar el error especifico de "ya capturada" de
// PayPal y tratarlo como exito, lo cual queda fuera de alcance por ahora.
router.post('/paypal/capture', async (req, res, next) => {
  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) throw new AppError(400, 'orderId is required');

    const { getPayPalOrderCustomId, capturePayPalOrder } = await import('../services/paypalService');

    // Verificar ANTES de capturar (ver fix de revision): capturePayPalOrder es mutable y
    // comparte namespace con el flujo autenticado de Lifetime-PRO -- esta ruta sin auth
    // nunca debe capturar una orden que no sea de un Offering.
    const customId = await getPayPalOrderCustomId(orderId);
    if (!customId || !customId.startsWith(PENDING_CHECKOUT_PREFIX)) {
      throw new AppError(404, 'Orden no encontrada');
    }

    const result = await capturePayPalOrder(orderId);
    if (result.status !== 'COMPLETED') {
      throw new AppError(400, `El pago de PayPal no se completo (status: ${result.status})`);
    }

    const { createPurchaseFromPendingCheckout } = await import('../services/purchaseService');
    await createPurchaseFromPendingCheckout(result.customId, {
      amountPaid: Number(result.amount ?? 0),
      currency: result.currency ?? '',
      providerRef: result.captureId ?? orderId,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
