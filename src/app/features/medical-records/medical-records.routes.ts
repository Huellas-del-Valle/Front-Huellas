import { Routes } from '@angular/router';

export const MEDICAL_RECORDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/medical-timeline/medical-timeline.component').then(
        (m) => m.MedicalTimelineComponent
      )
  },
  {
    path: 'pets/:petId',
    loadComponent: () =>
      import('./components/medical-timeline/medical-timeline.component').then(
        (m) => m.MedicalTimelineComponent
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
