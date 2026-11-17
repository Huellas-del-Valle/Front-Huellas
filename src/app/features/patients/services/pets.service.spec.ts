import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PetsService } from './pets.service';
import { environment } from '../../../../environments/environment';
import { CreatePetDto, Pet, PetOwnerSummary } from '../models/pet.model';

describe('PetsService', () => {
  let service: PetsService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PetsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PetsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a pet via POST /api/v1/pets', () => {
    const dto: CreatePetDto = {
      name: 'Max',
      species: 'CANINO',
      breed: 'Labrador',
      gender: 'MACHO',
      color: 'Dorado',
      clientId: 'client-123'
    };

    const mockResponse: Pet = {
      id: 'pet-1',
      uniqueCode: 'HUV-2026-0001',
      ...dto
    };

    service.createPet(dto).subscribe((pet) => {
      expect(pet.uniqueCode).toBe('HUV-2026-0001');
      expect(pet.name).toBe('Max');
    });

    const req = httpMock.expectOne(`${baseUrl}/pets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });

  it('should retrieve a pet by ID via GET /api/v1/pets/:id', () => {
    const mockPet: Pet = {
      id: 'pet-1',
      uniqueCode: 'HUV-2026-0001',
      name: 'Luna',
      species: 'FELINO',
      breed: 'Siamés',
      gender: 'HEMBRA',
      color: 'Crema',
      clientId: 'client-123'
    };

    service.getPetById('pet-1').subscribe((pet) => {
      expect(pet.id).toBe('pet-1');
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPet);
  });

  it('should retrieve pets by client via GET /api/v1/clients/:id/pets', () => {
    const mockPet: Pet = {
      id: 'pet-1',
      uniqueCode: 'HUV-2026-0001',
      name: 'Luna',
      species: 'FELINO',
      breed: 'Siamés',
      gender: 'HEMBRA',
      color: 'Crema',
      clientId: 'client-123'
    };

    service.getPetsByClient('client-123').subscribe((pets) => {
      expect(pets.length).toBe(1);
      expect(pets[0].id).toBe('pet-1');
    });

    const req = httpMock.expectOne(`${baseUrl}/clients/client-123/pets`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPet]);
  });

  it('should retrieve all pets via GET /api/v1/pets without search parameter', () => {
    const mockPets: Pet[] = [
      {
        id: 'pet-1',
        uniqueCode: 'HUV-2026-0001',
        name: 'Max',
        species: 'CANINO',
        breed: 'Labrador',
        gender: 'MACHO',
        color: 'Dorado',
        clientId: 'client-123'
      }
    ];

    service.getAllPets().subscribe((pets) => {
      expect(pets.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/pets`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('search')).toBe(false);
    req.flush(mockPets);
  });

  it('should retrieve all pets via GET /api/v1/pets with search parameter', () => {
    const mockPets: Pet[] = [
      {
        id: 'pet-1',
        uniqueCode: 'HUV-2026-0001',
        name: 'Max',
        species: 'CANINO',
        breed: 'Labrador',
        gender: 'MACHO',
        color: 'Dorado',
        clientId: 'client-123'
      }
    ];

    service.getAllPets('Max').subscribe((pets) => {
      expect(pets.length).toBe(1);
    });

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/pets` && r.params.get('search') === 'Max');
    expect(req.request.method).toBe('GET');
    req.flush(mockPets);
  });

  it('should search owners via GET /api/v1/clients/search', () => {
    const mockOwners: PetOwnerSummary[] = [
      { id: 'c-1', identification: '1088000111', fullName: 'Carlos Pérez' }
    ];

    service.searchOwners('1088').subscribe((owners) => {
      expect(owners.length).toBe(1);
      expect(owners[0].identification).toBe('1088000111');
    });

    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/clients/search` && r.params.get('query') === '1088');
    expect(req.request.method).toBe('GET');
    req.flush(mockOwners);
  });
});
