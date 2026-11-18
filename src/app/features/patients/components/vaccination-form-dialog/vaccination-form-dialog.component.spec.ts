import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { VaccinationFormDialogComponent } from './vaccination-form-dialog.component';
import { VaccinationService } from '../../services/vaccination.service';
import { VaccinationRecord } from '../../models/vaccination.model';

describe('VaccinationFormDialogComponent', () => {
  let fixture: ComponentFixture<VaccinationFormDialogComponent>;
  let component: VaccinationFormDialogComponent;
  let vaccinationServiceMock: {
    createVaccination: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vaccinationServiceMock = {
      createVaccination: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [VaccinationFormDialogComponent],
      providers: [{ provide: VaccinationService, useValue: vaccinationServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(VaccinationFormDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('petId', 'pet-77');
    fixture.detectChanges();
  });

  it('should invalidate form when nextDueDate is earlier than applicationDate', () => {
    component.form.patchValue({
      type: 'VACUNA',
      name: 'Antirrábica',
      batchNumber: 'LOTE-100',
      applicationDate: '2026-11-18',
      nextDueDate: '2026-10-01'
    });
    component.form.markAllAsTouched();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(component.form.errors?.['nextDueDateBeforeApplication']).toBe(true);

    component.onSubmit();
    expect(vaccinationServiceMock.createVaccination).not.toHaveBeenCalled();
  });

  it('should submit valid payload and emit saved event when dates are valid', () => {
    const createdRecord: VaccinationRecord = {
      id: 'vac-created-1',
      type: 'VACUNA',
      name: 'Antirrábica',
      batchNumber: 'LOTE-100',
      applicationDate: '2026-11-18',
      nextDueDate: '2027-11-18',
      notified: false
    };

    vaccinationServiceMock.createVaccination.mockReturnValue(of(createdRecord));
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.form.patchValue({
      type: 'VACUNA',
      name: 'Antirrábica',
      batchNumber: 'LOTE-100',
      applicationDate: '2026-11-18',
      nextDueDate: '2027-11-18'
    });
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    component.onSubmit();

    expect(vaccinationServiceMock.createVaccination).toHaveBeenCalledWith('pet-77', {
      type: 'VACUNA',
      name: 'Antirrábica',
      batchNumber: 'LOTE-100',
      applicationDate: '2026-11-18',
      nextDueDate: '2027-11-18'
    });
    expect(savedSpy).toHaveBeenCalledWith(createdRecord);
  });
});
