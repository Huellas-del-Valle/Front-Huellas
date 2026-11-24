import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReportsDashboardComponent } from './reports-dashboard.component';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { MOCK_REPORTS_DASHBOARD } from '../../models/reports.model';

describe('ReportsDashboardComponent', () => {
  let fixture: ComponentFixture<ReportsDashboardComponent>;
  let component: ReportsDashboardComponent;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsDashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    authService.setMockSession('ADMIN', 'Admin Principal');

    fixture = TestBed.createComponent(ReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const initReq = httpMock.expectOne((r) => r.url === `${baseUrl}/reports/dashboard`);
    initReq.flush(MOCK_REPORTS_DASHBOARD);
    fixture.detectChanges();
  });

  afterEach(() => {
    authService.clearSession();
    httpMock.verify();
  });

  it('should render monthly revenue chart and veterinarian consultations chart for ADMIN', () => {
    const monthlyChart = fixture.nativeElement.querySelector('[data-testid="monthly-revenue-chart"]');
    const vetChart = fixture.nativeElement.querySelector('[data-testid="vet-consultations-chart"]');

    expect(monthlyChart).toBeTruthy();
    expect(vetChart).toBeTruthy();
    expect(vetChart.textContent).toContain('Dra. Laura Méndez');
  });

  it('should filter dashboard metrics by date range, veterinarian, service type and cash status', () => {
    component.startDate.set('2026-10-01');
    component.endDate.set('2026-11-24');
    component.veterinarianId.set('vet-1');
    component.serviceType.set('CONSULTA');
    component.cashStatus.set('CERRADA');

    component.loadMetrics();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/reports/dashboard` &&
        r.params.get('startDate') === '2026-10-01' &&
        r.params.get('endDate') === '2026-11-24' &&
        r.params.get('veterinarianId') === 'vet-1' &&
        r.params.get('serviceType') === 'CONSULTA' &&
        r.params.get('cashStatus') === 'CERRADA'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      ...MOCK_REPORTS_DASHBOARD,
      totalConsultations: 128
    });
    expect(component.dashboardData().totalConsultations).toBe(128);
  });

  it('should export valid PDF and Excel (.xlsx) files', () => {
    component.exportPdf();
    const pdfReq = httpMock.expectOne((r) => r.url === `${baseUrl}/reports/export/pdf`);
    expect(pdfReq.request.responseType).toBe('blob');
    pdfReq.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));

    component.exportExcel();
    const xlsxReq = httpMock.expectOne((r) => r.url === `${baseUrl}/reports/export/xlsx`);
    expect(xlsxReq.request.responseType).toBe('blob');
    xlsxReq.flush(
      new Blob(['PK\x03\x04'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
  });

  it('should deny access and hide financial data for non-ADMIN roles', () => {
    authService.setMockSession('VETERINARIO', 'Dra. Laura Méndez');
    fixture.detectChanges();

    expect(component.isAdmin()).toBe(false);
    const denied = fixture.nativeElement.querySelector('[data-testid="reports-access-denied"]');
    const chart = fixture.nativeElement.querySelector('[data-testid="monthly-revenue-chart"]');
    expect(denied).toBeTruthy();
    expect(chart).toBeNull();
  });
});
