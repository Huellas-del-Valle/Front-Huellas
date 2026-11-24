import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditService } from './audit.service';
import { environment } from '../../../../environments/environment';
import { MOCK_AUDIT_LOGS, PaginatedAuditLogs } from '../models/reports.model';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query paginated audit logs filtered by employee, time range and eventType', () => {
    const mockResponse: PaginatedAuditLogs = {
      items: [MOCK_AUDIT_LOGS[0]],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1
    };

    service
      .getAuditLogs({
        employeeId: 'emp-1',
        startDateTime: '2026-11-24T00:00',
        endDateTime: '2026-11-24T23:59',
        eventType: 'EXPORT',
        page: 1,
        pageSize: 5
      })
      .subscribe((res) => {
        expect(res.items.length).toBe(1);
        expect(res.items[0].id).toBe('aud-001');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/audit-logs` &&
        r.params.get('employeeId') === 'emp-1' &&
        r.params.get('startDateTime') === '2026-11-24T00:00' &&
        r.params.get('endDateTime') === '2026-11-24T23:59' &&
        r.params.get('eventType') === 'EXPORT' &&
        r.params.get('page') === '1' &&
        r.params.get('pageSize') === '5'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch technical audit log detail by ID', () => {
    service.getAuditLogDetail('aud-001').subscribe((entry) => {
      expect(entry.ipAddress).toBe('190.24.112.45');
      expect(entry.deviceInfo).toContain('Chrome');
      expect(entry.payload).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/audit-logs/aud-001`);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_AUDIT_LOGS[0]);
  });
});
