import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { PetListComponent } from './pet-list.component';
import { PetsService } from '../../services/pets.service';
import { Pet } from '../../models/pet.model';

describe('PetListComponent', () => {
  let fixture: ComponentFixture<PetListComponent>;
  let component: PetListComponent;
  let petsServiceMock: {
    getAllPets: ReturnType<typeof vi.fn>;
  };

  const mockPets: Pet[] = [
    {
      id: 'pet-1',
      uniqueCode: 'HUV-2026-0001',
      name: 'Max',
      species: 'CANINO',
      breed: 'Labrador',
      gender: 'MACHO',
      color: 'Dorado',
      clientId: 'client-1',
      client: { id: 'client-1', identification: '1088001', fullName: 'Carlos Pérez' }
    },
    {
      id: 'pet-2',
      uniqueCode: 'HUV-2026-0002',
      name: 'Luna',
      species: 'FELINO',
      breed: 'Siamés',
      gender: 'HEMBRA',
      color: 'Blanco',
      clientId: 'client-2',
      client: { id: 'client-2', identification: '1088002', fullName: 'Ana Gómez' }
    }
  ];

  beforeEach(async () => {
    petsServiceMock = {
      getAllPets: vi.fn().mockReturnValue(of(mockPets))
    };

    await TestBed.configureTestingModule({
      imports: [PetListComponent],
      providers: [
        provideRouter([]),
        { provide: PetsService, useValue: petsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PetListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render pet rows with unique codes on load', () => {
    expect(component.pets().length).toBe(2);
    expect(component.filteredPets().length).toBe(2);

    const compiled: HTMLElement = fixture.nativeElement;
    const rows = compiled.querySelectorAll('[data-testid="pet-cards-grid"] tbody tr, [data-testid="pet-row"]');
    expect(rows.length).toBe(2);
    expect(compiled.textContent).toContain('HUV-2026-0001');
    expect(compiled.textContent).toContain('HUV-2026-0002');
  });

  it('should filter pets instantaneously by search term (code, name, owner)', () => {
    component.searchTerm.set('Luna');
    fixture.detectChanges();

    expect(component.filteredPets().length).toBe(1);
    expect(component.filteredPets()[0].name).toBe('Luna');

    component.searchTerm.set('1088001');
    fixture.detectChanges();

    expect(component.filteredPets().length).toBe(1);
    expect(component.filteredPets()[0].uniqueCode).toBe('HUV-2026-0001');
  });

  it('should filter pets by species tab selection', () => {
    component.setSpeciesFilter('FELINO');
    fixture.detectChanges();

    expect(component.filteredPets().length).toBe(1);
    expect(component.filteredPets()[0].species).toBe('FELINO');

    component.setSpeciesFilter('CANINO');
    fixture.detectChanges();

    expect(component.filteredPets().length).toBe(1);
    expect(component.filteredPets()[0].species).toBe('CANINO');
  });
});
