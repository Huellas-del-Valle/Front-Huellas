import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly iconName: string;
}

export type NavigationItem = NavItem;

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  readonly apiUrl = environment.apiUrl;

  // Estado del sidebar en escritorio (expandido vs colapsado)
  readonly isCollapsed = signal<boolean>(false);

  // Estado del drawer en móviles
  readonly isMobileOpen = signal<boolean>(false);

  // Módulos exactos según el mockup de navegación
  readonly navItems = signal<readonly NavItem[]>([
    { label: 'Dashboard', path: '/dashboard', iconName: 'grid' },
    { label: 'Roles y Permisos', path: '/roles', iconName: 'roles' },
    { label: 'Gestión de Usuarios', path: '/users', iconName: 'users' },
    { label: 'Clientes', path: '/clients', iconName: 'heart' },
    { label: 'Mascotas', path: '/pets', iconName: 'paw' },
    { label: 'Agenda de Citas', path: '/appointments', iconName: 'clock' },
    { label: 'Inventario', path: '/inventory', iconName: 'box' },
    { label: 'Proveedores', path: '/suppliers', iconName: 'truck' },
    { label: 'Caja', path: '/cash', iconName: 'cash' },
    { label: 'Reportes y Auditoría', path: '/reports', iconName: 'reports' }
  ]);

  toggleSidebarCollapse(): void {
    this.isCollapsed.update((val) => !val);
  }

  toggleMobileMenu(): void {
    this.isMobileOpen.update((val) => !val);
  }

  closeMobileMenu(): void {
    this.isMobileOpen.set(false);
  }
}
