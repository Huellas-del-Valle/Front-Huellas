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
        error: (err) => {
          this.isLoading.set(false);
          if (err?.status === 0) {
            const demoPets: Record<string, Pet> = {
              'pet-1': {
                id: 'pet-1',
                uniqueCode: 'HUV-2026-0001',
                name: 'Max',
                species: 'CANINO',
                breed: 'Golden Retriever',
                birthDate: '2022-04-15',
                estimatedAge: '4 años',
                gender: 'MACHO',
                color: 'Dorado',
                microchip: '985112004589321',
                clientId: 'cli-1',
                client: {
                  id: 'cli-1',
                  identification: '1088234567',
                  fullName: 'María Camila Gómez',
                  phone: '3124567890'
                }
              },
              'pet-2': {
                id: 'pet-2',
                uniqueCode: 'HUV-2026-0002',
                name: 'Luna',
                species: 'FELINO',
                breed: 'Siamés',
                birthDate: '2023-08-10',
                estimatedAge: '3 años',
                gender: 'HEMBRA',
                color: 'Crema y marrón',
                clientId: 'cli-2',
                client: {
                  id: 'cli-2',
                  identification: '1090112233',
                  fullName: 'Andrés Felipe Rojas',
                  phone: '3159876543'
                }
              }
            };
            const demo = demoPets[petId];
            if (demo) {
              this.pet.set(demo);
              return;
            }
          }
          this.errorMessage.set('No se encontró la ficha del paciente solicitado.');
        }
      });
  }
}
