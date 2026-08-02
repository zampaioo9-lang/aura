import '../src/config/env';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

// Raw body for webhooks — must come BEFORE express.json()
app.use('/api/subscriptions/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/resend', (req, _res, next) => {
  let data = Buffer.alloc(0);
  req.on('data', (chunk: Buffer) => { data = Buffer.concat([data, chunk]); });
  req.on('end', () => {
    (req as any).rawBody = data;
    (req as any)._body = true; // prevent express.json() from re-reading the stream
    try { req.body = JSON.parse(data.toString() || '{}'); } catch { req.body = {}; }
    next();
  });
});

app.use(express.json());

// Health check first - no dependencies
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Lazy load routes to catch import errors
try {
  const { errorHandler } = require('../src/middleware/errorHandler');
  const authRoutes = require('../src/routes/auth').default;
  const profileRoutes = require('../src/routes/profiles').default;
  const serviceRoutes = require('../src/routes/services').default;
  const bookingRoutes = require('../src/routes/bookings').default;
  const templateRoutes = require('../src/routes/templates').default;
  const uploadRoutes = require('../src/routes/upload').default;
  const availabilityRoutes = require('../src/routes/availability').default;
  const bookingSettingsRoutes = require('../src/routes/booking-settings').default;
  const scheduleBlocksRoutes = require('../src/routes/schedule-blocks').default;
  const serviceAvailabilityRoutes = require('../src/routes/service-availability').default;
  const adminRoutes = require('../src/routes/admin').default;
  const subscriptionRoutes = require('../src/routes/subscriptions').default;
  const clientsRoutes = require('../src/routes/clients').default;
  const clinicalHistoryRoutes = require('../src/routes/clinical-history').default;
  const sessionNotesRoutes = require('../src/routes/session-notes').default;
  const clinicalHistoryCoupleRoutes = require('../src/routes/clinical-history-couple').default;
  const webhookRoutes = require('../src/routes/webhooks').default;
  const aiNotesRoutes = require('../src/routes/ai-notes').default;
  const aiMatchingRoutes = require('../src/routes/ai-matching').default;
  const analyticsRoutes = require('../src/routes/analytics').default;
  const reviewRoutes = require('../src/routes/reviews').default;
  const audioNotesRoutes = require('../src/routes/audio-notes').default;
  const { sendWhatsApp } = require('../src/services/whatsappService');

  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/booking-settings', bookingSettingsRoutes);
  app.use('/api/schedule-blocks', scheduleBlocksRoutes);
  app.use('/api/service-availability', serviceAvailabilityRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/clinical-history', clinicalHistoryRoutes);
  app.use('/api/session-notes', sessionNotesRoutes);
  app.use('/api/clinical-history-couple', clinicalHistoryCoupleRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/ai-notes', aiNotesRoutes);
  app.use('/api/ai-matching', aiMatchingRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/audio-notes', audioNotesRoutes);

  app.get('/api/test/whatsapp', async (req, res) => {
    const to = req.query.to as string;
    if (!to) return res.status(400).json({ error: 'Se requiere parametro ?to=+34...' });
    const result = await sendWhatsApp(to, 'Test de WhatsApp desde Aura!');
    res.json(result);
  });

  app.use(errorHandler);
} catch (err: any) {
  console.error('ROUTE LOAD ERROR:', err.message, err.stack);
  app.use('/api/*', (_req, res) => {
    res.status(500).json({ error: 'Failed to load routes', message: err.message });
  });
}

export default app;
