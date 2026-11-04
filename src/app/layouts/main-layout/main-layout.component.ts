import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

export interface NavigationItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly badge?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  // Estado reactivo para visibilidad del drawer móvil
  readonly isSidebarOpen = signal<boolean>(false);

  // Menú dinámico tipado según casos de uso del SRS
  readonly navigationItems = signal<readonly NavigationItem[]>([
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Agenda y Citas', path: '/appointments', icon: 'calendar' },
    { label: 'Clientes y Mascotas', path: '/patients', icon: 'pets' },
    { label: 'Historias Clínicas', path: '/medical-records', icon: 'clinical_notes' },
    { label: 'Inventario y Farmacia', path: '/inventory', icon: 'inventory' },
    { label: 'Facturación y Caja', path: '/billing', icon: 'payments' }
  ]);

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}

