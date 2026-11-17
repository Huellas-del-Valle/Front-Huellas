import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetSpecies } from '../../../features/patients/models/pet.model';

// Componente transversal de identificación anti-homonimia (RNF-04)
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
  readonly pillOnly = input<boolean>(false);

  readonly speciesConfig = computed(() => {
    switch (this.species()) {
      case 'CANINO':
        return {
          label: 'Perro',
          speciesText: 'Canino',
          badgeClasses: 'bg-sky-50 text-sky-900 border-sky-200',
          pillClasses: 'bg-[#e8f5ee] text-[#0b6b4d] border-[#bbf7d0]',
          tagClasses: 'bg-sky-100/80 text-sky-800'
        };
      case 'FELINO':
        return {
          label: 'Gato',
          speciesText: 'Felino',
          badgeClasses: 'bg-amber-50 text-amber-900 border-amber-200',
          pillClasses: 'bg-[#e8f5ee] text-[#0b6b4d] border-[#bbf7d0]',
          tagClasses: 'bg-amber-100/80 text-amber-800'
        };
      default:
        return {
          label: 'Otro',
          speciesText: 'Otro',
          badgeClasses: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          pillClasses: 'bg-[#e8f5ee] text-[#0b6b4d] border-[#bbf7d0]',
          tagClasses: 'bg-emerald-100/80 text-emerald-800'
        };
    }
  });
}
