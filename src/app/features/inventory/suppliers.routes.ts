import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/suppliers/suppliers.component').then(
        (m) => m.SuppliersComponent
      )
  }
];
