import Stripe from 'stripe';
import { env } from '../src/config/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const EXISTING_PRO_PRODUCT = 'prod_U3kAx3lk1mvwHE';
const EXISTING_PAYPAL_PRO_PRODUCT = 'PROD-07R70745BP987270U';

async function getPayPalToken(): Promise<string> {
  const creds = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  return (await res.json() as { access_token: string }).access_token;
}

async function createPayPalPlan(token: string, name: string, currency: 'USD' | 'MXN', amount: string): Promise<string> {
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: EXISTING_PAYPAL_PRO_PRODUCT,
      name,
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: amount, currency_code: currency } },
      }],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 2 },
    }),
  });
  if (!res.ok) throw new Error(`PayPal create plan failed: ${res.status} ${await res.text()}`);
  return (await res.json() as { id: string }).id;
}

async function main() {
  console.log(`Stripe: ${env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'TEST'} · PayPal: ${env.PAYPAL_BASE_URL}`);

  const priceUsd = await stripe.prices.create({
    product: EXISTING_PRO_PRODUCT,
    currency: 'usd',
    unit_amount: 1400, // $14.00 USD
    recurring: { interval: 'month' },
    nickname: 'Aliax Pro Mensual USD (corregido)',
  });
  console.log('STRIPE_PRICE_MONTHLY =', priceUsd.id);

  const priceMxn = await stripe.prices.create({
    product: EXISTING_PRO_PRODUCT,
    currency: 'mxn',
    unit_amount: 21000, // $210.00 MXN
    recurring: { interval: 'month' },
    nickname: 'Aliax Pro Mensual MXN (corregido)',
  });
  console.log('STRIPE_PRICE_MONTHLY_MXN =', priceMxn.id);

  const token = await getPayPalToken();
  const paypalPlanId = await createPayPalPlan(token, 'Aliax Pro Mensual USD (corregido)', 'USD', '14.00');
  console.log('PAYPAL_PLAN_MONTHLY =', paypalPlanId);

  console.log('\nCopia estos 3 valores a tu .env (local y producción). PAYPAL_PLAN_PRO_MONTHLY_MXN ya está correcto en $210, no se toca.');
}

main().catch(err => { console.error(err); process.exit(1); });
