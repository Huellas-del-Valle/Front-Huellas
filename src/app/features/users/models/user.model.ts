import { UserRole } from '../../../core/models/auth.models';

export interface User {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly phone?: string;
  readonly identification?: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface CreateUserDto {
  readonly fullName: string;
  readonly email: string;
  readonly password?: string;
  readonly role: UserRole;
  readonly phone?: string;
  readonly identification?: string;
  readonly isActive?: boolean;
}

export interface UpdateUserDto {
  readonly fullName?: string;
  readonly email?: string;
  readonly password?: string;
  readonly role?: UserRole;
  readonly phone?: string;
  readonly identification?: string;
  readonly isActive?: boolean;
}

export interface UpdateUserStatusDto {
  readonly isActive: boolean;
  readonly status?: 'ACTIVE' | 'INACTIVE';
}

export interface UserFilterParams {
  readonly search?: string;
  readonly role?: UserRole | 'ALL';
  readonly status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  readonly page?: number;
  readonly limit?: number;
}

export interface RoleDescription {
  readonly role: UserRole;
  readonly title: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly badgeClass: string;
}

export const ROLE_DESCRIPTIONS: Record<UserRole, RoleDescription> = {
  ADMIN: {
    role: 'ADMIN',
    title: 'Administrador del Sistema',
    description: 'Control total de la plataforma: gestión de usuarios y roles, configuración del sistema, auditoría y reportes globales.',
    permissions: [
      'Gestión integral de usuarios y asignación de roles',
      'Acceso a reportes gerenciales y auditoría de eventos',
      'Configuración institucional y políticas de seguridad',
      'Supervisión de módulos clínicos, inventario y caja'
    ],
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  VETERINARIO: {
    role: 'VETERINARIO',
    title: 'Médico Veterinario',
    description: 'Gestión asistencial y clínica: consulta veterinaria, historias clínicas de pacientes, planes de vacunación, prescripción médica y agenda de citas.',
    permissions: [
      'Creación y edición de historias clínicas y anexos',
      'Registro de esquemas de vacunación y desparasitación',
      'Emisión de fórmulas y prescripción de medicamentos',
      'Consulta de pacientes y gestión de agenda médica'
    ],
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200'
  },
  RECEPCIONISTA: {
    role: 'RECEPCIONISTA',
    title: 'Recepción y Caja',
    description: 'Operación diaria y atención al cliente: admisión de mascotas y propietarios, agendamiento de citas, facturación en caja POS y venta de productos.',
    permissions: [
      'Registro y actualización de propietarios y mascotas',
      'Agendamiento y reprogramación de citas médicas',
      'Facturación POS, cobros y aperturas/cierres de caja',
      'Consulta de existencias y venta de insumos en mostrador'
    ],
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200'
  }
};

export const INITIAL_MOCK_USERS: readonly User[] = [
  {
    id: 'usr-admin-01',
    fullName: 'Dr. Roberto Mendoza',
    email: 'admin@huellasdelvalle.com',
    role: 'ADMIN',
    isActive: true,
    phone: '+57 310 555 0101',
    identification: '1098234567',
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'usr-vet-01',
    fullName: 'Dra. Camila Torres',
    email: 'veterinario@huellasdelvalle.com',
    role: 'VETERINARIO',
    isActive: true,
    phone: '+57 312 444 0202',
    identification: '1098345678',
    createdAt: '2026-01-15T09:30:00.000Z'
  },
  {
    id: 'usr-rec-01',
    fullName: 'Sandra Morales',
    email: 'recepcion@huellasdelvalle.com',
    role: 'RECEPCIONISTA',
    isActive: true,
    phone: '+57 315 333 0303',
    identification: '1098456789',
    createdAt: '2026-02-01T10:00:00.000Z'
  },
  {
    id: 'usr-vet-02',
    fullName: 'Dr. Alejandro Peña',
    email: 'alejandro.pena@huellasdelvalle.com',
    role: 'VETERINARIO',
    isActive: false,
    phone: '+57 318 222 0404',
    identification: '1098567890',
    createdAt: '2026-02-10T11:15:00.000Z'
  },
  {
    id: 'usr-rec-02',
    fullName: 'Carlos Gómez',
    email: 'carlos.gomez@huellasdelvalle.com',
    role: 'RECEPCIONISTA',
    isActive: true,
    phone: '+57 301 777 0505',
    identification: '1098678901',
    createdAt: '2026-02-18T14:20:00.000Z'
  }
];
