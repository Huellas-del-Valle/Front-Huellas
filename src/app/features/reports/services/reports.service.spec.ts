import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReportsService } from './reports.service';
import { environment } from '../../../../environments/environment';
import { MOCK_REPORTS_DASHBOARD } from '../models/reports.model';

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch dashboard metrics with date, veterinarian, serviceType and cashStatus filters', () => {
    service
      .getDashboardMetrics({
        startDate: '2026-11-01',
        endDate: '2026-11-24',
        veterinarianId: 'vet-1',
        serviceType: 'CONSULTA',
        cashStatus: 'CERRADA'
      })
      .subscribe((data) => {
        expect(data.totalRevenue).toBe(MOCK_REPORTS_DASHBOARD.totalRevenue);
        expect(data.monthlyRevenue.length).toBe(6);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/reports/dashboard` &&
        r.params.get('startDate') === '2026-11-01' &&
        r.params.get('endDate') === '2026-11-24' &&
        r.params.get('veterinarianId') === 'vet-1' &&
        r.params.get('serviceType') === 'CONSULTA' &&
        r.params.get('cashStatus') === 'CERRADA'
    );
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_REPORTS_DASHBOARD);
  });

  it('should omit ALL filter values from query params', () => {
    service
      .getDashboardMetrics({
        veterinarianId: 'ALL',
        serviceType: 'ALL',
        cashStatus: 'ALL'
      })
      .subscribe((data) => {
        expect(data.totalConsultations).toBe(312);
      });

    const req = httpMock.expectOne(`${baseUrl}/reports/dashboard`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(MOCK_REPORTS_DASHBOARD);
  });

  it('should export managerial report in PDF format as Blob', () => {
    const pdfBlob = new Blob(['%PDF-1.4 report'], { type: 'application/pdf' });

    service.exportReportPdf({ startDate: '2026-11-01' }).subscribe((blob) => {
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBe(pdfBlob.size);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/reports/export/pdf` && r.params.get('startDate') === '2026-11-01'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(pdfBlob);
  });

  it('should export managerial report in Excel (.xlsx) format as Blob', () => {
    const xlsxBlob = new Blob(['PK\x03\x04'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    service.exportReportExcel({ cashStatus: 'CERRADA' }).subscribe((blob) => {
      expect(blob.size).toBe(xlsxBlob.size);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/reports/export/xlsx` && r.params.get('cashStatus') === 'CERRADA'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(xlsxBlob);
  });
});
