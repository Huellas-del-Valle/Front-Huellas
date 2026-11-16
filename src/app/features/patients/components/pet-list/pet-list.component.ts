import { Component, ChangeDetectionStrategy, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PetsService } from '../../services/pets.service';
import { Pet, PetSpecies } from '../../models/pet.model';
import { PatientBadgeComponent } from '../../../../shared/components/patient-badge/patient-badge.component';

@Component({
  selector: 'app-pet-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientBadgeComponent],
  templateUrl: './pet-list.component.html',
  styleUrls: ['./pet-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetListComponent implements OnInit {
  private readonly petsService = inject(PetsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pets = signal<readonly Pet[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedSpecies = signal<'ALL' | PetSpecies>('ALL');

  // Filtrado reactivo instantáneo (<1s - RNF-09)
  readonly filteredPets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const species = this.selectedSpecies();

    return this.pets().filter((pet) => {
      const matchesSpecies = species === 'ALL' || pet.species === species;
      if (!matchesSpecies) return false;

      if (!term) return true;
      return (
        pet.uniqueCode.toLowerCase().includes(term) ||
        pet.name.toLowerCase().includes(term) ||
        pet.breed.toLowerCase().includes(term) ||
        (pet.client?.fullName.toLowerCase().includes(term) ?? false) ||
        (pet.client?.identification.toLowerCase().includes(term) ?? false)
      );
    });
  });

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.petsService
      .getAllPets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pets.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('No se pudo cargar el catálogo de pacientes. Verifique la conexión con el servidor.');
        }
      });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  setSpeciesFilter(species: 'ALL' | PetSpecies): void {
    this.selectedSpecies.set(species);
  }
}
