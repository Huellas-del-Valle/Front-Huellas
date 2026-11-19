import { Routes } from '@angular/router';

export const BILLING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/billing-pos/billing-pos.component').then(
        (m) => m.BillingPosComponent
      )
  },
  {
    path: 'credits',
    loadComponent: () =>
      import('./components/credit-portfolio/credit-portfolio.component').then(
        (m) => m.CreditPortfolioComponent
      )
  },
  {
    path: 'cash-register',
    loadComponent: () =>
      import('./components/cash-register/cash-register.component').then(
        (m) => m.CashRegisterComponent
      )
  }
];
