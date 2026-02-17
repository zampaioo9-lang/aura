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

export const DAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado',
];

export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
