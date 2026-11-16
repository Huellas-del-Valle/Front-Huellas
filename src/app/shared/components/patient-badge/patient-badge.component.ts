import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetSpecies } from '../../../features/patients/models/pet.model';

@Component({
  selector: 'app-patient-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-badge.component.html',
  styleUrls: ['./patient-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientBadgeComponent {
  readonly uniqueCode = input.required<string>();
  readonly name = input.required<string>();
  readonly species = input.required<PetSpecies>();
  readonly breed = input<string | undefined>(undefined);
  readonly ownerName = input<string | undefined>(undefined);
  readonly compact = input<boolean>(false);

  readonly speciesConfig = computed(() => {
    switch (this.species()) {
      case 'CANINO':
        return {
          label: 'Canino',
          emoji: '🐕',
          badgeClasses: 'bg-sky-50 text-sky-800 border-sky-200',
          codeClasses: 'bg-sky-700 text-white'
        };
      case 'FELINO':
        return {
          label: 'Felino',
          emoji: '🐈',
          badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200',
          codeClasses: 'bg-amber-700 text-white'
        };
      default:
        return {
          label: 'Otro',
          emoji: '🐾',
          badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          codeClasses: 'bg-pine-700 text-white'
        };
    }
  });
}
