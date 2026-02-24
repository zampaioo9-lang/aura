export interface AvailabilitySlot {
  id: string;
  profileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlotData {
  profileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UpdateSlotData {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface BulkCreateData {
  profileId: string;
  slots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

export interface BookingSettings {
  profileId:          string;
  bufferMinutes:      number;
  advanceBookingDays: number;
  minAdvanceHours:    number;
  cancellationHours:  number;
  autoConfirm:        boolean;
  timezone:           string;
  language:           string;
}

export interface ScheduleBlock {
  id:        string;
  profileId: string;
  startDate: string;
  endDate:   string;
  startTime: string | null;
  endTime:   string | null;
  isAllDay:  boolean;
  reason:    string | null;
  createdAt: string;
}

export interface ServiceAvailabilitySlot {
  id:        string;
  serviceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
  isActive:  boolean;
}

export const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const TIMEZONES = [
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Buenos_Aires', 'America/Caracas', 'America/Guayaquil',
  'Europe/Madrid', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
];

export const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
];
