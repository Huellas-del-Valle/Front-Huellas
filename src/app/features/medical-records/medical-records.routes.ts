import { Routes } from '@angular/router';

export const MEDICAL_RECORDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/medical-attachments-page/medical-attachments-page.component').then(
        (m) => m.MedicalAttachmentsPageComponent
      )
  },
  {
    path: ':recordId/attachments',
    loadComponent: () =>
      import('./components/medical-attachments-page/medical-attachments-page.component').then(
        (m) => m.MedicalAttachmentsPageComponent
      )
  }
];
