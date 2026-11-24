import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MedicalTimelineComponent } from './medical-timeline.component';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { MOCK_PATIENT_FALLBACK, MedicalRecord } from '../../models/medical-record.model';

describe('MedicalTimelineComponent', () => {
  let fixture: ComponentFixture<MedicalTimelineComponent>;
  let component: MedicalTimelineComponent;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const sampleRecords: MedicalRecord[] = [
    {
      id: 'rec-old',
      petId: 'pet-1',
      recordType: 'VACUNACION',
      recordDate: '2026-08-14T09:15:00Z',
      veterinarianId: 'vet-1',
      veterinarianName: 'Dra. Laura Méndez',
      symptoms: 'Control de vacuna anual',
      weightKg: 27.6,
      temperatureC: 38.5,
      diagnosis: 'Apto para vacunación',
      treatment: 'Pentavalente',
      prescriptions: []
    },
    {
      id: 'rec-new',
      petId: 'pet-1',
      recordType: 'CONSULTA',
      recordDate: '2026-11-20T10:30:00Z',
      veterinarianId: 'vet-1',
      veterinarianName: 'Dra. Laura Méndez',
      symptoms: 'Tos leve',
      weightKg: 28.4,
      temperatureC: 38.7,
      diagnosis: 'Traqueobronquitis leve',
      treatment: 'Reposo',
      prescriptions: []
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalTimelineComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    authService.setMockSession('VETERINARIO', 'Dra. Laura Méndez');

    fixture = TestBed.createComponent(MedicalTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const petReq = httpMock.expectOne(`${baseUrl}/pets/pet-1`);
    petReq.flush(MOCK_PATIENT_FALLBACK);

    const historyReq = httpMock.expectOne(`${baseUrl}/pets/pet-1/medical-records`);
    historyReq.flush(sampleRecords);
    fixture.detectChanges();
  });

  afterEach(() => {
    authService.clearSession();
    httpMock.verify();
  });

  it('should render sticky patient header with uniqueCode and patient details', () => {
    const header = fixture.nativeElement.querySelector('[data-testid="sticky-patient-header"]');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('HUV-2026-0001');
    expect(header.textContent).toContain('Max');
  });

  it('should sort medical records chronologically (newest first by default) and filter by type/date', () => {
    expect(component.filteredRecords().map((r) => r.id)).toEqual(['rec-new', 'rec-old']);

    component.filterType.set('VACUNACION');
    expect(component.filteredRecords().map((r) => r.id)).toEqual(['rec-old']);

    component.clearFilters();
    component.filterDate.set('2026-11-20');
    expect(component.filteredRecords().map((r) => r.id)).toEqual(['rec-new']);
  });

  it('should allow VETERINARIO to open consultation form and hide create/edit buttons for ADMIN', () => {
    expect(component.canEditConsultations()).toBe(true);
    let newBtn = fixture.nativeElement.querySelector('[data-testid="btn-new-consultation"]');
    expect(newBtn).toBeTruthy();

    authService.setMockSession('ADMIN', 'Admin Clínica');
    fixture.detectChanges();

    expect(component.canEditConsultations()).toBe(false);
    newBtn = fixture.nativeElement.querySelector('[data-testid="btn-new-consultation"]');
    const editBtn = fixture.nativeElement.querySelector('[data-testid="btn-edit-record"]');
    expect(newBtn).toBeNull();
    expect(editBtn).toBeNull();
  });

  it('should not render any physical delete controls in the timeline UI', () => {
    const html = fixture.nativeElement.innerHTML.toLowerCase();
    expect(html).not.toContain('eliminar atención');
    expect(html).not.toContain('borrar consulta');
  });

  it('should export full history PDF and individual record PDF', () => {
    component.exportFullHistoryPdf();
    const fullPdfReq = httpMock.expectOne(`${baseUrl}/pets/pet-1/medical-records/pdf`);
    expect(fullPdfReq.request.method).toBe('GET');
    expect(fullPdfReq.request.responseType).toBe('blob');
    fullPdfReq.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));

    component.exportSingleRecordPdf(sampleRecords[0]);
    const singlePdfReq = httpMock.expectOne(`${baseUrl}/medical-records/rec-old/pdf`);
    expect(singlePdfReq.request.method).toBe('GET');
    expect(singlePdfReq.request.responseType).toBe('blob');
    singlePdfReq.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  });
});

