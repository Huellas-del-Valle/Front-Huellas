import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaccinationService } from './vaccination.service';
import { environment } from '../../../../environments/environment';
import { CreateVaccinationDto, VaccinationRecord } from '../models/vaccination.model';

describe('VaccinationService', () => {
  let service: VaccinationService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VaccinationService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(VaccinationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should retrieve vaccination history for a given pet', () => {
    const mockRecords: VaccinationRecord[] = [
      {
        id: 'vac-1',
        type: 'VACUNA',
        name: 'Vacuna Antirrábica',
        batchNumber: 'LOTE-9988',
        applicationDate: '2026-10-21',
        nextDueDate: '2027-10-21',
        notified: false
      }
    ];

    service.getVaccinationsByPet('pet-1').subscribe((records) => {
      expect(records.length).toBe(1);
      expect(records[0].batchNumber).toBe('LOTE-9988');
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1/vaccinations`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRecords);
  });

  it('should post a new vaccination dose and return created record', () => {
    const dto: CreateVaccinationDto = {
      type: 'VACUNA',
      name: 'Quíntuple Canina',
      batchNumber: 'LOT-2026-A',
      applicationDate: '2026-11-18',
      nextDueDate: '2027-11-18'
    };

    service.createVaccination('pet-1', dto).subscribe((created) => {
      expect(created.id).toBe('vac-new');
      expect(created.notified).toBe(false);
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1/vaccinations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'vac-new', ...dto, notified: false });
  });

  it('should trigger manual reminder dispatch endpoint', () => {
    service.sendReminder('pet-1', 'vac-1').subscribe((res) => {
      expect(res.notified).toBe(true);
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1/vaccinations/vac-1/send-reminder`);
    expect(req.request.method).toBe('POST');
    req.flush({ notified: true });
  });

  it('should request vaccination certificate PDF as a Blob', () => {
    const fakeBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });

    service.downloadCertificatePdf('pet-1').subscribe((blob) => {
      expect(blob.size).toBe(fakeBlob.size);
    });

    const req = httpMock.expectOne(`${baseUrl}/pets/pet-1/vaccinations/certificate`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(fakeBlob);
  });
});
