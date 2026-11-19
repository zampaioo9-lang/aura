/**
 * Revision semanal de regresion de Aliax (corre los miercoles desde la tarea programada).
 *
 *   npx tsx scripts/weekly-regression.ts [carpeta-de-salida]
 *
 * Que hace:
 *  1. Pruebas de punta a punta con DATOS SINTETICOS: crea un profesional de prueba (correo @aliax-test.invalid),
 *     lo usa para probar reservas, reglas, notificaciones, zona horaria del paciente y la pagina de gestion
 *     de citas, y lo BORRA TODO al terminar (con verificacion). No toca cuentas ni pacientes reales.
 *     No envia correos ni WhatsApp: las claves de envio se vacian antes de cargar el codigo.
 *  2. Chequeos de SOLO LECTURA sobre produccion: API y sitio arriba, citas sin codigo, avisos fallidos,
 *     recordatorios de 24 h enviados, planes de las cuentas internas.
 *  3. Foto de los ajustes (reglas, servicios, horarios) y comparacion con la semana anterior para avisar
 *     de cambios que nadie hizo a proposito (por ejemplo un reseteo a valores por defecto).
 *
 * Genera "Revision funcional del <fecha>.md" y sale con codigo 1 si alguna prueba FALLA.
 */
import fs from 'fs';
import path from 'path';
import http from 'http';

// Sin envios reales: se vacian ANTES de importar el codigo de Aliax (config/env los lee al cargar).
for (const k of ['RESEND_API_KEY', 'META_WA_TOKEN', 'META_WA_PHONE_NUMBER_ID']) process.env[k] = '';

type Level = 'ok' | 'fail' | 'warn';
interface Result { area: string; name: string; level: Level; detail: string }
const results: Result[] = [];

function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }

async function check(area: string, name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const detail = (await fn()) || '';
    results.push({ area, name, level: 'ok', detail });
  } catch (e) {
    results.push({ area, name, level: 'fail', detail: e instanceof Error ? e.message : String(e) });
  }
}
function warn(area: string, name: string, detail: string): void { results.push({ area, name, level: 'warn', detail }); }

const OUT_DIR = process.argv[2] || 'C:/Users/zampa/Mis Proyectos/Revision IA Semanal';
const PROD_API = 'https://api.aliax.io';
const PROD_WEB = 'https://www.aliax.io';

async function main() {
  const { PrismaClient, Prisma } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const express = (await import('express')).default;
  const { errorHandler } = await import('../src/middleware/errorHandler');
  const bookingService = await import('../src/services/bookingService');
  const { signToken } = await import('../src/services/authService');
  const { zonedWallTimeToInstant, localizeBookingTime } = await import('../src/lib/clientTimezone');
  const manageRoutes = (await import('../src/routes/manage-booking')).default;
  const bookingRoutes = (await import('../src/routes/bookings')).default;
  const settingsRoutes = (await import('../src/routes/booking-settings')).default;

  const stamp = Date.now();
  const proEmail = `zz-regresion-${stamp}@aliax-test.invalid`;
  const clientEmail = `zz-paciente-${stamp}@aliax-test.invalid`;
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  // ── limpieza de restos de corridas anteriores que se hayan interrumpido ──
  async function purge(where: { email: { startsWith: string } }) {
    const users = await prisma.user.findMany({ where, select: { id: true } });
    for (const u of users) {
      await prisma.booking.deleteMany({ where: { professionalId: u.id } });
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  }
  await purge({ email: { startsWith: 'zz-regresion-' } });

  // ── servidor local con las rutas reales (apunta a la misma base de datos) ──
  const app = express();
  app.use(express.json());
  app.use('/api/manage-booking', manageRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/booking-settings', settingsRoutes);
  app.use(errorHandler);
  const server = http.createServer(app);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  async function api(method: string, p: string, body?: unknown, token?: string) {
    const res = await fetch(base + p, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, json };
  }

  let userId = '';
  let profileId = '';
  let serviceId = '';

  try {
    // ── datos sinteticos ──
    const user = await prisma.user.create({ data: { email: proEmail, password: 'sin-acceso', name: 'ZZ Prueba Regresion', socialLinks: { whatsapp: '+5215500000000' } } });
    userId = user.id;
    const profile = await prisma.profile.create({ data: { userId, slug: `zz-regresion-${stamp}`, title: 'ZZ Prueba Regresion', profession: 'Psicologo', published: false } });
    profileId = profile.id;
    const service = await prisma.service.create({ data: { profileId, name: 'ZZ Consulta de prueba', price: 0, currency: 'MXN', durationMinutes: 60, sessionModality: 'online' } });
    serviceId = service.id;
    for (let d = 0; d < 7; d++) await prisma.availabilitySlot.create({ data: { profileId, dayOfWeek: d, startTime: '08:00', endTime: '20:00' } });
    await prisma.client.create({ data: { userId, name: 'ZZ Paciente', email: clientEmail, timezone: 'Europe/Paris' } });
    const token = signToken(userId);

    const BASELINE = {
      emailEnabled: true, autoConfirm: false, allowClientCancel: true, multiplePerSlot: false,
      maxActiveBookingsPerClient: 0, minDaysBetweenBookings: 0, cancellationHours: 0, minAdvanceHours: 0,
      advanceBookingDays: 90, bufferMinutes: 0, timezone: 'America/Mexico_City',
      meetingLink: 'https://meet.google.com/zzz-test-link', notificationPrefs: undefined as undefined | object | null,
    };
    await prisma.bookingSettings.create({ data: { profileId, ...BASELINE, notificationPrefs: undefined } });

    async function reset(extra: Record<string, unknown> = {}) {
      await prisma.booking.deleteMany({ where: { profileId } });
      await prisma.bookingSettings.update({ where: { profileId }, data: { ...BASELINE, notificationPrefs: Prisma.DbNull, ...extra } as any });
    }
    const notes = (bookingId: string) => prisma.notification.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } });
    const book = (d: string, t: string, opts?: { skipClientRequestEmail?: boolean; enforceClientLimits?: boolean }) =>
      bookingService.createBooking({ profileId, serviceId, clientName: 'ZZ Paciente', clientEmail, clientPhone: '', date: d, startTime: t }, opts);
    const slotsOf = (d: string) => bookingService.getAvailableSlots(profileId, serviceId, d);
    async function expectError(fn: () => Promise<unknown>, status: number, contains?: string) {
      try { await fn(); } catch (e: any) {
        assert(e?.statusCode === status, `se esperaba error ${status} y fue ${e?.statusCode ?? e?.message}`);
        if (contains) {
          const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
          assert(norm(String(e.message)).includes(norm(contains)), `el mensaje deberia mencionar "${contains}": ${e.message}`);
        }
        return;
      }
      throw new Error(`se esperaba error ${status} y no hubo ninguno`);
    }
    const forClient = <T extends { recipient: string }>(rows: T[]) => rows.filter(r => r.recipient === clientEmail);
    const forPro = <T extends { recipient: string }>(rows: T[]) => rows.filter(r => r.recipient === proEmail);

    // ═══════════ A. DISPONIBILIDAD ═══════════
    await check('Disponibilidad', 'Hay horarios libres y la validacion al reservar coincide', async () => {
      await reset();
      const s = await slotsOf(day(10));
      assert(s.length > 8, `solo ${s.length} horarios`);
      const c = await bookingService.checkAvailability(profileId, serviceId, day(10), s[0], 60);
      assert(c.available, 'el primer horario listado no pasa checkAvailability');
      return `${s.length} horarios`;
    });
    await check('Disponibilidad', 'Antelacion minima de 72 h oculta mañana pero no dentro de 10 dias', async () => {
      await reset({ minAdvanceHours: 72 });
      assert((await slotsOf(day(1))).length === 0, 'mañana deberia estar vacio');
      assert((await slotsOf(day(10))).length > 0, 'en 10 dias deberia haber horarios');
    });
    await check('Disponibilidad', 'Antelacion maxima de 5 dias oculta dentro de 10 dias', async () => {
      await reset({ advanceBookingDays: 5 });
      assert((await slotsOf(day(10))).length === 0, 'dentro de 10 dias deberia estar vacio');
    });
    await check('Disponibilidad', 'Antelacion minima usa la zona horaria del profesional (hoy)', async () => {
      await reset({ minAdvanceHours: 1 });
      const today = new Date().toISOString().slice(0, 10);
      const got = await slotsOf(today);
      const expected: string[] = [];
      for (let m = 8 * 60; m + 60 <= 20 * 60; m += 15) {
        const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        if (zonedWallTimeToInstant(today, t, 'America/Mexico_City').getTime() - Date.now() >= 3_600_000) expected.push(t);
      }
      assert(JSON.stringify(got) === JSON.stringify(expected), `hoy: se esperaban ${expected.length} horarios y hay ${got.length}`);
      return `${got.length} horarios hoy`;
    });
    await check('Disponibilidad', 'Buffer de 30 min deja espacio entre citas', async () => {
      await reset({ bufferMinutes: 30 });
      const s = await slotsOf(day(10));
      await book(day(10), s[0]);
      const after = await slotsOf(day(10));
      assert(!after.includes('09:00') && !after.includes('09:15'), '09:00 y 09:15 deberian estar bloqueados por el buffer de 30 min');
      assert(after.includes('09:30'), '09:30 deberia estar libre');
    });

    // ═══════════ B. RESERVAS Y NOTIFICACIONES ═══════════
    await check('Reservas', 'Reserva publica: queda pendiente, con codigo y avisos a paciente y profesional', async () => {
      await reset();
      const s = await slotsOf(day(10));
      const b = await book(day(10), s[0]);
      assert(b.status === 'PENDING', `estado ${b.status}`);
      const row = await prisma.booking.findUnique({ where: { id: b.id }, select: { manageToken: true } });
      assert(!!row?.manageToken && row.manageToken.length === 32, 'sin codigo de gestion');
      const n = await notes(b.id);
      assert(forClient(n).some(r => r.type === 'NEW_BOOKING'), 'falta la solicitud recibida al paciente');
      assert(forPro(n).some(r => r.type === 'NEW_BOOKING'), 'falta el aviso de nueva reserva al profesional');
    });
    await check('Notificaciones', 'Confirmacion apagada: el paciente no recibe la solicitud', async () => {
      await reset({ notificationPrefs: { clientConfirmation: false } });
      const b = await book(day(10), (await slotsOf(day(10)))[0]);
      assert(forClient(await notes(b.id)).length === 0, 'se envio algo al paciente');
    });
    await check('Notificaciones', 'Aviso de nueva reserva al profesional apagado', async () => {
      await reset({ notificationPrefs: { profNewBooking: false } });
      const b = await book(day(10), (await slotsOf(day(10)))[0]);
      assert(forPro(await notes(b.id)).length === 0, 'se envio algo al profesional');
      assert(forClient(await notes(b.id)).length > 0, 'el paciente deberia seguir recibiendo');
    });
    await check('Notificaciones', 'Canal Email apagado: ningun correo de la reserva', async () => {
      await reset({ emailEnabled: false });
      const b = await book(day(10), (await slotsOf(day(10)))[0]);
      assert((await notes(b.id)).filter(r => r.recipient.includes('@')).length === 0, 'se envio algun correo');
    });
    await check('Reglas', 'Confirmacion automatica: la reserva queda confirmada y el paciente recibe la confirmacion', async () => {
      await reset({ autoConfirm: true });
      const b = await book(day(10), (await slotsOf(day(10)))[0]);
      assert(b.status === 'CONFIRMED', `la respuesta dice ${b.status}`);
      const db = await prisma.booking.findUnique({ where: { id: b.id } });
      assert(db?.status === 'CONFIRMED', `en la base queda ${db?.status}`);
      const n = forClient(await notes(b.id));
      assert(n.some(r => r.type === 'CONFIRMATION'), 'falta la confirmacion al paciente');
      assert(!n.some(r => r.type === 'NEW_BOOKING'), 'no deberia mandarse "solicitud pendiente"');
    });
    await check('Reservas', 'Cita creada por el profesional: sin solicitud pendiente y confirmacion con hora de Paris', async () => {
      await reset();
      const s = await slotsOf(day(10));
      const b = await book(day(10), s[0], { skipClientRequestEmail: true, enforceClientLimits: false });
      assert((await notes(b.id)).length === 0, 'no deberia haber avisos antes de la confirmacion (ni al profesional)');
      await bookingService.sendClientConfirmationForProfessionalBooking(b.id);
      const n = forClient(await notes(b.id));
      assert(n.length === 1 && n[0].type === 'CONFIRMATION', 'falta la confirmacion al paciente');
      assert(/Cita confirmada/.test(n[0].message), `asunto inesperado: ${n[0].message}`);
    });
    await check('Reservas', 'Cita creada por el profesional: el profesional recibe su copia (y se puede apagar)', async () => {
      await reset();
      const s = await slotsOf(day(10));
      const b = await book(day(10), s[0], { skipClientRequestEmail: true, enforceClientLimits: false });
      await bookingService.sendProfessionalCopyForProfessionalBooking(b.id);
      const n = forPro(await notes(b.id));
      assert(n.length === 1 && n[0].type === 'NEW_BOOKING', 'el profesional no recibio su copia');
      assert(/Cita agendada/.test(n[0].message), `asunto inesperado: ${n[0].message}`);
      await reset({ notificationPrefs: { profNewBooking: false } });
      const b2 = await book(day(10), s[0], { skipClientRequestEmail: true, enforceClientLimits: false });
      await bookingService.sendProfessionalCopyForProfessionalBooking(b2.id);
      assert(forPro(await notes(b2.id)).length === 0, 'con el interruptor apagado no deberia enviarse');
    });
    await check('Reglas', 'Multiples reservas por horario: apagado bloquea, encendido permite', async () => {
      await reset();
      const s = await slotsOf(day(10));
      await book(day(10), s[0]);
      await expectError(() => book(day(10), s[0]), 409);
      await prisma.bookingSettings.update({ where: { profileId }, data: { multiplePerSlot: true } });
      const again = await bookingService.checkAvailability(profileId, serviceId, day(10), s[0], 60);
      assert(again.available, 'con multiplePerSlot deberia estar disponible');
    });
    await check('Reglas', 'Limite de 1 reserva activa por paciente (y no aplica al profesional)', async () => {
      await reset({ maxActiveBookingsPerClient: 1 });
      const s = await slotsOf(day(10));
      await book(day(10), s[0]);
      await expectError(() => book(day(11), s[0]), 409, 'maximo');
      await book(day(11), s[0], { skipClientRequestEmail: true, enforceClientLimits: false });
    });
    await check('Reglas', 'Intervalo minimo de 3 dias entre reservas', async () => {
      await reset({ minDaysBetweenBookings: 3 });
      const s = await slotsOf(day(10));
      await book(day(10), s[0]);
      await expectError(() => book(day(12), s[0]), 409, 'al menos 3');
      await book(day(13), s[0]);
    });

    // ═══════════ C. PAGINA PUBLICA DE GESTION DE CITAS ═══════════
    async function newBooking(d: string, t?: string, extra: Record<string, unknown> = {}) {
      await reset(extra);
      const s = await slotsOf(d);
      const b = await book(d, t || s[0], { skipClientRequestEmail: true, enforceClientLimits: false });
      await prisma.booking.update({ where: { id: b.id }, data: { status: 'CONFIRMED' } });
      const tk = (await prisma.booking.findUnique({ where: { id: b.id }, select: { manageToken: true } }))!.manageToken!;
      return { id: b.id, tk, slots: s };
    }
    await check('Gestion de cita', 'Enlace invalido responde 404', async () => {
      assert((await api('GET', '/api/manage-booking/' + 'x'.repeat(32))).status === 404, 'no dio 404');
      assert((await api('GET', '/api/manage-booking/corto')).status === 404, 'token corto no dio 404');
    });
    await check('Gestion de cita', 'La pagina muestra la cita en hora de Paris con tipo y enlace de videollamada', async () => {
      const { tk } = await newBooking(day(10), '10:00');
      const r = await api('GET', `/api/manage-booking/${tk}`);
      assert(r.status === 200, `status ${r.status}`);
      const esperado = localizeBookingTime(day(10), '10:00', 'America/Mexico_City', 'Europe/Paris').startTime;
      assert(r.json.startTime === esperado, `hora: ${r.json.startTime} (se esperaba ${esperado})`);
      assert(r.json.modalityLabel === 'En línea (videollamada)', `modalidad: ${r.json.modalityLabel}`);
      assert(r.json.meetingLink === BASELINE.meetingLink, 'enlace de videollamada');
      assert(r.json.canChange === true, 'deberia poder cambiarse');
    });
    await check('Gestion de cita', 'Horarios para reagendar se listan en hora de Paris', async () => {
      const { tk } = await newBooking(day(10), '10:00');
      const r = await api('GET', `/api/manage-booking/${tk}/slots?date=${day(11)}`);
      assert(r.status === 200 && r.json.slots.length > 0, 'sin horarios');
      assert(r.json.slots.every((s: any) => /\(hora de París\)$/.test(s.label)), 'etiquetas sin hora de Paris');
    });
    await check('Gestion de cita', 'Reagendar: cambia la cita, reenvia recordatorios y avisa a paciente y profesional', async () => {
      const { id, tk, slots } = await newBooking(day(10), '09:00');
      await prisma.notification.create({ data: { bookingId: id, type: 'REMINDER_24H', recipient: clientEmail, message: 'previo', status: 'SENT' } });
      const target = slots.find(s => s !== '09:00' && s >= '12:00')!;
      const r = await api('POST', `/api/manage-booking/${tk}/reschedule`, { date: day(12), startTime: target });
      assert(r.status === 200, `status ${r.status}: ${JSON.stringify(r.json)}`);
      const db = await prisma.booking.findUnique({ where: { id } });
      assert(db!.date.toISOString().slice(0, 10) === day(12) && db!.startTime === target, 'la cita no cambio');
      const n = await notes(id);
      assert(!n.some(x => x.type === 'REMINDER_24H'), 'el recordatorio anterior no se borro');
      assert(forClient(n).some(x => x.type === 'RESCHEDULED'), 'falta el aviso al paciente');
      assert(forPro(n).some(x => x.type === 'RESCHEDULED'), 'falta el aviso al profesional');
    });
    await check('Gestion de cita', 'Reagendar: aviso al profesional apagado', async () => {
      const { id, tk, slots } = await newBooking(day(10), '09:00', { notificationPrefs: { profReschedule: false } });
      const r = await api('POST', `/api/manage-booking/${tk}/reschedule`, { date: day(12), startTime: slots.find(s => s >= '12:00')! });
      assert(r.status === 200, `status ${r.status}`);
      assert(forPro(await notes(id)).length === 0, 'se aviso al profesional');
    });
    await check('Gestion de cita', 'Reagendar a un horario ocupado y al mismo horario se rechaza', async () => {
      const a = await newBooking(day(10), '09:00');
      await book(day(12), '14:00', { skipClientRequestEmail: true, enforceClientLimits: false });
      const busy = await api('POST', `/api/manage-booking/${a.tk}/reschedule`, { date: day(12), startTime: '14:00' });
      assert(busy.status === 409, `ocupado dio ${busy.status}`);
      const same = await api('POST', `/api/manage-booking/${a.tk}/reschedule`, { date: day(10), startTime: '09:00' });
      assert(same.status === 400, `mismo horario dio ${same.status}`);
      const bad = await api('POST', `/api/manage-booking/${a.tk}/reschedule`, { date: 'mañana', startTime: 'x' });
      assert(bad.status === 400, `datos invalidos dio ${bad.status}`);
    });
    await check('Reglas', 'Permitir cancelaciones apagado: cancelar y reagendar dan 403 (tambien la ruta antigua)', async () => {
      const { id, tk } = await newBooking(day(10), '09:00', { allowClientCancel: false });
      assert((await api('POST', `/api/manage-booking/${tk}/cancel`, {})).status === 403, 'cancelar por enlace');
      assert((await api('POST', `/api/manage-booking/${tk}/reschedule`, { date: day(12), startTime: '15:00' })).status === 403, 'reagendar por enlace');
      assert((await api('PUT', `/api/bookings/${id}/cancel`, { clientEmail })).status === 403, 'cancelar por ruta antigua');
      const g = await api('GET', `/api/manage-booking/${tk}`);
      assert(g.json.canChange === false && !!g.json.blockedReason, 'la pagina deberia indicar que no se puede');
    });
    await check('Reglas', 'Plazo de cancelacion de 96 h bloquea una cita de mañana', async () => {
      const { id, tk } = await newBooking(day(1), '19:00', { cancellationHours: 96 });
      const r = await api('POST', `/api/manage-booking/${tk}/cancel`, {});
      assert(r.status === 403 && /96 horas/.test(r.json?.error || ''), `status ${r.status}: ${r.json?.error}`);
      const old = await api('PUT', `/api/bookings/${id}/cancel`, { clientEmail });
      assert(old.status === 403, `ruta antigua dio ${old.status}`);
    });
    await check('Gestion de cita', 'Cancelar: cita cancelada y avisos a paciente y profesional', async () => {
      const { id, tk } = await newBooking(day(10), '09:00');
      const r = await api('POST', `/api/manage-booking/${tk}/cancel`, { reason: 'prueba' });
      assert(r.status === 200, `status ${r.status}`);
      assert((await prisma.booking.findUnique({ where: { id } }))!.status === 'CANCELLED', 'no quedo cancelada');
      const n = await notes(id);
      assert(forClient(n).some(x => x.type === 'CANCELLATION'), 'falta aviso al paciente');
      assert(forPro(n).some(x => x.type === 'CANCELLATION'), 'falta aviso al profesional');
      const again = await api('POST', `/api/manage-booking/${tk}/cancel`, {});
      assert(again.status === 403, `cancelar otra vez dio ${again.status}`);
    });
    await check('Notificaciones', 'Aviso de cancelacion apagado para el paciente', async () => {
      const { id, tk } = await newBooking(day(10), '09:00', { notificationPrefs: { clientCancellation: false } });
      await api('POST', `/api/manage-booking/${tk}/cancel`, {});
      const n = await notes(id);
      assert(forClient(n).length === 0, 'se aviso al paciente');
      assert(forPro(n).length > 0, 'el profesional deberia seguir enterandose');
    });
    await check('Gestion de cita', 'Cita pasada no se puede cambiar', async () => {
      await reset();
      const s = await slotsOf(day(10));
      const b = await book(day(10), s[0], { skipClientRequestEmail: true, enforceClientLimits: false });
      await prisma.booking.update({ where: { id: b.id }, data: { date: new Date(day(-3)), status: 'CONFIRMED' } });
      const tk = (await prisma.booking.findUnique({ where: { id: b.id }, select: { manageToken: true } }))!.manageToken!;
      const g = await api('GET', `/api/manage-booking/${tk}`);
      assert(g.json.canChange === false && /pas/.test(g.json.blockedReason || ''), `canChange=${g.json.canChange} (${g.json.blockedReason})`);
      assert((await api('POST', `/api/manage-booking/${tk}/cancel`, {})).status === 403, 'cancelar una cita pasada');
    });

    // ═══════════ D. GUARDADO DE AJUSTES (el error que reseteaba reglas) ═══════════
    await check('Ajustes', 'Guardar Notificaciones NO resetea reglas ni zona horaria', async () => {
      await reset({ bufferMinutes: 25, minAdvanceHours: 12, cancellationHours: 36, timezone: 'America/Bogota', allowClientCancel: false });
      const r = await api('PUT', `/api/booking-settings?profileId=${profileId}`, { emailEnabled: true, notificationPrefs: { clientReminder1h: true } }, token);
      assert(r.status === 200, `status ${r.status}: ${JSON.stringify(r.json)}`);
      const s = await prisma.bookingSettings.findUnique({ where: { profileId } });
      assert(s!.bufferMinutes === 25 && s!.minAdvanceHours === 12 && s!.cancellationHours === 36, 'las reglas se resetearon');
      assert(s!.timezone === 'America/Bogota' && s!.allowClientCancel === false, 'zona horaria o permitir cancelar cambiaron');
      assert((s!.notificationPrefs as any)?.clientReminder1h === true, 'la preferencia no se guardo');
    });
    await check('Ajustes', 'Guardar una preferencia conserva las demas', async () => {
      await reset({ notificationPrefs: { clientReminder24h: false, profCancellation: false } });
      await api('PUT', `/api/booking-settings?profileId=${profileId}`, { notificationPrefs: { clientCancellation: false } }, token);
      const p = (await prisma.bookingSettings.findUnique({ where: { profileId } }))!.notificationPrefs as any;
      assert(p.clientReminder24h === false && p.profCancellation === false && p.clientCancellation === false, `prefs: ${JSON.stringify(p)}`);
    });
    await check('Ajustes', 'GET devuelve las preferencias completas con valores por defecto', async () => {
      await reset();
      const r = await api('GET', `/api/booking-settings?profileId=${profileId}`, undefined, token);
      const p = r.json?.notificationPrefs;
      assert(r.status === 200 && p?.clientConfirmation === true && p?.clientReminder24h === true && p?.clientReminder1h === false && p?.profReschedule === true, JSON.stringify(p));
    });
  } catch (setupError) {
    results.push({ area: 'Preparacion', name: 'Datos sinteticos de prueba', level: 'fail', detail: setupError instanceof Error ? setupError.message : String(setupError) });
  } finally {
    // ── limpieza SIEMPRE, con verificacion ──
    try {
      if (userId) {
        await prisma.booking.deleteMany({ where: { professionalId: userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
      const left = await prisma.user.count({ where: { email: { startsWith: 'zz-regresion-' } } });
      const leftBookings = userId ? await prisma.booking.count({ where: { professionalId: userId } }) : 0;
      const leftProfiles = profileId ? await prisma.profile.count({ where: { id: profileId } }) : 0;
      if (left === 0 && leftBookings === 0 && leftProfiles === 0) results.push({ area: 'Limpieza', name: 'Datos de prueba borrados', level: 'ok', detail: 'sin restos en la base' });
      else results.push({ area: 'Limpieza', name: 'Datos de prueba borrados', level: 'fail', detail: `quedaron ${left} usuarios, ${leftBookings} citas, ${leftProfiles} perfiles de prueba` });
    } catch (e) {
      results.push({ area: 'Limpieza', name: 'Datos de prueba borrados', level: 'fail', detail: 'no se pudo borrar: ' + (e instanceof Error ? e.message : String(e)) });
    }
    await new Promise<void>(r => server.close(() => r()));
  }

  // ═══════════ E. SOLO LECTURA SOBRE PRODUCCION ═══════════
  async function httpStatus(url: string) { try { return (await fetch(url, { redirect: 'manual' })).status; } catch (e) { return 0; } }
  await check('Produccion', 'API arriba (/api/health)', async () => { assert((await httpStatus(`${PROD_API}/api/health`)) === 200, 'no responde 200'); });
  await check('Produccion', 'Sitio arriba y pagina de gestion de citas servida', async () => {
    assert((await httpStatus(`${PROD_WEB}/`)) === 200, 'portada no responde 200');
    assert((await httpStatus(`${PROD_WEB}/cita/${'a'.repeat(32)}`)) === 200, '/cita/... no responde 200');
  });
  await check('Produccion', 'Rutas protegidas piden sesion y enlace invalido da 404', async () => {
    assert((await httpStatus(`${PROD_API}/api/booking-settings`)) === 401, 'booking-settings sin sesion');
    assert((await httpStatus(`${PROD_API}/api/clients`)) === 401, 'clients sin sesion');
    assert((await httpStatus(`${PROD_API}/api/manage-booking/${'z'.repeat(32)}`)) === 404, 'manage-booking invalido');
  });
  await check('Produccion', 'Horarios publicos de un perfil real responden', async () => {
    const svc = await prisma.service.findFirst({ where: { isActive: true, profile: { published: true } }, select: { id: true, profileId: true } });
    assert(!!svc, 'no hay servicio activo en un perfil publicado');
    const code = await httpStatus(`${PROD_API}/api/bookings/available-slots?profileId=${svc!.profileId}&serviceId=${svc!.id}&date=${day(3)}`);
    assert(code === 200, `respondio ${code}`);
  });
  await check('Datos', 'Todas las citas tienen codigo de gestion', async () => {
    const n = await prisma.booking.count({ where: { manageToken: null } });
    assert(n === 0, `${n} citas sin codigo (sus botones usarian el respaldo por WhatsApp)`);
  });
  {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const failedRows = await prisma.notification.findMany({ where: { status: 'FAILED', createdAt: { gte: since } }, select: { recipient: true, error: true } });
    // WhatsApp esta pospuesto por decision de Alberto (se activara cuando los terapeutas lo pidan): sus fallos no se reportan.
    const emailFailed = failedRows.filter(r => r.recipient.includes('@'));
    const whatsappIgnored = failedRows.length - emailFailed.length;
    if (emailFailed.length > 0) {
      const causas = new Map<string, number>();
      for (const r of emailFailed) {
        const k = (r.error || 'sin detalle').slice(0, 120);
        causas.set(k, (causas.get(k) || 0) + 1);
      }
      warn('Datos', 'Correos fallidos en los ultimos 7 dias', `${emailFailed.length} correos con estado FAILED. Causas: ${[...causas.entries()].map(([k, n]) => `${n} x ${k}`).join(' | ')}`);
    } else {
      results.push({ area: 'Datos', name: 'Correos fallidos en los ultimos 7 dias', level: 'ok', detail: whatsappIgnored ? `ninguno (${whatsappIgnored} fallo(s) de WhatsApp ignorados: pospuesto)` : 'ninguno' });
    }
  }
  {
    // Recordatorios de 24 h: citas confirmadas de los ultimos 3 dias que debieron recibirlo
    const cands = await prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, date: { gte: new Date(Date.now() - 3 * 86_400_000), lt: new Date(day(0)) }, clientEmail: { not: '' } },
      select: { id: true, createdAt: true, date: true, profileId: true, clientEmail: true },
    });
    const missing: string[] = [];
    for (const b of cands) {
      if (b.createdAt.getTime() > b.date.getTime() - 30 * 3_600_000) continue; // se reservo con menos de 30 h: no le tocaba
      const cfg = await prisma.bookingSettings.findUnique({ where: { profileId: b.profileId }, select: { emailEnabled: true, notificationPrefs: true } });
      if (cfg?.emailEnabled === false || (cfg?.notificationPrefs as any)?.clientReminder24h === false) continue;
      const sent = await prisma.notification.count({ where: { bookingId: b.id, type: 'REMINDER_24H', status: 'SENT' } });
      if (sent === 0) missing.push(b.id.slice(0, 8));
    }
    if (missing.length) warn('Datos', 'Recordatorio de 24 h sin enviar', `${missing.length} cita(s) reciente(s) sin su recordatorio: ${missing.join(', ')} (revisar el cron en cron-job.org)`);
    else results.push({ area: 'Datos', name: 'Recordatorio de 24 h enviado en citas recientes', level: 'ok', detail: `${cands.length} cita(s) revisada(s)` });
  }
  await check('Datos', 'Planes de las cuentas internas siguen fijos', async () => {
    const expected: Record<string, string | null> = { 'psiquecreativa9@gmail.com': 'CLINICO', 'zampaioo9@gmail.com': 'PRO', 'zampaio9@hotmail.com': 'FREE' };
    const users = await prisma.user.findMany({ where: { email: { in: Object.keys(expected) } }, select: { email: true, plan: true, planExpiresAt: true } });
    const bad = users.filter(u => (u.plan ?? 'FREE') !== expected[u.email] || (u.planExpiresAt && u.planExpiresAt.getTime() < Date.now()));
    assert(bad.length === 0, bad.map(u => `${u.email}: plan ${u.plan ?? 'null'}${u.planExpiresAt ? ' vence ' + u.planExpiresAt.toISOString().slice(0, 10) : ''}`).join('; '));
    assert(users.length === 3, `solo se encontraron ${users.length} de las 3 cuentas internas`);
  });

  // ═══════════ F. FOTO DE AJUSTES Y COMPARACION ═══════════
  const snapDir = path.join(OUT_DIR, 'snapshots');
  fs.mkdirSync(snapDir, { recursive: true });
  const profiles = await prisma.profile.findMany({
    where: { NOT: { slug: { startsWith: 'zz-regresion-' } } },
    select: {
      slug: true, title: true,
      bookingSettings: true,
      services: { select: { name: true, isActive: true, price: true, durationMinutes: true, sessionModality: true }, orderBy: { name: 'asc' } },
      availabilitySlots: { select: { dayOfWeek: true, startTime: true, endTime: true, isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
    orderBy: { slug: 'asc' },
  });
  const snapshot: Record<string, any> = {};
  const RULE_DEFAULTS = { bufferMinutes: 0, advanceBookingDays: 60, minAdvanceHours: 1, cancellationHours: 24, autoConfirm: false, timezone: 'America/Mexico_City' } as Record<string, unknown>;
  for (const p of profiles) {
    const s = p.bookingSettings;
    snapshot[p.slug] = {
      titulo: p.title,
      ajustes: s ? {
        bufferMinutes: s.bufferMinutes, advanceBookingDays: s.advanceBookingDays, minAdvanceHours: s.minAdvanceHours,
        cancellationHours: s.cancellationHours, autoConfirm: s.autoConfirm, emailEnabled: s.emailEnabled, timezone: s.timezone,
        meetingLink: s.meetingLink, allowClientCancel: s.allowClientCancel, multiplePerSlot: s.multiplePerSlot,
        maxActiveBookingsPerClient: s.maxActiveBookingsPerClient, minDaysBetweenBookings: s.minDaysBetweenBookings,
        notificationPrefs: s.notificationPrefs ?? null,
      } : null,
      servicios: p.services.map(x => `${x.name} | ${x.isActive ? 'activo' : 'inactivo'} | ${String(x.price)} | ${x.durationMinutes} min | ${x.sessionModality ?? '-'}`),
      horario: p.availabilitySlots.filter(x => x.isActive).map(x => `${x.dayOfWeek}:${x.startTime}-${x.endTime}`),
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  const prevFile = fs.readdirSync(snapDir).filter(f => /^snapshot-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f !== `snapshot-${today}.json`).sort().pop();
  const changes: string[] = [];
  const resets: string[] = [];
  if (prevFile) {
    const prev = JSON.parse(fs.readFileSync(path.join(snapDir, prevFile), 'utf8')) as Record<string, any>;
    const slugs = new Set([...Object.keys(prev), ...Object.keys(snapshot)]);
    for (const slug of slugs) {
      const a = prev[slug], b = snapshot[slug];
      const name = (b?.titulo || a?.titulo || slug);
      if (!a) { changes.push(`${name}: perfil nuevo`); continue; }
      if (!b) { changes.push(`${name}: el perfil ya no existe`); continue; }
      if (JSON.stringify(a.ajustes) !== JSON.stringify(b.ajustes)) {
        const keys = new Set([...Object.keys(a.ajustes || {}), ...Object.keys(b.ajustes || {})]);
        for (const k of keys) {
          const va = JSON.stringify(a.ajustes?.[k] ?? null), vb = JSON.stringify(b.ajustes?.[k] ?? null);
          if (va !== vb) changes.push(`${name}: ${k} cambio de ${va} a ${vb}`);
        }
        const wasCustom = Object.entries(RULE_DEFAULTS).some(([k, v]) => a.ajustes && a.ajustes[k] !== v);
        const nowDefault = Object.entries(RULE_DEFAULTS).every(([k, v]) => b.ajustes && b.ajustes[k] === v);
        if (wasCustom && nowDefault) resets.push(name);
      }
      const sa = JSON.stringify(a.servicios), sb = JSON.stringify(b.servicios);
      if (sa !== sb) changes.push(`${name}: cambiaron los servicios (${a.servicios.length} -> ${b.servicios.length})`);
      if (JSON.stringify(a.horario) !== JSON.stringify(b.horario)) changes.push(`${name}: cambio el horario de atencion`);
    }
  }
  fs.writeFileSync(path.join(snapDir, `snapshot-${today}.json`), JSON.stringify(snapshot, null, 2));
  if (resets.length) results.push({ area: 'Ajustes', name: 'Posible reseteo de reglas a valores por defecto', level: 'fail', detail: `Reglas personalizadas que ahora estan todas en valores por defecto: ${resets.join(', ')}` });
  else results.push({ area: 'Ajustes', name: 'Ninguna regla personalizada volvio a valores por defecto', level: 'ok', detail: prevFile ? `comparado con ${prevFile}` : 'primera foto, sin semana anterior' });

  // ═══════════ REPORTE ═══════════
  const fails = results.filter(r => r.level === 'fail');
  const warns = results.filter(r => r.level === 'warn');
  const oks = results.filter(r => r.level === 'ok');
  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const icon = (l: Level) => (l === 'ok' ? 'OK' : l === 'fail' ? 'FALLA' : 'AVISO');
  let md = `# Revision funcional de Aliax del ${fecha}\n\n`;
  md += fails.length === 0
    ? `**Resultado: todo en orden.** ${oks.length} pruebas pasaron${warns.length ? `, ${warns.length} aviso(s) para revisar` : ''}.\n\n`
    : `**Resultado: ${fails.length} prueba(s) FALLARON.** ${oks.length} pasaron${warns.length ? `, ${warns.length} aviso(s)` : ''}. Revisar primero la seccion "Fallas".\n\n`;
  if (fails.length) {
    md += `## Fallas\n\n` + fails.map(r => `- **${r.area} / ${r.name}**: ${r.detail}`).join('\n') + '\n\n';
  }
  if (warns.length) {
    md += `## Avisos\n\n` + warns.map(r => `- **${r.area} / ${r.name}**: ${r.detail}`).join('\n') + '\n\n';
  }
  md += `## Cambios en los ajustes desde la ultima foto${prevFile ? ` (${prevFile.replace('snapshot-', '').replace('.json', '')})` : ''}\n\n`;
  md += prevFile ? (changes.length ? changes.map(c => `- ${c}`).join('\n') : 'Ningun cambio.') : 'Primera foto guardada: la proxima semana se comparara contra esta.';
  md += `\n\nSi alguno de estos cambios no lo hiciste tu, avisa.\n\n## Detalle de todas las pruebas\n\n| Resultado | Area | Prueba | Detalle |\n|---|---|---|---|\n`;
  md += results.map(r => `| ${icon(r.level)} | ${r.area} | ${r.name} | ${r.detail.replace(/\|/g, '/').replace(/\n/g, ' ')} |`).join('\n') + '\n';
  const outFile = path.join(OUT_DIR, `Revision funcional del ${fecha}.md`);
  fs.writeFileSync(outFile, md);
  console.log(md);
  console.log(`\nReporte guardado en: ${outFile}`);
  await prisma.$disconnect();
  process.exit(fails.length ? 1 : 0);
}

main().catch(e => { console.error('ERROR INESPERADO:', e); process.exit(2); });
