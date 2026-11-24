import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { MedicalTimelineComponent } from '../features/medical-records/components/medical-timeline/medical-timeline.component';
import { ConsultationFormComponent } from '../features/medical-records/components/consultation-form/consultation-form.component';
import { MedicalRecordsService } from '../features/medical-records/services/medical-records.service';
import {
  MOCK_MEDICAL_RECORDS,
  MOCK_PATIENT_FALLBACK,
  MedicalRecord
} from '../features/medical-records/models/medical-record.model';

describe('Medical Records Module Integration (CU07 / CU08 / PDF)', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let medicalRecordsService: MedicalRecordsService;
  const baseUrl = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalTimelineComponent, ConsultationFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    medicalRecordsService = TestBed.inject(MedicalRecordsService);
  });

  afterEach(() => {
    authService.clearSession();
    httpMock.verify();
  });

  const mountTimelineWithHistory = (
    role: 'VETERINARIO' | 'ADMIN' | 'RECEPCIONISTA' = 'VETERINARIO'
  ): ComponentFixture<MedicalTimelineComponent> => {
    authService.setMockSession(role, role === 'VETERINARIO' ? 'Dra. Laura Méndez' : 'Usuario Demo');
    const fixture = TestBed.createComponent(MedicalTimelineComponent);
    fixture.detectChanges();

    const petReq = httpMock.expectOne(`${baseUrl}/pets/pet-1`);
    petReq.flush(MOCK_PATIENT_FALLBACK);

    const historyReq = httpMock.expectOne(`${baseUrl}/pets/pet-1/medical-records`);
    historyReq.flush(MOCK_MEDICAL_RECORDS.filter((r) => r.petId === 'pet-1'));
    fixture.detectChanges();
    return fixture;
  };

  it('Criterio 1: La cabecera fija presenta siempre el identificador único y datos del paciente', () => {
    const fixture = mountTimelineWithHistory('VETERINARIO');
    const header = fixture.nativeElement.querySelector('[data-testid="sticky-patient-header"]');

    expect(header).toBeTruthy();
    expect(header.classList.contains('sticky')).toBe(true);
    expect(header.textContent).toContain('HUV-2026-0001');
    expect(header.textContent).toContain('Max');
    expect(header.textContent).toContain('Golden Retriever');
  });

  it('Criterio 2: MedicalTimelineComponent ordena cronológicamente y filtra por fecha o tipo', () => {
    const fixture = mountTimelineWithHistory('VETERINARIO');
    const component = fixture.componentInstance;

    const initialIds = component.filteredRecords().map((r) => r.id);
    expect(initialIds).toEqual(['rec-003', 'rec-002', 'rec-001']);

    component.toggleSortDirection();
    expect(component.filteredRecords().map((r) => r.id)).toEqual(['rec-001', 'rec-002', 'rec-003']);

    component.filterType.set('CONTROL');
    expect(component.filteredRecords().map((r) => r.id)).toEqual(['rec-002']);

    component.clearFilters();
    component.filterDate.set('2026-08-14');
    expect(component.filteredRecords().map((r) => r.id)).toEqual(['rec-001']);
  });

  it('Criterio 3 y 4: ConsultationFormComponent valida campos obligatorios (diagnóstico y profesional) y restringe escritura a VETERINARIO', () => {
    authService.setMockSession('VETERINARIO', 'Dra. Laura Méndez');
    const formFixture = TestBed.createComponent(ConsultationFormComponent);
    const formComp = formFixture.componentInstance;
    formFixture.componentRef.setInput('petId', 'pet-1');
    formFixture.detectChanges();

    formComp.form.patchValue({
      veterinarianId: '',
      symptoms: 'Fiebre alta y apatía',
      weightKg: 25,
      temperatureC: 39.8,
      diagnosis: ''
    });
    formComp.onSubmit();
    expect(formComp.form.invalid).toBe(true);
    expect(formComp.form.get('diagnosis')?.hasError('required')).toBe(true);
    expect(formComp.form.get('veterinarianId')?.hasError('required')).toBe(true);

    authService.setMockSession('ADMIN', 'Admin Clínica');
    formFixture.detectChanges();
    formComp.form.patchValue({
      veterinarianId: 'vet-1',
      diagnosis: 'Faringitis aguda'
    });
    formComp.onSubmit();
    expect(formComp.isVeterinarian()).toBe(false);
    expect(formComp.errorMessage()).toContain('VETERINARIO');
    httpMock.expectNone(`${baseUrl}/medical-records`);
  });

  it('Criterio 5: El historial se consulta en menos de 1s y no existe eliminación física en la interfaz', () => {
    const start = performance.now();
    const fixture = mountTimelineWithHistory('VETERINARIO');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
    expect(fixture.componentInstance.lastLoadTimeMs()).toBeLessThan(1000);

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const hasDeleteAction = buttons.some((btn) =>
      /eliminar|borrar|delete/i.test(btn.textContent ?? '')
    );
    expect(hasDeleteAction).toBe(false);
  });

  it('Criterio 6 y 7: MedicalRecordsService integra consulta, registro y rutas PDF acordadas con Backend', () => {
    const pdfHistoryBlob = new Blob(['%PDF-1.4 full'], { type: 'application/pdf' });
    const pdfSingleBlob = new Blob(['%PDF-1.4 single'], { type: 'application/pdf' });

    medicalRecordsService.exportMedicalHistoryPdf('pet-1').subscribe((blob) => {
      expect(blob.type).toBe('application/pdf');
    });
    const fullReq = httpMock.expectOne(`${baseUrl}/pets/pet-1/medical-records/pdf`);
    expect(fullReq.request.method).toBe('GET');
    expect(fullReq.request.responseType).toBe('blob');
    fullReq.flush(pdfHistoryBlob);

    medicalRecordsService.exportConsultationPdf('rec-003').subscribe((blob) => {
      expect(blob.type).toBe('application/pdf');
    });
    const singleReq = httpMock.expectOne(`${baseUrl}/medical-records/rec-003/pdf`);
    expect(singleReq.request.method).toBe('GET');
    expect(singleReq.request.responseType).toBe('blob');
    singleReq.flush(pdfSingleBlob);

    const sampleCreate: MedicalRecord = {
      id: 'rec-999',
      petId: 'pet-1',
      recordType: 'CONSULTA',
      recordDate: '2026-11-24T15:00:00Z',
      veterinarianId: 'vet-1',
      veterinarianName: 'Dra. Laura Méndez',
      symptoms: 'Control de piel',
      weightKg: 28,
      temperatureC: 38.5,
      diagnosis: 'Dermatitis leve',
      treatment: 'Baño medicado',
      prescriptions: []
    };

    medicalRecordsService.createConsultation(sampleCreate).subscribe((res) => {
      expect(res.id).toBe('rec-999');
    });
    const postReq = httpMock.expectOne(`${baseUrl}/medical-records`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush(sampleCreate);
  });
});
