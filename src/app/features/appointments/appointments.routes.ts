import { Routes } from '@angular/router';

export const APPOINTMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/appointment-calendar/appointment-calendar.component').then(
        (m) => m.AppointmentCalendarComponent
      )
  }
];
