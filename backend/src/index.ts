import express from 'express';
import path from 'path';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profiles';
import serviceRoutes from './routes/services';
import bookingRoutes from './routes/bookings';
import templateRoutes from './routes/templates';
import uploadRoutes from './routes/upload';
import availabilityRoutes from './routes/availability';
import bookingSettingsRoutes from './routes/booking-settings';
import scheduleBlocksRoutes from './routes/schedule-blocks';
import serviceAvailabilityRoutes from './routes/service-availability';
import adminRoutes from './routes/admin';
import subscriptionRoutes from './routes/subscriptions';
import { startReminderJob } from './jobs/reminderJob';
import { startTrialExpiryJob } from './jobs/trialExpiryJob';
import { sendWhatsAppTemplate, templateComponents } from './services/whatsappService';

const app = express();

app.use(cors());

// Raw body for Stripe webhook — must come BEFORE express.json()
app.use('/api/subscriptions/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Serve local uploads in dev mode
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WhatsApp test endpoint (uses approved template)
app.get('/api/test/whatsapp', async (req, res) => {
  const to = req.query.to as string;
  if (!to) return res.status(400).json({ error: 'Se requiere parametro ?to=+52...' });
  const components = templateComponents.newBooking({
    professionalName: 'Test Aliax',
    clientName: 'Cliente Test',
    serviceName: 'Servicio Test',
    date: new Date(),
    startTime: '10:00',
  });
  const result = await sendWhatsAppTemplate(to, 'nueva_reserva', 'es_MX', components);
  res.json(result);
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Aura API running on http://localhost:${env.PORT}`);
  startReminderJob();
  startTrialExpiryJob();
});
