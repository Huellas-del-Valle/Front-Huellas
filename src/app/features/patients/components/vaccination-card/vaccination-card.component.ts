import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VaccinationService } from '../../services/vaccination.service';
import { PetsService } from '../../services/pets.service';
import { Pet } from '../../models/pet.model';
import {
  VaccinationRecord,
  VaccinationType,
  ValidityEvaluation,
  evaluateVaccinationValidity
} from '../../models/vaccination.model';
import { PatientBadgeComponent } from '../../../../shared/components/patient-badge/patient-badge.component';
import { VaccinationFormDialogComponent } from '../vaccination-form-dialog/vaccination-form-dialog.component';

@Component({
  selector: 'app-vaccination-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PatientBadgeComponent,
    VaccinationFormDialogComponent
  ],
  templateUrl: './vaccination-card.component.html',
  styleUrls: ['./vaccination-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VaccinationCardComponent implements OnInit {
  private readonly vaccinationService = inject(VaccinationService);
  private readonly petsService = inject(PetsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly petIdInput = input<string | undefined>(undefined, { alias: 'petId' });

  readonly resolvedPetId = computed(
    () =>
      this.petIdInput() ||
      this.route.snapshot.paramMap.get('id') ||
      'demo-pet-001'
  );

  readonly pet = signal<Pet | null>(null);
  readonly records = signal<readonly VaccinationRecord[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly activeTab = signal<VaccinationType>('VACUNA');
  readonly isDialogOpen = signal<boolean>(false);
  readonly sendingReminderId = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);
  readonly isExportingPdf = signal<boolean>(false);

  readonly vaccinesCount = computed(
    () => this.records().filter((r) => r.type === 'VACUNA').length
  );

  readonly dewormersCount = computed(
    () => this.records().filter((r) => r.type === 'DESPARASITANTE').length
  );

  readonly filteredRecords = computed(() =>
    this.records().filter((r) => r.type === this.activeTab())
  );

  ngOnInit(): void {
    this.loadPatientAndVaccinations();
  }

  loadPatientAndVaccinations(): void {
    const id = this.resolvedPetId();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.petsService
      .getPetById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (petData) => this.pet.set(petData),
        error: () => this.pet.set(null)
      });

    this.vaccinationService
      .getVaccinationsByPet(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.records.set(list);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set(
            'No se pudo cargar el esquema de vacunación del paciente.'
          );
        }
      });
  }

  setTab(tab: VaccinationType): void {
    this.activeTab.set(tab);
  }

  openNewDoseDialog(): void {
    this.isDialogOpen.set(true);
  }

  closeDialog(): void {
    this.isDialogOpen.set(false);
  }

  onRecordSaved(created: VaccinationRecord): void {
    this.records.update((current) => [created, ...current]);
    this.activeTab.set(created.type);
    this.isDialogOpen.set(false);
    this.feedbackMessage.set(`Se registró "${created.name}" en el carné digital.`);
  }

  getValidity(record: VaccinationRecord): ValidityEvaluation {
    return evaluateVaccinationValidity(record.nextDueDate);
  }

  triggerReminder(record: VaccinationRecord): void {
    this.sendingReminderId.set(record.id);
    this.feedbackMessage.set(null);

    this.vaccinationService
      .sendReminder(this.resolvedPetId(), record.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.records.update((items) =>
            items.map((item) =>
              item.id === record.id ? { ...item, notified: res.notified ?? true } : item
            )
          );
          this.sendingReminderId.set(null);
          this.feedbackMessage.set(
            `Recordatorio de "${record.name}" enviado al correo del propietario.`
          );
        },
        error: () => {
          this.sendingReminderId.set(null);
          this.feedbackMessage.set(
            'No se pudo enviar el recordatorio en este momento. Verifique el servicio de correo.'
          );
        }
      });
  }

  exportCertificatePdf(): void {
    this.isExportingPdf.set(true);

    this.vaccinationService
      .downloadCertificatePdf(this.resolvedPetId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `carne-vacunacion-${this.pet()?.uniqueCode || this.resolvedPetId()}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.isExportingPdf.set(false);
        },
        error: () => {
          this.isExportingPdf.set(false);
          if (typeof window !== 'undefined' && typeof window.print === 'function') {
            window.print();
          }
        }
      });
  }
}
