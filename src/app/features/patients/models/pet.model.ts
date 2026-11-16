export type PetSpecies = 'CANINO' | 'FELINO' | 'OTRO';

export type PetGender = 'MACHO' | 'HEMBRA';

export interface PetOwnerSummary {
  readonly id: string;
  readonly identification: string;
  readonly fullName: string;
  readonly phone?: string;
}

export interface Pet {
  readonly id: string;
  readonly uniqueCode: string; // Ej: HUV-2026-0001 (Inmutable - RNF-04)
  readonly name: string;
  readonly species: PetSpecies;
  readonly breed: string;
  readonly birthDate?: string;
  readonly estimatedAge?: string;
  readonly gender: PetGender;
  readonly color: string;
  readonly microchip?: string;
  readonly clientId: string;
  readonly client?: PetOwnerSummary;
  readonly isActive?: boolean;
  readonly createdAt?: string;
}

export interface CreatePetDto {
  readonly code?: string;
  readonly name: string;
  readonly species: PetSpecies;
  readonly breed: string;
  readonly birthDate?: string;
  readonly estimatedAge?: string;
  readonly gender: PetGender;
  readonly color: string;
  readonly microchip?: string;
  readonly clientId: string;
}

export type UpdatePetDto = Partial<CreatePetDto>;
