import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MedicalRecordsService } from './medical-records.service';
import { environment } from '../../../../environments/environment';
import { CreateMedicalRecordDto, MedicalRecord } from '../models/medical-record.model';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const mockRecord: MedicalRecord = {
    id: 'rec-101',
    petId: 'pet-1',
    recordType: 'CONSULTA',
    recordDate: '2026-11-24T10:00:00Z',
    veterinarianId: 'vet-1',
    veterinarianName: 'Dra. Laura Méndez',
    symptoms: 'Decaimiento y fiebre leve',
    weightKg: 18.5,
    temperatureC: 39.2,
    diagnosis: 'Infección respiratoria leve',
    treatment: 'Reposo e hidratación',
    prescriptions: [
      {
        medication: 'Amoxicilina 250mg',
        dosage: '1 tableta',
        frequency: 'Cada 12h',
        duration: '7 días'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MedicalRecordsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(MedicalRecordsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch chronological medical history for a pet with optional filters', () => {
    service
      .getMedicalHistory('pet-1', { date: '2026-11-24', recordType: 'CONSULTA' })
      .subscribe((records) => {
        expect(records.length).toBe(1);
        expect(records[0].id).toBe('rec-101');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/pets/pet-1/medical-records` &&
        r.params.get('date') === '2026-11-24' &&
        r.params.get('recordType') === 'CONSULTA'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockRecord]);
  });

  it('should omit recordType query param when filter is ALL', () => {
    service.getMedicalHistory('pet-1', { recordType: 'ALL' }).subscribe((records) => {
      expect(records).toEqual([mockRecord]);
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1/medical-records`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('recordType')).toBe(false);
    req.flush([mockRecord]);
  });

  it('should create a new consultation via POST /api/v1/medical-records', () => {
    const dto: CreateMedicalRecordDto = {
      petId: 'pet-1',
      recordType: 'CONSULTA',
      veterinarianId: 'vet-1',
      veterinarianName: 'Dra. Laura Méndez',
      symptoms: 'Decaimiento y fiebre leve',
      weightKg: 18.5,
      temperatureC: 39.2,
      diagnosis: 'Infección respiratoria leve',
      treatment: 'Reposo e hidratación',
      prescriptions: []
    };

    service.createConsultation(dto).subscribe((created) => {
      expect(created.id).toBe('rec-101');
      expect(created.diagnosis).toBe(dto.diagnosis);
    });

    const req = httpMock.expectOne(`${baseUrl}/medical-records`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockRecord);
  });

  it('should update an existing consultation via PUT /api/v1/medical-records/:id', () => {
    service
      .updateConsultation('rec-101', { diagnosis: 'Diagnóstico actualizado' })
      .subscribe((updated) => {
        expect(updated.diagnosis).toBe('Diagnóstico actualizado');
      });

    const req = httpMock.expectOne(`${baseUrl}/medical-records/rec-101`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ diagnosis: 'Diagnóstico actualizado' });
    req.flush({ ...mockRecord, diagnosis: 'Diagnóstico actualizado' });
  });

  it('should export full patient medical history PDF as Blob via agreed backend endpoint', () => {
    const pdfBlob = new Blob(['%PDF-1.4 history'], { type: 'application/pdf' });

    service.exportMedicalHistoryPdf('pet-1').subscribe((blob) => {
      expect(blob.size).toBe(pdfBlob.size);
      expect(blob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1/medical-records/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(pdfBlob);
  });

  it('should export individual consultation PDF as Blob via agreed backend endpoint', () => {
    const pdfBlob = new Blob(['%PDF-1.4 consultation'], { type: 'application/pdf' });

    service.exportConsultationPdf('rec-101').subscribe((blob) => {
      expect(blob.size).toBe(pdfBlob.size);
      expect(blob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(`${baseUrl}/medical-records/rec-101/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(pdfBlob);
  });
});

