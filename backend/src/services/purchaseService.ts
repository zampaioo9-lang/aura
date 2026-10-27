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
