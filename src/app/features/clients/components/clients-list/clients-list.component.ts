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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientsService } from '../../services/clients.service';
import { Client, INITIAL_MOCK_CLIENTS } from '../../models/client.model';
import { SessionService } from '../../../../core/services/session.service';
import { ClientFormComponent } from '../client-form/client-form.component';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClientFormComponent],
  templateUrl: './clients-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsListComponent implements OnInit {
  private readonly clientsService = inject(ClientsService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly Math = Math;

  readonly clients = signal<readonly Client[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSearching = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  // Verificación de acceso para roles autorizados
  readonly isAuthorized = computed(() =>
    this.sessionService.hasRole(['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'])
  );

  // Control reactivo de búsqueda con debounceTime(300) y distinctUntilChanged
  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  // Paginación reactiva
  readonly pageSize = signal<number>(10);
  readonly currentPage = signal<number>(1);

  // Modal de registro y edición
  readonly isFormModalOpen = signal<boolean>(false);
  readonly selectedClientForEdit = signal<Client | null>(null);

  readonly existingIdentifications = computed(() =>
    this.clients().map((c) => c.identification)
  );

  readonly totalCount = computed(() => this.clients().length);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize()))
  );

  readonly paginatedClients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.clients().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    if (!this.isAuthorized()) {
      this.errorMessage.set(
        'Acceso denegado. Se requiere ser personal autorizado (ADMIN, VETERINARIO, RECEPCIONISTA).'
      );
      this.isLoading.set(false);
      return;
    }

    this.setupReactiveSearch();
    this.loadClients();
  }

  /**
   * Configura el flujo reactivo de búsqueda no bloqueante con debounceTime(300) y distinctUntilChanged
   */
  private setupReactiveSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.isSearching.set(true);
          this.currentPage.set(1);
        }),
        switchMap((term) => this.clientsService.searchClients(term)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          this.clients.set(results);
          this.isSearching.set(false);
        },
        error: () => {
          // Búsqueda en memoria local ante entorno sin backend
          this.isSearching.set(false);
          const term = this.searchControl.value.trim().toLowerCase();
          if (!term) {
            this.clients.set(INITIAL_MOCK_CLIENTS);
          } else {
            const filtered = INITIAL_MOCK_CLIENTS.filter(
              (c) =>
                c.fullName.toLowerCase().includes(term) ||
                c.identification.toLowerCase().includes(term) ||
                c.phone.toLowerCase().includes(term)
            );
            this.clients.set(filtered);
          }
        }
      });
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clientsService
      .getClients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.clients.set(data && data.length > 0 ? data : INITIAL_MOCK_CLIENTS);
          this.isLoading.set(false);
        },
        error: () => {
          // Fallback a los datos mock si el backend no está disponible
          this.clients.set(INITIAL_MOCK_CLIENTS);
          this.isLoading.set(false);
        }
      });
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

  openCreateClient(): void {
    this.selectedClientForEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditClient(client: Client): void {
    this.selectedClientForEdit.set(client);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedClientForEdit.set(null);
  }

  onClientSaved(savedClient: Client): void {
    const currentList = this.clients();
    const existingIndex = currentList.findIndex((c) => c.id === savedClient.id);

    if (existingIndex >= 0) {
      const updated = [...currentList];
      updated[existingIndex] = savedClient;
      this.clients.set(updated);
      this.feedbackMessage.set(
        `Datos del propietario "${savedClient.fullName}" actualizados correctamente.`
      );
    } else {
      this.clients.set([savedClient, ...currentList]);
      this.feedbackMessage.set(
        `Propietario "${savedClient.fullName}" registrado exitosamente en el sistema.`
      );
    }

    this.closeFormModal();
  }

  navigateToDetail(clientId: string): void {
    void this.router.navigate(['/clients', clientId]);
  }

  dismissFeedback(): void {
    this.feedbackMessage.set(null);
  }
}
