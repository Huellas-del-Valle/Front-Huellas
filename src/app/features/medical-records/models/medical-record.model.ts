import { Pet } from '../../patients/models/pet.model';

export type MedicalRecordType =
  | 'CONSULTA'
  | 'CONTROL'
  | 'URGENCIA'
  | 'CIRUGIA'
  | 'VACUNACION'
  | 'EXAMEN';

export interface MedicalRecordTypeMeta {
  readonly label: string;
  readonly badgeClass: string;
  readonly dotClass: string;
}

export const MEDICAL_RECORD_TYPE_CONFIG: Record<MedicalRecordType, MedicalRecordTypeMeta> = {
  CONSULTA: {
    label: 'Consulta General',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500'
  },
  CONTROL: {
    label: 'Control',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    dotClass: 'bg-sky-500'
  },
  URGENCIA: {
    label: 'Urgencia',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500'
  },
  CIRUGIA: {
    label: 'Cirugía',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500'
  },
  VACUNACION: {
    label: 'Vacunación',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500'
  },
  EXAMEN: {
    label: 'Examen / Lab',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    dotClass: 'bg-slate-500'
  }
};

export interface PrescriptionItem {
  readonly medication: string;
  readonly dosage: string;
  readonly frequency: string;
  readonly duration: string;
}

export interface MedicalRecord {
  readonly id: string;
  readonly petId: string;
  readonly recordType: MedicalRecordType;
  readonly recordDate: string;
  readonly veterinarianId: string;
  readonly veterinarianName: string;
  readonly symptoms: string;
  readonly weightKg: number | null;
  readonly temperatureC: number | null;
  readonly diagnosis: string;
  readonly treatment: string;
  readonly prescriptions: readonly PrescriptionItem[];
  readonly notes?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface CreateMedicalRecordDto {
  readonly petId: string;
  readonly recordType: MedicalRecordType;
  readonly recordDate?: string;
  readonly veterinarianId: string;
  readonly veterinarianName?: string;
  readonly symptoms: string;
  readonly weightKg: number | null;
  readonly temperatureC: number | null;
  readonly diagnosis: string;
  readonly treatment: string;
  readonly prescriptions: readonly PrescriptionItem[];
  readonly notes?: string;
}

export type UpdateMedicalRecordDto = Partial<Omit<CreateMedicalRecordDto, 'petId'>>;

export interface MedicalRecordFilters {
  readonly date?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly recordType?: MedicalRecordType | 'ALL';
}

export interface VeterinarianOption {
  readonly id: string;
  readonly fullName: string;
  readonly specialty: string;
}

export const MOCK_VETERINARIANS: readonly VeterinarianOption[] = [
  { id: 'vet-1', fullName: 'Dra. Laura Méndez', specialty: 'Medicina Interna' },
  { id: 'vet-2', fullName: 'Dr. Carlos Mendoza', specialty: 'Cirugía y Urgencias' },
  { id: 'vet-3', fullName: 'Dra. Sofía Ramírez', specialty: 'Dermatología Veterinaria' }
];

export const MOCK_PATIENT_FALLBACK: Pet = {
  id: 'pet-1',
  uniqueCode: 'HUV-2026-0001',
  name: 'Max',
  species: 'CANINO',
  breed: 'Golden Retriever',
  birthDate: '2022-04-15',
  estimatedAge: '4 años',
  gender: 'MACHO',
  color: 'Dorado',
  microchip: '985112004589321',
  clientId: 'cli-1',
  client: {
    id: 'cli-1',
    identification: '1088234567',
    fullName: 'María Camila Gómez',
    phone: '3124567890'
  }
};

export const MOCK_PATIENTS_CATALOG: readonly Pet[] = [
  MOCK_PATIENT_FALLBACK,
  {
    id: 'pet-2',
    uniqueCode: 'HUV-2026-0002',
    name: 'Luna',
    species: 'FELINO',
    breed: 'Siamés',
    birthDate: '2023-08-10',
    estimatedAge: '3 años',
    gender: 'HEMBRA',
    color: 'Crema y marrón',
    clientId: 'cli-2',
    client: {
      id: 'cli-2',
      identification: '1090112233',
      fullName: 'Andrés Felipe Rojas',
      phone: '3159876543'
    }
  }
];

export const MOCK_MEDICAL_RECORDS: readonly MedicalRecord[] = [
  {
    id: 'rec-003',
    petId: 'pet-1',
    recordType: 'CONSULTA',
    recordDate: '2026-11-20T10:30:00Z',
    veterinarianId: 'vet-1',
    veterinarianName: 'Dra. Laura Méndez',
    symptoms: 'Decaimiento leve, disminución del apetito durante las últimas 24 horas y estornudos ocasionales.',
    weightKg: 28.4,
    temperatureC: 38.7,
    diagnosis: 'Traqueobronquitis infecciosa leve (tos de las perreras en fase inicial).',
    treatment: 'Manejo ambulatorio con antiinflamatorio, hidratación oral y reposo relativo por 5 días.',
    prescriptions: [
      {
        medication: 'Meloxicam Veterinario 2 mg',
        dosage: '1 tableta',
        frequency: 'Cada 24 horas',
        duration: '4 días'
      },
      {
        medication: 'Doxiciclina 100 mg',
        dosage: '1.5 tabletas',
        frequency: 'Cada 12 horas',
        duration: '7 días'
      }
    ],
    createdAt: '2026-11-20T10:45:00Z'
  },
  {
    id: 'rec-002',
    petId: 'pet-1',
    recordType: 'CONTROL',
    recordDate: '2026-10-05T15:00:00Z',
    veterinarianId: 'vet-2',
    veterinarianName: 'Dr. Carlos Mendoza',
    symptoms: 'Control post-operatorio de profilaxis dental. Encías sin signos de inflamación ni sangrado.',
    weightKg: 28.0,
    temperatureC: 38.4,
    diagnosis: 'Evolución post-operatoria satisfactoria, cavidad oral sana.',
    treatment: 'Continuar higiene dental semanal con cepillado enzimático.',
    prescriptions: [],
    createdAt: '2026-10-05T15:20:00Z'
  },
  {
    id: 'rec-001',
    petId: 'pet-1',
    recordType: 'VACUNACION',
    recordDate: '2026-08-14T09:15:00Z',
    veterinarianId: 'vet-1',
    veterinarianName: 'Dra. Laura Méndez',
    symptoms: 'Paciente asintomático, acude a refuerzo anual de esquema de inmunización.',
    weightKg: 27.6,
    temperatureC: 38.5,
    diagnosis: 'Paciente clínicamente sano apto para inmunización anual.',
    treatment: 'Aplicación subcutánea de refuerzo Pentavalente + Antirrábica.',
    prescriptions: [
      {
        medication: 'Observación post-vacunal',
        dosage: 'N/A',
        frequency: 'Única',
        duration: '24 horas'
      }
    ],
    createdAt: '2026-08-14T09:30:00Z'
  },
  {
    id: 'rec-004',
    petId: 'pet-2',
    recordType: 'URGENCIA',
    recordDate: '2026-11-18T18:10:00Z',
    veterinarianId: 'vet-2',
    veterinarianName: 'Dr. Carlos Mendoza',
    symptoms: 'Vómitos agudos (3 episodios) tras ingesta accidental de planta ornamental.',
    weightKg: 4.1,
    temperatureC: 38.9,
    diagnosis: 'Gastritis aguda por irritación alimentaria.',
    treatment: 'Fluidoterapia subcutánea y antiemético parenteral en consultorio.',
    prescriptions: [
      {
        medication: 'Maropitant 16 mg',
        dosage: '1/4 tableta',
        frequency: 'Cada 24 horas',
        duration: '3 días'
      }
    ],
    createdAt: '2026-11-18T18:40:00Z'
  }
];
