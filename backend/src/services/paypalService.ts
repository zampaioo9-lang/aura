import { env } from '../config/env';

interface PayPalSubscription {
  id: string;
  status: string;
  plan_id: string;
  billing_info?: {
    next_billing_time?: string;
  };
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function verifySubscription(subscriptionId: string): Promise<PayPalSubscription> {
  const token = await getAccessToken();
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`PayPal subscription lookup failed: ${res.status}`);
  }

  return res.json() as Promise<PayPalSubscription>;
}

export function resolveInterval(planId: string): 'MONTHLY' | 'YEARLY' {
  if (planId === env.PAYPAL_PLAN_YEARLY) return 'YEARLY';
  return 'MONTHLY';
}

export async function createPayPalOrder(
  amount: string,
  returnUrl: string,
  cancelUrl: string,
): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
          description: 'Aliax Pro Lifetime',
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${res.status}`);
  }

  const data = await res.json() as { id: string; links: Array<{ rel: string; href: string }> };
  const approvalLink = data.links.find(l => l.rel === 'payer-action') ?? data.links.find(l => l.rel === 'approve');
  return { orderId: data.id, approvalUrl: approvalLink?.href ?? '' };
}

export async function capturePayPalOrder(orderId: string): Promise<{ status: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`PayPal capture order failed: ${res.status}`);
  }

  const data = await res.json() as { status: string };
  return { status: data.status };
}
