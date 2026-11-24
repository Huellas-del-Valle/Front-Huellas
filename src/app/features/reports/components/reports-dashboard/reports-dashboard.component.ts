import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportsService } from '../../services/reports.service';
import {
  CashStatusFilter,
  MOCK_REPORTS_DASHBOARD,
  MOCK_VETERINARIANS_FILTER,
  ReportFilters,
  ReportsDashboardData,
  ServiceTypeFilter
} from '../../models/reports.model';
import {
  buildGerencialReportPdfBlob,
  buildGerencialReportXlsxBlob
} from '../../utils/report-export.util';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportsService = inject(ReportsService);

  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN'));

  readonly startDate = signal<string>('2026-06-01');
  readonly endDate = signal<string>('2026-11-30');
  readonly veterinarianId = signal<string>('ALL');
  readonly serviceType = signal<ServiceTypeFilter>('ALL');
  readonly cashStatus = signal<CashStatusFilter>('ALL');

  readonly veterinarians = MOCK_VETERINARIANS_FILTER;
  readonly serviceTypes: readonly { value: ServiceTypeFilter; label: string }[] = [
    { value: 'ALL', label: 'Todos los servicios' },
    { value: 'CONSULTA', label: 'Consulta General' },
    { value: 'VACUNACION', label: 'Vacunación' },
    { value: 'CIRUGIA', label: 'Cirugía' },
    { value: 'LABORATORIO', label: 'Laboratorio' },
    { value: 'FARMACIA', label: 'Farmacia' }
  ];
  readonly cashStatuses: readonly { value: CashStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Todos los estados' },
    { value: 'CERRADA', label: 'Caja Cerrada' },
    { value: 'ABIERTA', label: 'Caja Abierta' },
    { value: 'ANULADA', label: 'Anulada' }
  ];

  readonly dashboardData = signal<ReportsDashboardData>(MOCK_REPORTS_DASHBOARD);
  readonly isLoading = signal(false);
  readonly isExporting = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly maxMonthlyRevenue = computed(() => {
    const points = this.dashboardData().monthlyRevenue;
    return Math.max(1, ...points.map((p) => p.revenue));
  });

  readonly maxVetConsultations = computed(() => {
    const vets = this.dashboardData().consultationsByVet;
    return Math.max(1, ...vets.map((v) => v.consultationsCount));
  });

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.loadMetrics();
    }
  }

  get currentFilters(): ReportFilters {
    return {
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      veterinarianId: this.veterinarianId(),
      serviceType: this.serviceType(),
      cashStatus: this.cashStatus()
    };
  }

  loadMetrics(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const filters = this.currentFilters;

    this.reportsService.getDashboardMetrics(filters).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 0) {
          this.dashboardData.set(this.computeDemoFilteredMetrics(filters));
          return;
        }
        this.errorMessage.set('No fue posible cargar las métricas gerenciales.');
      }
    });
  }

  clearFilters(): void {
    this.startDate.set('2026-06-01');
    this.endDate.set('2026-11-30');
    this.veterinarianId.set('ALL');
    this.serviceType.set('ALL');
    this.cashStatus.set('ALL');
    this.loadMetrics();
  }

  exportPdf(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.isExporting.set(true);
    this.errorMessage.set(null);
    const filters = this.currentFilters;

    this.reportsService.exportReportPdf(filters).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, 'reporte-gerencial-huellas.pdf');
        this.isExporting.set(false);
        this.showToast('Reporte gerencial exportado en formato PDF.');
      },
      error: (err) => {
        this.isExporting.set(false);
        if (err.status === 0) {
          const demoBlob = buildGerencialReportPdfBlob(this.dashboardData(), filters);
          this.triggerDownload(demoBlob, 'reporte-gerencial-huellas.pdf');
          this.showToast('Reporte gerencial PDF generado correctamente.');
          return;
        }
        this.errorMessage.set('Error al exportar el reporte en PDF.');
      }
    });
  }

  exportExcel(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.isExporting.set(true);
    this.errorMessage.set(null);
    const filters = this.currentFilters;

    this.reportsService.exportReportExcel(filters).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, 'reporte-gerencial-huellas.xlsx');
        this.isExporting.set(false);
        this.showToast('Reporte gerencial exportado en Excel (.xlsx).');
      },
      error: (err) => {
        this.isExporting.set(false);
        if (err.status === 0) {
          const demoBlob = buildGerencialReportXlsxBlob(this.dashboardData(), filters);
          this.triggerDownload(demoBlob, 'reporte-gerencial-huellas.xlsx');
          this.showToast('Reporte gerencial Excel (.xlsx) generado correctamente.');
          return;
        }
        this.errorMessage.set('Error al exportar el reporte en Excel (.xlsx).');
      }
    });
  }

  getBarHeightPercent(revenue: number): number {
    return Math.max(8, Math.round((revenue / this.maxMonthlyRevenue()) * 100));
  }

  getVetWidthPercent(count: number): number {
    return Math.max(8, Math.round((count / this.maxVetConsultations()) * 100));
  }

  triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private computeDemoFilteredMetrics(filters: ReportFilters): ReportsDashboardData {
    const startMonth = filters.startDate ? filters.startDate.slice(0, 7) : '0000-00';
    const endMonth = filters.endDate ? filters.endDate.slice(0, 7) : '9999-99';

    let monthly = MOCK_REPORTS_DASHBOARD.monthlyRevenue.filter(
      (m) => m.month >= startMonth && m.month <= endMonth
    );
    if (monthly.length === 0) {
      monthly = [...MOCK_REPORTS_DASHBOARD.monthlyRevenue];
    }

    let vets = [...MOCK_REPORTS_DASHBOARD.consultationsByVet];
    if (filters.veterinarianId && filters.veterinarianId !== 'ALL') {
      vets = vets.filter((v) => v.veterinarianId === filters.veterinarianId);
    }

    const factor =
      (filters.serviceType && filters.serviceType !== 'ALL' ? 0.55 : 1) *
      (filters.cashStatus && filters.cashStatus !== 'ALL' ? 0.8 : 1) *
      (filters.veterinarianId && filters.veterinarianId !== 'ALL' ? 0.42 : 1);

    const adjustedMonthly = monthly.map((m) => ({
      ...m,
      revenue: Math.round(m.revenue * factor),
      consultations: Math.max(1, Math.round(m.consultations * factor))
    }));

    const totalRevenue = adjustedMonthly.reduce((acc, m) => acc + m.revenue, 0);
    const totalConsultations = adjustedMonthly.reduce((acc, m) => acc + m.consultations, 0);

    return {
      totalRevenue,
      totalConsultations,
      averageTicket: totalConsultations > 0 ? Math.round(totalRevenue / totalConsultations) : 0,
      cashClosedCount: Math.max(1, Math.round(MOCK_REPORTS_DASHBOARD.cashClosedCount * factor)),
      monthlyRevenue: adjustedMonthly,
      consultationsByVet: vets
    };
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }
}
