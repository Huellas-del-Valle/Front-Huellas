import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConsultationFormComponent } from './consultation-form.component';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { MedicalRecord } from '../../models/medical-record.model';

describe('ConsultationFormComponent', () => {
  let fixture: ComponentFixture<ConsultationFormComponent>;
  let component: ConsultationFormComponent;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultationFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    authService.setMockSession('VETERINARIO', 'Dra. Laura Méndez');

    fixture = TestBed.createComponent(ConsultationFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('petId', 'pet-1');
    fixture.detectChanges();
  });

  afterEach(() => {
    authService.clearSession();
    httpMock.verify();
  });

  it('should require diagnosis and veterinarianId before saving', () => {
    component.form.patchValue({
      veterinarianId: '',
      symptoms: 'Fiebre y decaimiento general',
      diagnosis: '   '
    });

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.form.get('diagnosis')?.hasError('required')).toBe(true);
    expect(component.form.get('veterinarianId')?.hasError('required')).toBe(true);
    httpMock.expectNone(`${baseUrl}/medical-records`);
  });

  it('should block saving when authenticated user does not have VETERINARIO role', () => {
    authService.setMockSession('ADMIN', 'Administrador Clínica');
    fixture.detectChanges();

    component.form.patchValue({
      veterinarianId: 'vet-1',
      symptoms: 'Control de rutina',
      diagnosis: 'Paciente sano'
    });

    component.onSubmit();

    expect(component.isVeterinarian()).toBe(false);
    expect(component.errorMessage()).toContain('VETERINARIO');
    httpMock.expectNone(`${baseUrl}/medical-records`);
  });

  it('should capture symptoms, weight, temperature, diagnosis, treatment and prescriptions on submit', () => {
    let emittedRecord: MedicalRecord | undefined;
    component.saved.subscribe((rec) => {
      emittedRecord = rec;
    });

    component.addPrescription({
      medication: 'Amoxicilina 250mg',
      dosage: '1 tab',
      frequency: 'Cada 12h',
      duration: '7 días'
    });

    component.form.patchValue({
      recordType: 'CONSULTA',
      veterinarianId: 'vet-1',
      symptoms: 'Tos seca y decaimiento desde ayer',
      weightKg: 28.5,
      temperatureC: 39.1,
      diagnosis: 'Traqueobronquitis infecciosa',
      treatment: 'Reposo e hidratación'
    });

    component.onSubmit();

    const req = httpMock.expectOne(`${baseUrl}/medical-records`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.weightKg).toBe(28.5);
    expect(req.request.body.temperatureC).toBe(39.1);
    expect(req.request.body.diagnosis).toBe('Traqueobronquitis infecciosa');
    expect(req.request.body.prescriptions.length).toBe(1);

    const mockResponse: MedicalRecord = {
      ...req.request.body,
      id: 'rec-200',
      recordDate: '2026-11-24T12:00:00Z'
    };
    req.flush(mockResponse);

    expect(emittedRecord?.id).toBe('rec-200');
  });

  it('should populate form and send PUT request in edit mode', () => {
    const existing: MedicalRecord = {
      id: 'rec-003',
      petId: 'pet-1',
      recordType: 'CONTROL',
      recordDate: '2026-11-20T10:30:00Z',
      veterinarianId: 'vet-1',
      veterinarianName: 'Dra. Laura Méndez',
      symptoms: 'Control post-operatorio',
      weightKg: 28.4,
      temperatureC: 38.6,
      diagnosis: 'Evolución favorable',
      treatment: 'Alta médica',
      prescriptions: []
    };

    fixture.componentRef.setInput('editingRecord', existing);
    fixture.detectChanges();

    expect(component.isEditMode()).toBe(true);
    expect(component.form.get('diagnosis')?.value).toBe('Evolución favorable');

    component.form.patchValue({ diagnosis: 'Alta médica definitiva' });
    component.onSubmit();

    const req = httpMock.expectOne(`${baseUrl}/medical-records/rec-003`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.diagnosis).toBe('Alta médica definitiva');
    req.flush({ ...existing, diagnosis: 'Alta médica definitiva' });
  });
});

