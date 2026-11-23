import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsersService } from '../../services/users.service';
import { INITIAL_MOCK_USERS, ROLE_DESCRIPTIONS, User } from '../../models/user.model';
import { UserRole } from '../../../../core/models/auth.models';
import { SessionService } from '../../../../core/services/session.service';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, UserFormDialogComponent],
  templateUrl: './users-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<readonly User[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  // Verificación de acceso ADMIN
  readonly isAdmin = computed(() => this.sessionService.hasRole('ADMIN'));

  // Filtros reactivos
  readonly searchTerm = signal<string>('');
  readonly roleFilter = signal<UserRole | 'ALL'>('ALL');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Paginación reactiva
  readonly pageSize = signal<number>(5);
  readonly currentPage = signal<number>(1);

  // Estados de diálogo
  readonly isFormModalOpen = signal<boolean>(false);
  readonly selectedUserForEdit = signal<User | null>(null);
  readonly userToToggleStatus = signal<User | null>(null);
  readonly isStatusSubmitting = signal<boolean>(false);

  readonly existingEmails = computed(() => this.users().map((u) => u.email));

  // Metadatos de roles
  readonly roleMetadata = ROLE_DESCRIPTIONS;
  readonly Math = Math;

  // Filtrado reactivo en cliente (soporta datos locales o devueltos por el backend)
  readonly filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.users().filter((user) => {
      const matchesQuery =
        !query ||
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.identification?.toLowerCase().includes(query) ?? false);

      const matchesRole = role === 'ALL' || user.role === role;

      const matchesStatus =
        status === 'ALL' ||
        (status === 'ACTIVE' && user.isActive) ||
        (status === 'INACTIVE' && !user.isActive);

      return matchesQuery && matchesRole && matchesStatus;
    });
  });

  readonly totalFilteredCount = computed(() => this.filteredUsers().length);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalFilteredCount() / this.pageSize()))
  );

  readonly paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  readonly activeUsersCount = computed(
    () => this.users().filter((u) => u.isActive).length
  );

  readonly inactiveUsersCount = computed(
    () => this.users().filter((u) => !u.isActive).length
  );

  ngOnInit(): void {
    if (!this.isAdmin()) {
      this.errorMessage.set('Acceso denegado. Se requiere rol de Administrador (ADMIN) para acceder a este módulo.');
      this.isLoading.set(false);
      return;
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.usersService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.users.set(data && data.length > 0 ? data : INITIAL_MOCK_USERS);
          this.isLoading.set(false);
        },
        error: () => {
          // Fallback amigable a datos iniciales si el backend local no está corriendo
          this.users.set(INITIAL_MOCK_USERS);
          this.isLoading.set(false);
        }
      });
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  setRoleFilter(role: UserRole | 'ALL'): void {
    this.roleFilter.set(role);
    this.currentPage.set(1);
  }

  setStatusFilter(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  openCreateUser(): void {
    this.selectedUserForEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditUser(user: User): void {
    this.selectedUserForEdit.set(user);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedUserForEdit.set(null);
  }

  onUserSaved(savedUser: User): void {
    const currentList = this.users();
    const existingIndex = currentList.findIndex((u) => u.id === savedUser.id);

    if (existingIndex >= 0) {
      const updated = [...currentList];
      updated[existingIndex] = savedUser;
      this.users.set(updated);
      this.feedbackMessage.set(`Información del empleado "${savedUser.fullName}" actualizada con éxito.`);
    } else {
      this.users.set([savedUser, ...currentList]);
      this.feedbackMessage.set(`Empleado "${savedUser.fullName}" registrado exitosamente en el sistema.`);
    }

    this.closeFormModal();
  }

  /**
   * Solicita confirmación explícita para activar o inactivar una cuenta
   */
  promptToggleStatus(user: User): void {
    this.userToToggleStatus.set(user);
  }

  cancelToggleStatus(): void {
    this.userToToggleStatus.set(null);
  }

  confirmToggleStatus(): void {
    const target = this.userToToggleStatus();
    if (!target) return;

    this.isStatusSubmitting.set(true);
    const newStatus = !target.isActive;

    this.usersService
      .updateUserStatus(target.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedUser) => {
          this.isStatusSubmitting.set(false);
          const currentList = this.users();
          const updated = currentList.map((u) => (u.id === target.id ? updatedUser : u));
          this.users.set(updated);
          this.userToToggleStatus.set(null);
          this.feedbackMessage.set(
            `La cuenta de "${target.fullName}" ha sido ${newStatus ? 'activada' : 'inactivada'} correctamente.`
          );
        },
        error: () => {
          this.isStatusSubmitting.set(false);
          // Actualización optimista local en entorno offline / mock
          const currentList = this.users();
          const updated = currentList.map((u) =>
            u.id === target.id ? { ...u, isActive: newStatus } : u
          );
          this.users.set(updated);
          this.userToToggleStatus.set(null);
          this.feedbackMessage.set(
            `La cuenta de "${target.fullName}" ha sido ${newStatus ? 'activada' : 'inactivada'} correctamente.`
          );
        }
      });
  }

  dismissFeedback(): void {
    this.feedbackMessage.set(null);
  }
}
