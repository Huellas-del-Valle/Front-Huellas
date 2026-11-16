import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { PetProfileComponent } from './pet-profile.component';
import { PetsService } from '../../services/pets.service';
import { Pet } from '../../models/pet.model';

describe('PetProfileComponent', () => {
  let fixture: ComponentFixture<PetProfileComponent>;
  let component: PetProfileComponent;
  let petsServiceMock: {
    getPetById: ReturnType<typeof vi.fn>;
  };

  const mockPet: Pet = {
    id: 'pet-123',
    uniqueCode: 'HUV-2026-0123',
    name: 'Toby',
    species: 'CANINO',
    breed: 'Golden Retriever',
    gender: 'MACHO',
    color: 'Dorado',
    clientId: 'client-55',
    client: {
      id: 'client-55',
      identification: '1088555999',
      fullName: 'Carolina Herrera',
      phone: '3001234567'
    }
  };

  beforeEach(async () => {
    petsServiceMock = {
      getPetById: vi.fn().mockReturnValue(of(mockPet))
    };

    await TestBed.configureTestingModule({
      imports: [PetProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'pet-123' : null)
              }
            }
          }
        },
        { provide: PetsService, useValue: petsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PetProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load pet by ID from route parameters and render uniqueCode in badge and details', () => {
    expect(petsServiceMock.getPetById).toHaveBeenCalledWith('pet-123');
    expect(component.pet()).toEqual(mockPet);

    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.textContent).toContain('HUV-2026-0123');
    expect(compiled.textContent).toContain('Toby');
    expect(compiled.textContent).toContain('Carolina Herrera');
  });

  it('should render the three clinical quick links (medical records, appointments, vaccinations)', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const medLink = compiled.querySelector('[data-testid="link-medical-records"]');
    const aptLink = compiled.querySelector('[data-testid="link-appointments"]');
    const vacLink = compiled.querySelector('[data-testid="link-vaccinations"]');

    expect(medLink).toBeTruthy();
    expect(aptLink).toBeTruthy();
    expect(vacLink).toBeTruthy();
  });
});
