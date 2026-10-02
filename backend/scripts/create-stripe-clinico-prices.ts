import Stripe from 'stripe';
import { env } from '../src/config/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

async function main() {
  const isLive = env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  console.log(`Creando precios contra Stripe ${isLive ? 'LIVE (producción real)' : 'TEST'}`);

  const product = await stripe.products.create({ name: 'Aliax Clínico' });
  console.log('Producto creado:', product.id);

  const priceUsd = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: 6000, // $60.00 USD
    recurring: { interval: 'month' },
    nickname: 'Aliax Clínico Mensual USD',
  });
  console.log('STRIPE_PRICE_CLINICO_MONTHLY =', priceUsd.id);

  const priceMxn = await stripe.prices.create({
    product: product.id,
    currency: 'mxn',
    unit_amount: 90000, // $900.00 MXN
    recurring: { interval: 'month' },
    nickname: 'Aliax Clínico Mensual MXN',
  });
  console.log('STRIPE_PRICE_CLINICO_MONTHLY_MXN =', priceMxn.id);

  console.log('\nCopia estos 2 valores a tu .env (local y producción).');
}

main().catch(err => { console.error(err); process.exit(1); });
