export interface ClientPetSummary {
  readonly id: string;
  readonly uniqueCode: string; // ej: HUV-2026-0001
  readonly name: string;
  readonly species: 'CANINO' | 'FELINO' | 'OTRO';
  readonly breed: string;
  readonly gender: 'MACHO' | 'HEMBRA';
  readonly age?: string;
  readonly birthDate?: string;
}

export interface ClientAttentionSummary {
  readonly id: string;
  readonly date: string;
  readonly petName: string;
  readonly petId: string;
  readonly reason: string;
  readonly veterinarianName: string;
  readonly diagnosis?: string;
  readonly status: 'COMPLETADA' | 'EN_CURSO' | 'CANCELADA';
}

export interface Client {
  readonly id: string;
  readonly identification: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly dataProcessingAuthorized: boolean;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly pets?: readonly ClientPetSummary[];
  readonly clinicalHistory?: readonly ClientAttentionSummary[];
}

export interface CreateClientDto {
  readonly identification: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly dataProcessingAuthorized: boolean;
}

export type UpdateClientDto = Partial<CreateClientDto>;

export const INITIAL_MOCK_CLIENTS: readonly Client[] = [
  {
    id: 'cli-001',
    identification: '1088000111',
    fullName: 'Carlos Andrés Gómez',
    phone: '3001234567',
    email: 'carlos.gomez@gmail.com',
    address: 'Calle 15 # 24-30, Barrio Laureles',
    dataProcessingAuthorized: true,
    createdAt: '2026-01-10T10:00:00.000Z',
    pets: [
      {
        id: 'pet-001',
        uniqueCode: 'HUV-2026-0001',
        name: 'Max',
        species: 'CANINO',
        breed: 'Golden Retriever',
        gender: 'MACHO',
        age: '3 años'
      },
      {
        id: 'pet-002',
        uniqueCode: 'HUV-2026-0002',
        name: 'Luna',
        species: 'FELINO',
        breed: 'Siamés',
        gender: 'HEMBRA',
        age: '1 año'
      }
    ],
    clinicalHistory: [
      {
        id: 'att-001',
        date: '2026-02-15T09:30:00.000Z',
        petName: 'Max',
        petId: 'pet-001',
        reason: 'Vacunación Anual Antirrábica',
        veterinarianName: 'Dra. Camila Torres',
        diagnosis: 'Paciente en óptimo estado de salud general',
        status: 'COMPLETADA'
      },
      {
        id: 'att-002',
        date: '2026-01-20T11:00:00.000Z',
        petName: 'Luna',
        petId: 'pet-002',
        reason: 'Control Postoperatorio de Esterilización',
        veterinarianName: 'Dr. Roberto Mendoza',
        diagnosis: 'Cicatrización adecuada sin signos de infección',
        status: 'COMPLETADA'
      }
    ]
  },
  {
    id: 'cli-002',
    identification: '1098234123',
    fullName: 'María Fernanda Ruiz',
    phone: '3109876543',
    email: 'maria.ruiz@hotmail.com',
    address: 'Carrera 8 # 45-12, Sector El Poblado',
    dataProcessingAuthorized: true,
    createdAt: '2026-01-18T14:20:00.000Z',
    pets: [
      {
        id: 'pet-003',
        uniqueCode: 'HUV-2026-0003',
        name: 'Rocky',
        species: 'CANINO',
        breed: 'Bulldog Francés',
        gender: 'MACHO',
        age: '2 años'
      }
    ],
    clinicalHistory: [
      {
        id: 'att-003',
        date: '2026-02-05T16:00:00.000Z',
        petName: 'Rocky',
        petId: 'pet-003',
        reason: 'Consulta Dermatológica por prurito',
        veterinarianName: 'Dra. Camila Torres',
        diagnosis: 'Dermatitis alérgica por picadura de pulga',
        status: 'COMPLETADA'
      }
    ]
  },
  {
    id: 'cli-003',
    identification: '1075678912',
    fullName: 'Juan Pablo Herrera',
    phone: '3154567890',
    email: 'juan.herrera@yahoo.com',
    address: 'Avenida Circunvalar # 10-25',
    dataProcessingAuthorized: true,
    createdAt: '2026-02-01T08:45:00.000Z',
    pets: [
      {
        id: 'pet-004',
        uniqueCode: 'HUV-2026-0004',
        name: 'Milo',
        species: 'FELINO',
        breed: 'Persa',
        gender: 'MACHO',
        age: '4 años'
      }
    ],
    clinicalHistory: [
      {
        id: 'att-004',
        date: '2026-02-18T10:15:00.000Z',
        petName: 'Milo',
        petId: 'pet-004',
        reason: 'Profilaxis dental y chequeo general',
        veterinarianName: 'Dr. Roberto Mendoza',
        diagnosis: 'Gingivitis leve tratada con éxito',
        status: 'COMPLETADA'
      }
    ]
  },
  {
    id: 'cli-004',
    identification: '1094561234',
    fullName: 'Valentina Castro',
    phone: '3201122334',
    email: 'vale.castro@gmail.com',
    address: 'Manzana 4 Casa 12, Conjunto Los Rosales',
    dataProcessingAuthorized: true,
    createdAt: '2026-02-12T15:30:00.000Z',
    pets: [
      {
        id: 'pet-005',
        uniqueCode: 'HUV-2026-0005',
        name: 'Kira',
        species: 'CANINO',
        breed: 'Husky Siberiano',
        gender: 'HEMBRA',
        age: '1 año y medio'
      }
    ],
    clinicalHistory: []
  }
];
