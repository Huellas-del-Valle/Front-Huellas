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
import { AuditService } from '../../services/audit.service';
import {
  AuditEventType,
  AuditLogEntry,
  AuditLogFilters,
  MOCK_AUDIT_LOGS,
  MOCK_EMPLOYEES_FILTER,
  PaginatedAuditLogs
} from '../../models/reports.model';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './audit-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly auditService = inject(AuditService);

  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN'));

  readonly employeeId = signal<string>('ALL');
  readonly startDateTime = signal<string>('');
  readonly endDateTime = signal<string>('');
  readonly eventType = signal<AuditEventType>('ALL');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 5;
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);

  readonly logs = signal<readonly AuditLogEntry[]>([]);
  readonly selectedLog = signal<AuditLogEntry | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly employees = MOCK_EMPLOYEES_FILTER;
  readonly eventTypes: readonly { value: AuditEventType; label: string }[] = [
    { value: 'ALL', label: 'Todos los eventos' },
    { value: 'LOGIN', label: 'Inicio de sesión' },
    { value: 'CREATE', label: 'Creación' },
    { value: 'UPDATE', label: 'Actualización' },
    { value: 'DELETE', label: 'Anulación / Baja' },
    { value: 'EXPORT', label: 'Exportación' },
    { value: 'CASH_CLOSE', label: 'Cierre de caja' }
  ];

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.loadLogs();
    }
  }

  loadLogs(page = this.currentPage()): void {
    if (!this.isAdmin()) {
      return;
    }

    this.currentPage.set(page);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters: AuditLogFilters = {
      employeeId: this.employeeId(),
      startDateTime: this.startDateTime() || undefined,
      endDateTime: this.endDateTime() || undefined,
      eventType: this.eventType(),
      page,
      pageSize: this.pageSize
    };

    this.auditService.getAuditLogs(filters).subscribe({
      next: (res) => {
        this.logs.set(res.items);
        this.totalItems.set(res.total);
        this.totalPages.set(Math.max(1, res.totalPages));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 0) {
          const demo = this.computeDemoPaginatedLogs(filters);
          this.logs.set(demo.items);
          this.totalItems.set(demo.total);
          this.totalPages.set(demo.totalPages);
          return;
        }
        this.errorMessage.set('No fue posible consultar la bitácora de auditoría.');
      }
    });
  }

  applyFilters(): void {
    this.loadLogs(1);
  }

  clearFilters(): void {
    this.employeeId.set('ALL');
    this.startDateTime.set('');
    this.endDateTime.set('');
    this.eventType.set('ALL');
    this.loadLogs(1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.loadLogs(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.loadLogs(this.currentPage() + 1);
    }
  }

  openDetail(entry: AuditLogEntry): void {
    if (!this.isAdmin()) {
      return;
    }

    this.auditService.getAuditLogDetail(entry.id).subscribe({
      next: (detail) => {
        this.selectedLog.set(detail);
      },
      error: (err) => {
        if (err.status === 0) {
          this.selectedLog.set(entry);
          return;
        }
        this.errorMessage.set('No fue posible cargar el detalle técnico del evento.');
      }
    });
  }

  closeDetail(): void {
    this.selectedLog.set(null);
  }

  getEventBadgeClass(type: AuditLogEntry['eventType']): string {
    switch (type) {
      case 'LOGIN':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'EXPORT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CASH_CLOSE':
        return 'bg-slate-200 text-slate-800 border-slate-300';
    }
  }

  private computeDemoPaginatedLogs(filters: AuditLogFilters): PaginatedAuditLogs {
    const startMs = filters.startDateTime ? new Date(filters.startDateTime).getTime() : null;
    const endMs = filters.endDateTime ? new Date(filters.endDateTime).getTime() : null;

    const filtered = MOCK_AUDIT_LOGS.filter((item) => {
      if (filters.employeeId && filters.employeeId !== 'ALL' && item.employeeId !== filters.employeeId) {
        return false;
      }
      if (filters.eventType && filters.eventType !== 'ALL' && item.eventType !== filters.eventType) {
        return false;
      }
      const itemMs = new Date(item.timestamp).getTime();
      if (startMs !== null && !Number.isNaN(startMs) && itemMs < startMs) {
        return false;
      }
      if (endMs !== null && !Number.isNaN(endMs) && itemMs > endMs) {
        return false;
      }
      return true;
    });

    const page = filters.page ?? 1;
    const size = filters.pageSize ?? this.pageSize;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * size;

    return {
      items: filtered.slice(startIdx, startIdx + size),
      total,
      page: safePage,
      pageSize: size,
      totalPages
    };
  }
}
