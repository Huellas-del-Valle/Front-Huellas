import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../core/services/auth.service';
import { routes } from '../app.routes';
import { environment } from '../../environments/environment';
import { ReportsDashboardComponent } from '../features/reports/components/reports-dashboard/reports-dashboard.component';
import { AuditLogsComponent } from '../features/reports/components/audit-logs/audit-logs.component';
import { ReportsService } from '../features/reports/services/reports.service';
import { AuditService } from '../features/reports/services/audit.service';
import {
  MOCK_AUDIT_LOGS,
  MOCK_REPORTS_DASHBOARD
} from '../features/reports/models/reports.model';
import {
  buildGerencialReportPdfBlob,
  buildGerencialReportXlsxBlob
} from '../features/reports/utils/report-export.util';

describe('Reports & Audit Module Integration (CU13 / CU14)', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let reportsService: ReportsService;
  let auditService: AuditService;
  let router: Router;
  const baseUrl = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsDashboardComponent, AuditLogsComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    reportsService = TestBed.inject(ReportsService);
    auditService = TestBed.inject(AuditService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    authService.clearSession();
    httpMock.verify();
  });

  it('Criterio 1 y 2: ReportsDashboardComponent renderiza gráficas de ingresos mensuales y consultas por profesional y aplica filtros', () => {
    authService.setMockSession('ADMIN', 'Admin Principal');
    const fixture = TestBed.createComponent(ReportsDashboardComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    const initReq = httpMock.expectOne((r) => r.url === `${baseUrl}/reports/dashboard`);
    initReq.flush(MOCK_REPORTS_DASHBOARD);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="monthly-revenue-chart"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="vet-consultations-chart"]')).toBeTruthy();

    comp.startDate.set('2026-11-01');
    comp.endDate.set('2026-11-24');
    comp.veterinarianId.set('vet-2');
    comp.serviceType.set('CIRUGIA');
    comp.cashStatus.set('CERRADA');
    comp.loadMetrics();

    const filterReq = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/reports/dashboard` &&
        r.params.get('veterinarianId') === 'vet-2' &&
        r.params.get('serviceType') === 'CIRUGIA' &&
        r.params.get('cashStatus') === 'CERRADA'
    );
    filterReq.flush(MOCK_REPORTS_DASHBOARD);
  });

  it('Criterio 3: Los generadores PDF y Excel (.xlsx) producen archivos válidos con firmas reales', async () => {
    const pdfBlob = buildGerencialReportPdfBlob(MOCK_REPORTS_DASHBOARD, {});
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const pdfHeader = String.fromCharCode(...pdfBytes.slice(0, 8));
    expect(pdfHeader).toBe('%PDF-1.4');
    expect(pdfBlob.type).toBe('application/pdf');

    const xlsxBlob = buildGerencialReportXlsxBlob(MOCK_REPORTS_DASHBOARD, {});
    const xlsxBytes = new Uint8Array(await xlsxBlob.arrayBuffer());
    // Firma ZIP estándar (PK\x03\x04) requerida por archivos .xlsx válidos
    expect(xlsxBytes[0]).toBe(0x50);
    expect(xlsxBytes[1]).toBe(0x4b);
    expect(xlsxBytes[2]).toBe(0x03);
    expect(xlsxBytes[3]).toBe(0x04);
    expect(xlsxBlob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('Criterio 4 y 5: AuditLogsComponent pagina, filtra eventos y muestra payload/IP/dispositivo solo a ADMIN', () => {
    authService.setMockSession('ADMIN', 'Admin Principal');
    const fixture = TestBed.createComponent(AuditLogsComponent);
    const comp = fixture.componentInstance;
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

    expect(fixture.nativeElement.querySelectorAll('[data-testid="audit-row"]').length).toBe(5);

    comp.openDetail(MOCK_AUDIT_LOGS[0]);
    const detailReq = httpMock.expectOne(`${baseUrl}/audit-logs/aud-001`);
    detailReq.flush(MOCK_AUDIT_LOGS[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="detail-ip"]').textContent).toContain('190.24.112.45');
    expect(fixture.nativeElement.querySelector('[data-testid="detail-payload"]').textContent).toContain('xlsx');

    // Rol no autorizado no puede ver datos de auditoría ni detalle técnico
    authService.setMockSession('VETERINARIO', 'Dra. Laura Méndez');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="audit-access-denied"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="audit-detail-modal"]')).toBeNull();
  });

  it('Criterio 6: La ruta /reports está protegida exclusivamente para ADMIN y bloquea otros roles', async () => {
    const reportsRoute = routes
      .find((r) => r.path === '')
      ?.children?.find((c) => c.path === 'reports');

    expect(reportsRoute).toBeTruthy();
    expect(reportsRoute?.data?.['roles']).toEqual(['ADMIN']);

    authService.setMockSession('RECEPCIONISTA', 'Mariana López');
    await router.navigateByUrl('/reports');
    expect(router.url).toBe('/access-denied');
  });

  it('Criterio 7: ReportsService y AuditService integran correctamente los endpoints REST', () => {
    reportsService.getDashboardMetrics({ cashStatus: 'CERRADA' }).subscribe();
    const rReq = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/reports/dashboard` && r.params.get('cashStatus') === 'CERRADA'
    );
    rReq.flush(MOCK_REPORTS_DASHBOARD);

    auditService.getAuditLogs({ eventType: 'LOGIN', page: 1, pageSize: 5 }).subscribe();
    const aReq = httpMock.expectOne(
      (r) => r.url === `${baseUrl}/audit-logs` && r.params.get('eventType') === 'LOGIN'
    );
    aReq.flush({ items: [], total: 0, page: 1, pageSize: 5, totalPages: 1 });
  });
});
