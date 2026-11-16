import { Routes } from '@angular/router';

export const PATIENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/pet-list/pet-list.component').then(
        (m) => m.PetListComponent
      )
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/pet-form/pet-form.component').then(
        (m) => m.PetFormComponent
      )
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/pet-profile/pet-profile.component').then(
        (m) => m.PetProfileComponent
      )
  }
];
