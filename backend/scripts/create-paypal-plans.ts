import { env } from '../src/config/env';

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function createProduct(token: string, name: string): Promise<string> {
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type: 'SERVICE', category: 'SOFTWARE' }),
  });
  if (!res.ok) throw new Error(`PayPal create product failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string };
  return data.id;
}

async function createPlan(token: string, productId: string, name: string, currency: 'USD' | 'MXN', amount: string): Promise<string> {
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      name,
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: amount, currency_code: currency } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal create plan failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string };
  return data.id;
}

async function main() {
  console.log(`Creando planes contra: ${env.PAYPAL_BASE_URL}`);
  const token = await getAccessToken();

  const proProductId = await createProduct(token, 'Aliax Pro (México)');
  const proMxnPlanId = await createPlan(token, proProductId, 'Aliax Pro Mensual MXN', 'MXN', '210.00');
  console.log('PAYPAL_PLAN_PRO_MONTHLY_MXN =', proMxnPlanId);

  const clinicoProductId = await createProduct(token, 'Aliax Clínico');
  const clinicoUsdPlanId = await createPlan(token, clinicoProductId, 'Aliax Clínico Mensual USD', 'USD', '60.00');
  console.log('PAYPAL_PLAN_CLINICO_MONTHLY =', clinicoUsdPlanId);

  const clinicoMxnPlanId = await createPlan(token, clinicoProductId, 'Aliax Clínico Mensual MXN', 'MXN', '900.00');
  console.log('PAYPAL_PLAN_CLINICO_MONTHLY_MXN =', clinicoMxnPlanId);

  console.log('\nCopia estos 3 valores a tu .env (local y producción).');
}

main().catch(err => { console.error(err); process.exit(1); });
