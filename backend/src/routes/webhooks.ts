import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();
const resend = new Resend(env.RESEND_API_KEY);

router.post('/resend', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    const payload = rawBody ? rawBody.toString() : JSON.stringify(req.body);

    let event: { type: string; data?: { email_id?: string } };

    if (env.RESEND_WEBHOOK_SECRET) {
      try {
        event = resend.webhooks.verify({
          payload,
          headers: {
            id:        req.headers['svix-id'] as string,
            timestamp: req.headers['svix-timestamp'] as string,
            signature: req.headers['svix-signature'] as string,
          },
          webhookSecret: env.RESEND_WEBHOOK_SECRET,
        }) as any;
      } catch {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      event = req.body;
    }

    if (event.type === 'email.opened' && event.data?.email_id) {
      const emailId = event.data.email_id;
      await prisma.$executeRaw`
        UPDATE "AnnouncementLog"
        SET recipients = (
          SELECT jsonb_agg(
            CASE WHEN elem->>'emailId' = ${emailId}
              THEN elem || '{"opened": true}'::jsonb
              ELSE elem
            END
          )
          FROM jsonb_array_elements(recipients) elem
        )
        WHERE recipients @> ${JSON.stringify([{ emailId }])}::jsonb
      `;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;
