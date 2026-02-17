export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  profileId?: string;
}

export interface Profile {
  id: string;
  userId: string;
  slug: string;
  title?: string;
  bio?: string;
  profession?: string;
  phone?: string;
  avatar?: string;
  published?: boolean;
}

export interface Service {
  id: string;
  profileId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number | string;
  currency: string;
  isActive: boolean;
}

export interface Booking {
  id: string;
  profileId: string;
  serviceId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes?: string;
  service?: Service;
  profile?: Profile;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  profileId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
