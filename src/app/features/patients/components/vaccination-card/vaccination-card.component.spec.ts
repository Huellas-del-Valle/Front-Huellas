import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { VaccinationCardComponent } from './vaccination-card.component';
import { VaccinationService } from '../../services/vaccination.service';
import { PetsService } from '../../services/pets.service';
import {
  VaccinationRecord,
  evaluateVaccinationValidity
} from '../../models/vaccination.model';

describe('VaccinationCardComponent & Validity Evaluator', () => {
  let fixture: ComponentFixture<VaccinationCardComponent>;
  let component: VaccinationCardComponent;
  let vaccinationServiceMock: {
    getVaccinationsByPet: ReturnType<typeof vi.fn>;
    sendReminder: ReturnType<typeof vi.fn>;
    downloadCertificatePdf: ReturnType<typeof vi.fn>;
  };
  let petsServiceMock: {
    getPetById: ReturnType<typeof vi.fn>;
  };

  const mockRecords: VaccinationRecord[] = [
    {
      id: 'vac-1',
      type: 'VACUNA',
      name: 'Vacuna Antirrábica',
      batchNumber: 'LOTE-9988',
      applicationDate: '2026-01-10',
      nextDueDate: '2027-06-15',
      notified: false
    },
    {
      id: 'desp-1',
      type: 'DESPARASITANTE',
      name: 'NexGard Spectra',
      batchNumber: 'LOTE-4411',
      applicationDate: '2026-08-01',
      nextDueDate: '2026-09-01',
      notified: true
    }
  ];

  beforeEach(async () => {
    vaccinationServiceMock = {
      getVaccinationsByPet: vi.fn().mockReturnValue(of(mockRecords)),
      sendReminder: vi.fn().mockReturnValue(of({ notified: true })),
      downloadCertificatePdf: vi.fn().mockReturnValue(of(new Blob(['%PDF'])))
    };

    petsServiceMock = {
      getPetById: vi.fn().mockReturnValue(
        of({
          id: 'pet-1',
          uniqueCode: 'HUV-2026-0001',
          name: 'Max',
          species: 'CANINO',
          breed: 'Labrador',
          gender: 'MACHO',
          color: 'Dorado',
          clientId: 'cli-1'
        })
      )
    };

    await TestBed.configureTestingModule({
      imports: [VaccinationCardComponent],
      providers: [
        provideRouter([]),
        { provide: VaccinationService, useValue: vaccinationServiceMock },
        { provide: PetsService, useValue: petsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VaccinationCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('petId', 'pet-1');
    fixture.detectChanges();
  });

  it('should evaluate validity status correctly (VIGENTE, PROXIMA_A_VENCER, VENCIDA)', () => {
    const refDate = new Date(2026, 10, 18); // 2026-11-18

    expect(evaluateVaccinationValidity('2027-02-01', refDate).status).toBe('VIGENTE');
    expect(evaluateVaccinationValidity('2026-12-05', refDate).status).toBe('PROXIMA_A_VENCER');
    expect(evaluateVaccinationValidity('2026-10-01', refDate).status).toBe('VENCIDA');
  });

  it('should separate vaccines and dewormers across tabs', () => {
    expect(component.activeTab()).toBe('VACUNA');
    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].name).toBe('Vacuna Antirrábica');

    component.setTab('DESPARASITANTE');
    fixture.detectChanges();

    expect(component.filteredRecords().length).toBe(1);
    expect(component.filteredRecords()[0].name).toBe('NexGard Spectra');
  });

  it('should trigger reminder and update notified status to true', () => {
    const target = component.filteredRecords()[0];
    expect(target.notified).toBe(false);

    component.triggerReminder(target);
    fixture.detectChanges();

    expect(vaccinationServiceMock.sendReminder).toHaveBeenCalledWith('pet-1', 'vac-1');
    expect(component.filteredRecords()[0].notified).toBe(true);
  });
});
