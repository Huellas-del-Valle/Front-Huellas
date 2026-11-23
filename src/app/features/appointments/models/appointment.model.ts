export type AppointmentStatus =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'NO_ASISTIDA';

export type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH';

export interface VeterinarianSummary {
  readonly id: string;
  readonly fullName: string;
  readonly name?: string;
  readonly specialty?: string;
  readonly email?: string;
}

export interface ClientSummary {
  readonly id: string;
  readonly fullName: string;
  readonly phone?: string;
}

export interface PetSummary {
  readonly id: string;
  readonly name: string;
  readonly species: string;
  readonly breed?: string;
  readonly clientName?: string;
  readonly clientPhone?: string;
}

export interface Appointment {
  readonly id: string;
  readonly petId: string;
  readonly petName?: string;
  readonly petSpecies?: string;
  readonly veterinarianId: string;
  readonly veterinarian?: VeterinarianSummary;
  readonly veterinarianName?: string;
  readonly client?: ClientSummary;
  readonly ownerName?: string;
  readonly startDateTime: string; // ISO 8601
  readonly endDateTime: string;   // ISO 8601
  readonly date?: string;
  readonly timeSlot?: string;
  readonly reason: string;
  readonly status: AppointmentStatus;
  readonly notes?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface CreateAppointmentDto {
  readonly petId: string;
  readonly veterinarianId: string;
  readonly startDateTime: string;
  readonly endDateTime: string;
  readonly reason: string;
  readonly date?: string;
  readonly timeSlot?: string;
}

export interface UpdateAppointmentDto {
  readonly startDateTime?: string;
  readonly endDateTime?: string;
  readonly reason?: string;
  readonly status?: AppointmentStatus;
  readonly veterinarianId?: string;
  readonly timeSlot?: string;
}

export interface TimeSlotAvailability {
  readonly time: string; // ej: "09:00"
  readonly available: boolean;
  readonly timeSlot?: string;
  readonly isAvailable?: boolean;
  readonly existingAppointmentId?: string;
  readonly appointmentId?: string;
  readonly petName?: string;
}

export interface AppointmentStatusConfig {
  readonly status: AppointmentStatus;
  readonly label: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly borderClass: string;
  readonly badgeClass: string;
  readonly dotClass: string;
}

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, AppointmentStatusConfig> = {
  PENDIENTE: {
    status: 'PENDIENTE',
    label: 'Pendiente',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-300',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500'
  },
  CONFIRMADA: {
    status: 'CONFIRMADA',
    label: 'Confirmada',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-300',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    dotClass: 'bg-sky-500'
  },
  ATENDIDA: {
    status: 'ATENDIDA',
    label: 'Atendida',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500'
  },
  CANCELADA: {
    status: 'CANCELADA',
    label: 'Cancelada',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-300',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500'
  },
  NO_ASISTIDA: {
    status: 'NO_ASISTIDA',
    label: 'No Asistida',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400'
  }
};

export const AVAILABLE_VETERINARIANS: readonly VeterinarianSummary[] = [
  { id: 'vet-001', fullName: 'Dra. Camila Torres', name: 'Dra. Camila Torres', specialty: 'Cirugía General', email: 'camila.torres@huellasdelvalle.com' },
  { id: 'vet-002', fullName: 'Dr. Roberto Mendoza', name: 'Dr. Roberto Mendoza', specialty: 'Medicina Interna', email: 'roberto.mendoza@huellasdelvalle.com' },
  { id: 'vet-003', fullName: 'Dr. Alejandro Peña', name: 'Dr. Alejandro Peña', specialty: 'Dermatología', email: 'alejandro.pena@huellasdelvalle.com' }
];

export const AVAILABLE_PATIENTS: readonly PetSummary[] = [
  { id: 'pet-001', name: 'Max', species: 'CANINO', breed: 'Golden Retriever', clientName: 'Carlos Gómez', clientPhone: '3001234567' },
  { id: 'pet-002', name: 'Luna', species: 'FELINO', breed: 'Siamés', clientName: 'Carlos Gómez', clientPhone: '3001234567' },
  { id: 'pet-003', name: 'Rocky', species: 'CANINO', breed: 'Bulldog Francés', clientName: 'María Fernanda Ruiz', clientPhone: '3109876543' },
  { id: 'pet-004', name: 'Milo', species: 'FELINO', breed: 'Persa', clientName: 'Juan Pablo Herrera', clientPhone: '3154567890' },
  { id: 'pet-005', name: 'Kira', species: 'CANINO', breed: 'Husky Siberiano', clientName: 'Valentina Castro', clientPhone: '3201122334' }
];

export const STANDARD_TIME_SLOTS: readonly string[] = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30'
];

export const INITIAL_MOCK_APPOINTMENTS: readonly Appointment[] = [
  {
    id: 'apt-001',
    petId: 'pet-001',
    petName: 'Max',
    petSpecies: 'CANINO',
    veterinarianId: 'vet-001',
    veterinarian: { id: 'vet-001', fullName: 'Dra. Camila Torres', name: 'Dra. Camila Torres', specialty: 'Cirugía General' },
    veterinarianName: 'Dra. Camila Torres',
    client: { id: 'cli-001', fullName: 'Carlos Gómez', phone: '3001234567' },
    ownerName: 'Carlos Gómez',
    startDateTime: '2026-10-22T09:00:00Z',
    endDateTime: '2026-10-22T09:30:00Z',
    date: '2026-10-22',
    timeSlot: '09:00 - 09:30',
    reason: 'Consulta médica general y chequeo preventivo',
    status: 'CONFIRMADA'
  },
  {
    id: 'apt-002',
    petId: 'pet-002',
    petName: 'Luna',
    petSpecies: 'FELINO',
    veterinarianId: 'vet-001',
    veterinarian: { id: 'vet-001', fullName: 'Dra. Camila Torres', name: 'Dra. Camila Torres', specialty: 'Cirugía General' },
    veterinarianName: 'Dra. Camila Torres',
    client: { id: 'cli-001', fullName: 'Carlos Gómez', phone: '3001234567' },
    ownerName: 'Carlos Gómez',
    startDateTime: '2026-10-22T14:00:00Z',
    endDateTime: '2026-10-22T14:30:00Z',
    date: '2026-10-22',
    timeSlot: '14:00 - 14:30',
    reason: 'Vacunación y desparasitación',
    status: 'PENDIENTE'
  },
  {
    id: 'apt-003',
    petId: 'pet-003',
    petName: 'Rocky',
    petSpecies: 'CANINO',
    veterinarianId: 'vet-002',
    veterinarian: { id: 'vet-002', fullName: 'Dr. Roberto Mendoza', name: 'Dr. Roberto Mendoza', specialty: 'Medicina Interna' },
    veterinarianName: 'Dr. Roberto Mendoza',
    client: { id: 'cli-002', fullName: 'María Fernanda Ruiz', phone: '3109876543' },
    ownerName: 'María Fernanda Ruiz',
    startDateTime: '2026-10-21T11:00:00Z',
    endDateTime: '2026-10-21T11:30:00Z',
    date: '2026-10-21',
    timeSlot: '11:00 - 11:30',
    reason: 'Control dermatológico',
    status: 'ATENDIDA'
  },
  {
    id: 'apt-004',
    petId: 'pet-004',
    petName: 'Milo',
    petSpecies: 'FELINO',
    veterinarianId: 'vet-003',
    veterinarian: { id: 'vet-003', fullName: 'Dr. Alejandro Peña', name: 'Dr. Alejandro Peña', specialty: 'Dermatología' },
    veterinarianName: 'Dr. Alejandro Peña',
    client: { id: 'cli-003', fullName: 'Juan Pablo Herrera', phone: '3154567890' },
    ownerName: 'Juan Pablo Herrera',
    startDateTime: '2026-10-23T10:00:00Z',
    endDateTime: '2026-10-23T10:30:00Z',
    date: '2026-10-23',
    timeSlot: '10:00 - 10:30',
    reason: 'Revisión dental y limpieza',
    status: 'CANCELADA'
  },
  {
    id: 'apt-005',
    petId: 'pet-005',
    petName: 'Kira',
    petSpecies: 'CANINO',
    veterinarianId: 'vet-002',
    veterinarian: { id: 'vet-002', fullName: 'Dr. Roberto Mendoza', name: 'Dr. Roberto Mendoza', specialty: 'Medicina Interna' },
    veterinarianName: 'Dr. Roberto Mendoza',
    client: { id: 'cli-004', fullName: 'Valentina Castro', phone: '3201122334' },
    ownerName: 'Valentina Castro',
    startDateTime: '2026-10-24T15:30:00Z',
    endDateTime: '2026-10-24T16:00:00Z',
    date: '2026-10-24',
    timeSlot: '15:30 - 16:00',
    reason: 'Seguimiento post-operatorio',
    status: 'NO_ASISTIDA'
  }
];
