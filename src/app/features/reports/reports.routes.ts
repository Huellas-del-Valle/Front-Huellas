import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/reports-dashboard/reports-dashboard.component').then(
        (m) => m.ReportsDashboardComponent
      )
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./components/audit-logs/audit-logs.component').then(
        (m) => m.AuditLogsComponent
      )
  }
];
