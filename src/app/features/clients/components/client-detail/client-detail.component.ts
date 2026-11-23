import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClientsService } from '../../services/clients.service';
import { Client, INITIAL_MOCK_CLIENTS } from '../../models/client.model';
import { ClientFormComponent } from '../client-form/client-form.component';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ClientFormComponent],
  templateUrl: './client-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientDetailComponent implements OnInit {
  private readonly clientsService = inject(ClientsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly client = signal<Client | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  readonly isEditModalOpen = signal<boolean>(false);

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.loadClientDetail(clientId);
    } else {
      this.errorMessage.set('No se especificó un identificador de cliente válido.');
      this.isLoading.set(false);
    }
  }

  loadClientDetail(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clientsService
      .getClientById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.client.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          // Fallback a los datos mock si el backend no está disponible
          const fallback = INITIAL_MOCK_CLIENTS.find((c) => c.id === id) || INITIAL_MOCK_CLIENTS[0];
          this.client.set(fallback);
          this.isLoading.set(false);
        }
      });
  }

  openEditModal(): void {
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  onClientUpdated(updatedClient: Client): void {
    this.client.set(updatedClient);
    this.closeEditModal();
    this.feedbackMessage.set('Los datos del propietario fueron actualizados correctamente.');
  }

  navigateToPetProfile(petId: string): void {
    void this.router.navigate(['/patients', petId]);
  }

  dismissFeedback(): void {
    this.feedbackMessage.set(null);
  }
}
