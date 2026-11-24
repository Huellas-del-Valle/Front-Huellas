export type ServiceTypeFilter =
  | 'ALL'
  | 'CONSULTA'
  | 'VACUNACION'
  | 'CIRUGIA'
  | 'LABORATORIO'
  | 'FARMACIA';

export type CashStatusFilter = 'ALL' | 'ABIERTA' | 'CERRADA' | 'ANULADA';

export interface ReportFilters {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly veterinarianId?: string;
  readonly serviceType?: ServiceTypeFilter;
  readonly cashStatus?: CashStatusFilter;
}

export interface MonthlyRevenuePoint {
  readonly month: string;
  readonly label: string;
  readonly revenue: number;
  readonly consultations: number;
}

export interface VetConsultationVolume {
  readonly veterinarianId: string;
  readonly veterinarianName: string;
  readonly specialty: string;
  readonly consultationsCount: number;
  readonly revenueGenerated: number;
}

export interface ReportsDashboardData {
  readonly totalRevenue: number;
  readonly totalConsultations: number;
  readonly averageTicket: number;
  readonly cashClosedCount: number;
  readonly monthlyRevenue: readonly MonthlyRevenuePoint[];
  readonly consultationsByVet: readonly VetConsultationVolume[];
}

export type AuditEventType =
  | 'ALL'
  | 'LOGIN'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'CASH_CLOSE';

export interface AuditLogFilters {
  readonly employeeId?: string;
  readonly startDateTime?: string;
  readonly endDateTime?: string;
  readonly eventType?: AuditEventType;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly employeeRole: string;
  readonly eventType: Exclude<AuditEventType, 'ALL'>;
  readonly module: string;
  readonly actionSummary: string;
  readonly ipAddress: string;
  readonly deviceInfo: string;
  readonly payload: Record<string, unknown>;
}

export interface PaginatedAuditLogs {
  readonly items: readonly AuditLogEntry[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export interface FilterOption {
  readonly id: string;
  readonly name: string;
}

export const MOCK_VETERINARIANS_FILTER: readonly FilterOption[] = [
  { id: 'vet-1', name: 'Dra. Laura Méndez' },
  { id: 'vet-2', name: 'Dr. Carlos Mendoza' },
  { id: 'vet-3', name: 'Dra. Sofía Ramírez' }
];

export const MOCK_EMPLOYEES_FILTER: readonly FilterOption[] = [
  { id: 'emp-1', name: 'Admin Principal' },
  { id: 'vet-1', name: 'Dra. Laura Méndez' },
  { id: 'vet-2', name: 'Dr. Carlos Mendoza' },
  { id: 'rec-1', name: 'Recep. Mariana López' }
];

export const MOCK_REPORTS_DASHBOARD: ReportsDashboardData = {
  totalRevenue: 48650000,
  totalConsultations: 312,
  averageTicket: 155929,
  cashClosedCount: 28,
  monthlyRevenue: [
    { month: '2026-06', label: 'Jun', revenue: 6400000, consultations: 42 },
    { month: '2026-07', label: 'Jul', revenue: 7150000, consultations: 48 },
    { month: '2026-08', label: 'Ago', revenue: 7850000, consultations: 51 },
    { month: '2026-09', label: 'Sep', revenue: 8400000, consultations: 54 },
    { month: '2026-10', label: 'Oct', revenue: 9100000, consultations: 57 },
    { month: '2026-11', label: 'Nov', revenue: 9750000, consultations: 60 }
  ],
  consultationsByVet: [
    {
      veterinarianId: 'vet-1',
      veterinarianName: 'Dra. Laura Méndez',
      specialty: 'Medicina Interna',
      consultationsCount: 128,
      revenueGenerated: 19800000
    },
    {
      veterinarianId: 'vet-2',
      veterinarianName: 'Dr. Carlos Mendoza',
      specialty: 'Cirugía y Urgencias',
      consultationsCount: 104,
      revenueGenerated: 17950000
    },
    {
      veterinarianId: 'vet-3',
      veterinarianName: 'Dra. Sofía Ramírez',
      specialty: 'Dermatología',
      consultationsCount: 80,
      revenueGenerated: 10900000
    }
  ]
};

export const MOCK_AUDIT_LOGS: readonly AuditLogEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2026-11-24T16:40:00Z',
    employeeId: 'emp-1',
    employeeName: 'Admin Principal',
    employeeRole: 'ADMIN',
    eventType: 'EXPORT',
    module: 'Reportes',
    actionSummary: 'Exportación de reporte gerencial financiero en formato XLSX',
    ipAddress: '190.24.112.45',
    deviceInfo: 'Chrome 131.0 / Windows 11 Desktop',
    payload: { format: 'xlsx', startDate: '2026-11-01', endDate: '2026-11-24', cashStatus: 'CERRADA' }
  },
  {
    id: 'aud-002',
    timestamp: '2026-11-24T15:15:00Z',
    employeeId: 'rec-1',
    employeeName: 'Recep. Mariana López',
    employeeRole: 'RECEPCIONISTA',
    eventType: 'CASH_CLOSE',
    module: 'Caja y Facturación',
    actionSummary: 'Cierre de caja turno tarde #CC-2026-1124',
    ipAddress: '192.168.1.42',
    deviceInfo: 'Edge 130.0 / Windows 10 POS',
    payload: { cashRegisterId: 'CC-2026-1124', totalCash: 1450000, totalCard: 980000, difference: 0 }
  },
  {
    id: 'aud-003',
    timestamp: '2026-11-24T14:05:00Z',
    employeeId: 'vet-1',
    employeeName: 'Dra. Laura Méndez',
    employeeRole: 'VETERINARIO',
    eventType: 'CREATE',
    module: 'Historia Clínica',
    actionSummary: 'Registro de consulta clínica para paciente HUV-2026-0001 (Max)',
    ipAddress: '192.168.1.18',
    deviceInfo: 'Chrome 131.0 / macOS Sonoma',
    payload: { petId: 'pet-1', uniqueCode: 'HUV-2026-0001', diagnosis: 'Traqueobronquitis leve' }
  },
  {
    id: 'aud-004',
    timestamp: '2026-11-24T11:30:00Z',
    employeeId: 'vet-2',
    employeeName: 'Dr. Carlos Mendoza',
    employeeRole: 'VETERINARIO',
    eventType: 'UPDATE',
    module: 'Agenda',
    actionSummary: 'Cambio de estado de cita #APT-884 a ATENDIDA',
    ipAddress: '192.168.1.24',
    deviceInfo: 'Safari 18.0 / iPadOS',
    payload: { appointmentId: 'APT-884', previousStatus: 'CONFIRMADA', newStatus: 'ATENDIDA' }
  },
  {
    id: 'aud-005',
    timestamp: '2026-11-24T09:00:00Z',
    employeeId: 'emp-1',
    employeeName: 'Admin Principal',
    employeeRole: 'ADMIN',
    eventType: 'LOGIN',
    module: 'Autenticación',
    actionSummary: 'Inicio de sesión exitoso en panel administrativo',
    ipAddress: '190.24.112.45',
    deviceInfo: 'Chrome 131.0 / Windows 11 Desktop',
    payload: { method: 'JWT_PASSWORD', mfaVerified: true }
  },
  {
    id: 'aud-006',
    timestamp: '2026-11-23T17:50:00Z',
    employeeId: 'rec-1',
    employeeName: 'Recep. Mariana López',
    employeeRole: 'RECEPCIONISTA',
    eventType: 'DELETE',
    module: 'Agenda',
    actionSummary: 'Anulación de reserva duplicada #APT-870',
    ipAddress: '192.168.1.42',
    deviceInfo: 'Edge 130.0 / Windows 10 POS',
    payload: { appointmentId: 'APT-870', reason: 'Solicitud de propietario por reprogramación' }
  },
  {
    id: 'aud-007',
    timestamp: '2026-11-23T13:20:00Z',
    employeeId: 'vet-1',
    employeeName: 'Dra. Laura Méndez',
    employeeRole: 'VETERINARIO',
    eventType: 'EXPORT',
    module: 'Historia Clínica',
    actionSummary: 'Descarga de expediente clínico PDF de paciente HUV-2026-0002',
    ipAddress: '192.168.1.18',
    deviceInfo: 'Chrome 131.0 / macOS Sonoma',
    payload: { petId: 'pet-2', format: 'pdf' }
  }
];
