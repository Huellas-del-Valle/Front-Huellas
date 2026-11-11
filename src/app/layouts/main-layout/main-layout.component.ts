import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/auth.models';
import { HasRoleDirective } from '../../shared/directives/has-role.directive';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly iconName: string;
  readonly roles?: readonly UserRole[];
}

export type NavigationItem = NavItem;

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HasRoleDirective],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  readonly apiUrl = environment.apiUrl;
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Estado del sidebar en escritorio (expandido vs colapsado)
  readonly isCollapsed = signal<boolean>(false);

  // Estado del drawer en móviles
  readonly isMobileOpen = signal<boolean>(false);

  // Módulos exactos según el mockup de navegación con restricción RBAC
  readonly navItems = signal<readonly NavItem[]>([
    {
      label: 'Dashboard',
      path: '/dashboard',
      iconName: 'grid',
      roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA']
    },
    {
      label: 'Roles y Permisos',
      path: '/roles',
      iconName: 'roles',
      roles: ['ADMIN']
    },
    {
      label: 'Gestión de Usuarios',
      path: '/users',
      iconName: 'users',
      roles: ['ADMIN']
    },
    {
      label: 'Clientes',
      path: '/clients',
      iconName: 'heart',
      roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA']
    },
    {
      label: 'Mascotas',
      path: '/pets',
      iconName: 'paw',
      roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA']
    },
    {
      label: 'Agenda de Citas',
      path: '/appointments',
      iconName: 'clock',
      roles: ['ADMIN', 'VETERINARIO', 'RECEPCIONISTA']
    },
    {
      label: 'Inventario',
      path: '/inventory',
      iconName: 'box',
      roles: ['ADMIN', 'RECEPCIONISTA']
    },
    {
      label: 'Proveedores',
      path: '/suppliers',
      iconName: 'truck',
      roles: ['ADMIN', 'RECEPCIONISTA']
    },
    {
      label: 'Caja',
      path: '/cash',
      iconName: 'cash',
      roles: ['ADMIN', 'RECEPCIONISTA']
    },
    {
      label: 'Reportes y Auditoría',
      path: '/reports',
      iconName: 'reports',
      roles: ['ADMIN']
    }
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

  logout(): void {
    this.authService.clearSession();
    void this.router.navigate(['/login']);
  }
}
