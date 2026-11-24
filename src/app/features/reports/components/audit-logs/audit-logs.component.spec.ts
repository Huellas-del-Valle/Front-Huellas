import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditLogsComponent } from './audit-logs.component';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { MOCK_AUDIT_LOGS } from '../../models/reports.model';

describe('AuditLogsComponent', () => {
  let fixture: ComponentFixture<AuditLogsComponent>;
  let component: AuditLogsComponent;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    authService.setMockSession('ADMIN', 'Admin Principal');

    fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const initReq = httpMock.expectOne((r) => r.url === `${baseUrl}/audit-logs`);
    initReq.flush({
      items: MOCK_AUDIT_LOGS.slice(0, 5),
      total: MOCK_AUDIT_LOGS.length,
      page: 1,
      pageSize: 5,
      totalPages: 2
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    authService.clearSession();
    httpMock.verify();
  });

  it('should render paginated audit events and navigate to next page', () => {
    expect(component.logs().length).toBe(5);
    expect(component.totalPages()).toBe(2);

    component.nextPage();
    const page2Req = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/audit-logs` && r.params.get('page') === '2'
    );
    page2Req.flush({
      items: MOCK_AUDIT_LOGS.slice(5),
      total: MOCK_AUDIT_LOGS.length,
      page: 2,
      pageSize: 5,
      totalPages: 2
    });

    expect(component.currentPage()).toBe(2);
    expect(component.logs().length).toBe(2);
  });

  it('should filter audit logs by employee, time range and event type', () => {
    component.employeeId.set('emp-1');
    component.startDateTime.set('2026-11-24T08:00');
    component.endDateTime.set('2026-11-24T18:00');
    component.eventType.set('EXPORT');
    component.applyFilters();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/audit-logs` &&
        r.params.get('employeeId') === 'emp-1' &&
        r.params.get('startDateTime') === '2026-11-24T08:00' &&
        r.params.get('endDateTime') === '2026-11-24T18:00' &&
        r.params.get('eventType') === 'EXPORT' &&
        r.params.get('page') === '1'
    );
    req.flush({
      items: [MOCK_AUDIT_LOGS[0]],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1
    });

    expect(component.logs().length).toBe(1);
  });

  it('should show technical detail (payload, IP, device) only to authorized ADMIN', () => {
    component.openDetail(MOCK_AUDIT_LOGS[0]);

    const detailReq = httpMock.expectOne(`${baseUrl}/audit-logs/aud-001`);
    detailReq.flush(MOCK_AUDIT_LOGS[0]);
    fixture.detectChanges();

    const ipEl = fixture.nativeElement.querySelector('[data-testid="detail-ip"]');
    const deviceEl = fixture.nativeElement.querySelector('[data-testid="detail-device"]');
    const payloadEl = fixture.nativeElement.querySelector('[data-testid="detail-payload"]');

    expect(ipEl.textContent).toContain('190.24.112.45');
    expect(deviceEl.textContent).toContain('Chrome 131.0');
    expect(payloadEl.textContent).toContain('xlsx');

    // Cambiar a rol no autorizado debe ocultar datos y detalle técnico
    authService.setMockSession('RECEPCIONISTA', 'Mariana López');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="audit-access-denied"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="audit-detail-modal"]')).toBeNull();
  });
});
