export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string; suffix?: string }> = {
  EUR: { locale: 'es-ES', symbol: '€' },
  USD: { locale: 'en-US', symbol: '$' },
  MXN: { locale: 'es-MX', symbol: '$', suffix: ' MX' },
  COP: { locale: 'es-CO', symbol: '$', suffix: ' COP' },
  ARS: { locale: 'es-AR', symbol: '$', suffix: ' ARS' },
  CLP: { locale: 'es-CL', symbol: '$', suffix: ' CLP' },
};

export function formatPrice(amount: number | string, currency: string = 'EUR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const config = CURRENCY_CONFIG[currency];
  if (!config) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  }
  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
  return formatted + (config.suffix || '');
}

// Keep old name for backward compatibility
export const formatCurrency = formatPrice;

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const hourText = hours === 1 ? '1 hora' : `${hours} horas`;
  if (remaining === 0) return hourText;
  return `${hourText} ${remaining} minutos`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Time utilities for availability
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function generateTimeOptions(
  start: number = 0,
  end: number = 1440,
  interval: number = 30
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let mins = start; mins < end; mins += interval) {
    const value = minutesToTime(mins);
    options.push({ value, label: formatTime(value) });
  }
  return options;
}
