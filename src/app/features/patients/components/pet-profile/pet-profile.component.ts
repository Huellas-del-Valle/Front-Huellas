import { Component, ChangeDetectionStrategy, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PetsService } from '../../services/pets.service';
import { Pet } from '../../models/pet.model';
import { PatientBadgeComponent } from '../../../../shared/components/patient-badge/patient-badge.component';

@Component({
  selector: 'app-pet-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientBadgeComponent],
  templateUrl: './pet-profile.component.html',
  styleUrls: ['./pet-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly petsService = inject(PetsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pet = signal<Pet | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const petId = this.route.snapshot.paramMap.get('id');
    if (!petId) {
      this.isLoading.set(false);
      this.errorMessage.set('Identificador de paciente no especificado.');
      return;
    }

    this.petsService
      .getPetById(petId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pet.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('No se encontró la ficha del paciente solicitado.');
        }
      });
  }
}
