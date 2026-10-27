import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sendEmail, emailTemplates } from './emailService';
import { env } from '../config/env';

const prisma = new PrismaClient();

export const PENDING_CHECKOUT_PREFIX = 'offering_checkout:';

interface CreatePurchaseParams {
  offeringId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  amountPaid: number;
  currency: string;
  providerRef: string;
  provider: 'Stripe' | 'PayPal';
}

// Unico punto donde se crea un Purchase. Idempotente por providerRef: si un webhook se
// reintenta (Stripe reintenta si no recibe 200 a tiempo; PayPal tiene su propio reintento),
// o si el capture del comprador y el webhook de respaldo llegan los dos, esta funcion nunca
// crea un segundo Purchase para el mismo pago.
export async function createPurchaseAndNotify(params: CreatePurchaseParams): Promise<void> {
  const existing = await prisma.purchase.findUnique({ where: { providerRef: params.providerRef } });
  if (existing) return;

  const offering = await prisma.offering.findUnique({ where: { id: params.offeringId } });
  if (!offering) return; // no deberia pasar (el checkout ya valido que existiera), pero no hay nada que hacer si el Offering se borro entre el checkout y el pago.

  const accessToken = crypto.randomUUID();

  try {
    await prisma.purchase.create({
      data: {
        offeringId: params.offeringId,
        buyerName: params.buyerName,
        buyerEmail: params.buyerEmail,
        buyerPhone: params.buyerPhone,
        accessToken,
        paidAt: new Date(),
        amountPaid: params.amountPaid,
        currency: params.currency,
        providerRef: params.providerRef,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') return; // ya fue creado por una llamada concurrente
    throw err;
  }

  const accessUrl = `${env.FRONTEND_URL}/mi-compra/${accessToken}`;

  const buyerTpl = emailTemplates.offeringPurchaseConfirmation({
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    offeringTitle: offering.title,
    accessUrl,
  });
  sendEmail(buyerTpl.to, buyerTpl.subject, buyerTpl.html).then((result) => {
    if (!result.success) {
      console.error(`[purchaseService] Failed to send buyer confirmation email: offeringId=${params.offeringId} providerRef=${params.providerRef} buyerEmail=${params.buyerEmail}`);
    }
  }).catch(() => {});

  const adminTpl = emailTemplates.adminNewOfferingSale({
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    offeringTitle: offering.title,
    provider: params.provider,
    amountPaid: params.amountPaid,
    currency: params.currency,
  });
  sendEmail(adminTpl.to, adminTpl.subject, adminTpl.html).then((result) => {
    if (!result.success) {
      console.error(`[purchaseService] Failed to send admin sale notification email: offeringId=${params.offeringId} providerRef=${params.providerRef} buyerEmail=${params.buyerEmail}`);
    }
  }).catch(() => {});
}

// Usado solo por el flujo de PayPal (ver Tarea 6): resuelve un custom_id con el prefijo
// "offering_checkout:" al registro de PendingOfferingCheckout que guarda los datos del
// comprador, y lo borra (se consume una sola vez). Devuelve null si el custom_id no tiene
// el prefijo esperado (es una orden/suscripcion de plan, no de Offering), o si el registro
// ya no existe (ya fue consumido por el otro camino -- capture del comprador vs. webhook de
// respaldo, lo que llegue primero gana, y el otro simplemente no encuentra nada que hacer).
export async function resolvePendingOfferingCheckout(customId: string | undefined | null) {
  if (!customId || !customId.startsWith(PENDING_CHECKOUT_PREFIX)) return null;

  const id = customId.slice(PENDING_CHECKOUT_PREFIX.length);
  try {
    return await prisma.pendingOfferingCheckout.delete({ where: { id } });
  } catch (err: any) {
    if (err.code === 'P2025') return null; // ya consumido, o nunca existio
    throw err; // cualquier otro error (ej. caida de conexion) no se debe enmascarar como race benigna
  }
}

// Usado solo por el flujo de PayPal (webhook y capture del comprador). A diferencia de
// createPurchaseAndNotify (que Stripe usa directo, sin PendingOfferingCheckout), aqui el
// borrado de la fila pendiente y la creacion del Purchase deben ser atomicos: si se borra
// la fila pendiente y DESPUES falla la creacion del Purchase por cualquier razon que no sea
// "ya existe", el pago queda cobrado por PayPal sin ningun Purchase, accessToken ni correo
// -- y un reintento del webhook ya no encontraria la fila pendiente para resolverlo. Un
// prisma.$transaction evita exactamente eso: si algo falla despues del borrado, el borrado
// tambien se revierte, y un reintento posterior (de PayPal o del comprador) puede completarse
// limpio.
export async function createPurchaseFromPendingCheckout(
  customId: string | undefined | null,
  info: { amountPaid: number; currency: string; providerRef: string },
): Promise<void> {
  if (!customId || !customId.startsWith(PENDING_CHECKOUT_PREFIX)) return;

  const existingPurchase = await prisma.purchase.findUnique({ where: { providerRef: info.providerRef } });
  if (existingPurchase) return;

  const id = customId.slice(PENDING_CHECKOUT_PREFIX.length);
  const accessToken = crypto.randomUUID();

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const pending = await tx.pendingOfferingCheckout.delete({ where: { id } });

      // Se busca el Offering DENTRO de la misma transaccion (no despues, con el prisma de
      // afuera): asi, si esto falla por cualquier razon, el borrado de arriba tambien se
      // revierte en vez de quedar confirmado con un Purchase que nunca se crea y ningun
      // correo que se envia -- el mismo tipo de fuga que esta funcion existe para cerrar.
      const offering = await tx.offering.findUnique({ where: { id: pending.offeringId } });
      if (!offering) return null; // no deberia pasar: el Offering se borro entre el checkout y el pago

      const purchase = await tx.purchase.create({
        data: {
          offeringId: pending.offeringId,
          buyerName: pending.buyerName,
          buyerEmail: pending.buyerEmail,
          buyerPhone: pending.buyerPhone,
          accessToken,
          paidAt: new Date(),
          amountPaid: info.amountPaid,
          currency: info.currency || pending.currency,
          providerRef: info.providerRef,
        },
      });
      return { pending, purchase, offering };
    });
  } catch (err: any) {
    if (err.code === 'P2025' || err.code === 'P2002') return; // ya consumido por la otra ruta (webhook vs. capture del comprador, lo que llegue primero gana)
    throw err;
  }

  if (!result) return;
  const { offering } = result;

  const accessUrl = `${env.FRONTEND_URL}/mi-compra/${accessToken}`;

  const buyerTpl = emailTemplates.offeringPurchaseConfirmation({
    buyerName: result.pending.buyerName,
    buyerEmail: result.pending.buyerEmail,
    offeringTitle: offering.title,
    accessUrl,
  });
  sendEmail(buyerTpl.to, buyerTpl.subject, buyerTpl.html).then((emailResult) => {
    if (!emailResult.success) {
      console.error(`[purchaseService] Failed to send buyer confirmation email: offeringId=${result.pending.offeringId} providerRef=${info.providerRef} buyerEmail=${result.pending.buyerEmail}`);
    }
  }).catch(() => {});

  const adminTpl = emailTemplates.adminNewOfferingSale({
    buyerName: result.pending.buyerName,
    buyerEmail: result.pending.buyerEmail,
    offeringTitle: offering.title,
    provider: 'PayPal',
    amountPaid: info.amountPaid,
    currency: info.currency || result.pending.currency,
  });
  sendEmail(adminTpl.to, adminTpl.subject, adminTpl.html).then((emailResult) => {
    if (!emailResult.success) {
      console.error(`[purchaseService] Failed to send admin sale email: offeringId=${result.pending.offeringId} providerRef=${info.providerRef} buyerEmail=${result.pending.buyerEmail}`);
    }
  }).catch(() => {});
}
