import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { PetFormComponent } from './pet-form.component';
import { PetsService } from '../../services/pets.service';
import { Pet, PetOwnerSummary } from '../../models/pet.model';

describe('PetFormComponent', () => {
  let fixture: ComponentFixture<PetFormComponent>;
  let component: PetFormComponent;
  let petsServiceMock: {
    searchOwners: ReturnType<typeof vi.fn>;
    createPet: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    petsServiceMock = {
      searchOwners: vi.fn(),
      createPet: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PetFormComponent],
      providers: [
        provideRouter([]),
        { provide: PetsService, useValue: petsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with an invalid form and block submission without valid owner selection', () => {
    component.form.patchValue({
      name: 'Max',
      species: 'CANINO',
      breed: 'Labrador',
      birthDate: '2024-01-10',
      gender: 'MACHO',
      color: 'Dorado',
      ownerSearch: 'Texto sin seleccionar'
    });

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(petsServiceMock.createPet).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('propietario válido');
  });

  it('should enable valid submission once an owner is selected from autocomplete and required fields are filled', () => {
    const owner: PetOwnerSummary = {
      id: 'client-99',
      identification: '1088000111',
      fullName: 'María Fernández'
    };

    const createdPet: Pet = {
      id: 'pet-99',
      uniqueCode: 'HUV-2026-0099',
      name: 'Max',
      species: 'CANINO',
      breed: 'Labrador',
      birthDate: '2024-01-10',
      gender: 'MACHO',
      color: 'Dorado',
      clientId: 'client-99'
    };

    petsServiceMock.createPet.mockReturnValue(of(createdPet));

    component.selectOwner(owner);
    component.form.patchValue({
      name: 'Max',
      species: 'CANINO',
      breed: 'Labrador',
      birthDate: '2024-01-10',
      gender: 'MACHO',
      color: 'Dorado'
    });

    component.onSubmit();

    expect(petsServiceMock.createPet).toHaveBeenCalledTimes(1);
    expect(component.successMessage()).toContain('HUV-2026-0099');
  });
});
