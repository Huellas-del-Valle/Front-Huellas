import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/auth/access-denied.component').then(
        (m) => m.AccessDeniedComponent
      )
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'] }
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'users',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('./features/users/users.routes').then((m) => m.USERS_ROUTES)
      },
      {
        path: 'clients',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'] },
        loadChildren: () =>
          import('./features/clients/clients.routes').then((m) => m.CLIENTS_ROUTES)
      },
      {
        path: 'patients',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'] },
        loadChildren: () =>
          import('./features/patients/patients.routes').then(
            (m) => m.PATIENTS_ROUTES
          )
      },
      {
        path: 'pets',
        redirectTo: 'patients',
        pathMatch: 'full'
      },
      {
        path: 'medical-records',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'VETERINARIO'] },
        loadChildren: () =>
          import('./features/medical-records/medical-records.routes').then(
            (m) => m.MEDICAL_RECORDS_ROUTES
          )
      },
      {
        path: 'appointments',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'] },
        loadChildren: () =>
          import('./features/appointments/appointments.routes').then(
            (m) => m.APPOINTMENTS_ROUTES
          )
      },
      {
        path: 'inventory',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'RECEPCIONISTA'] },
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then(
            (m) => m.INVENTORY_ROUTES
          )
      },
      {
        path: 'suppliers',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'RECEPCIONISTA'] },
        loadChildren: () =>
          import('./features/inventory/suppliers.routes').then(
            (m) => m.SUPPLIERS_ROUTES
          )
      },
      {
        path: 'billing',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'RECEPCIONISTA'] },
        loadChildren: () =>
          import('./features/billing/billing.routes').then((m) => m.BILLING_ROUTES)
      },
      {
        path: 'cash',
        redirectTo: 'billing/cash-register',
        pathMatch: 'full'
      },
      {
        path: 'cash-register',
        redirectTo: 'billing/cash-register',
        pathMatch: 'full'
      },
      {
        path: 'reports',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
