import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function getAudienceId(): string {
  if (!env.RESEND_AUDIENCE_ID) throw new Error('RESEND_AUDIENCE_ID no configurado');
  return env.RESEND_AUDIENCE_ID;
}

// ── Contacts ───────────────────────────────────────────────────────

export async function addContact(email: string, name: string): Promise<void> {
  if (!resend || !env.RESEND_AUDIENCE_ID) return;
  const [firstName, ...rest] = name.trim().split(' ');
  const result = await resend.contacts.create({
    audienceId: getAudienceId(),
    email,
    firstName: firstName || name,
    lastName: rest.join(' ') || undefined,
    unsubscribed: false,
  });
  if (result.error) {
    // Ignore "already exists" errors
    if (!result.error.message?.toLowerCase().includes('already')) {
      console.warn('[Audience] addContact error:', result.error.message);
    }
  }
}

export async function removeContact(email: string): Promise<void> {
  if (!resend) return;
  try {
    // Mark as unsubscribed (Resend requires the contact id, so we update via email)
    await resend.contacts.update({
      audienceId: getAudienceId(),
      email,
      unsubscribed: true,
    });
  } catch (err: any) {
    console.warn('[Audience] removeContact warning:', err?.message);
  }
}

// ── Broadcasts ─────────────────────────────────────────────────────

export interface BroadcastOptions {
  name: string;       // Internal name, not shown to recipients
  subject: string;
  html: string;
}

export async function sendBroadcast(opts: BroadcastOptions): Promise<{ id: string }> {
  if (!resend) throw new Error('Resend no configurado');

  // 1. Create the broadcast
  const created = await resend.broadcasts.create({
    audienceId: getAudienceId(),
    from: env.RESEND_FROM_EMAIL,
    name: opts.name,
    subject: opts.subject,
    html: opts.html,
  });

  if (!created.data?.id) {
    throw new Error('No se pudo crear el broadcast en Resend');
  }

  // 2. Send it
  await resend.broadcasts.send(created.data.id);

  return { id: created.data.id };
}

export async function getBroadcasts(): Promise<any[]> {
  if (!resend) return [];
  try {
    const result = await resend.broadcasts.list();
    return result.data?.data ?? [];
  } catch {
    return [];
  }
}
