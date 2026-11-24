import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { PetsService } from '../../../patients/services/pets.service';
import { Pet } from '../../../patients/models/pet.model';
import { PatientBadgeComponent } from '../../../../shared/components/patient-badge/patient-badge.component';
import { MedicalRecordsService } from '../../services/medical-records.service';
import {
  MEDICAL_RECORD_TYPE_CONFIG,
  MOCK_MEDICAL_RECORDS,
  MOCK_PATIENTS_CATALOG,
  MOCK_PATIENT_FALLBACK,
  MedicalRecord,
  MedicalRecordType
} from '../../models/medical-record.model';
import { ConsultationFormComponent } from '../consultation-form/consultation-form.component';
import { buildClinicalHistoryPdfBlob } from '../../utils/demo-pdf.util';

@Component({
  selector: 'app-medical-timeline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PatientBadgeComponent,
    ConsultationFormComponent
  ],
  templateUrl: './medical-timeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MedicalTimelineComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly petsService = inject(PetsService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  readonly patient = signal<Pet>(MOCK_PATIENT_FALLBACK);
  readonly availablePatients = signal<readonly Pet[]>(MOCK_PATIENTS_CATALOG);
  readonly records = signal<MedicalRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isExportingPdf = signal(false);
  readonly lastLoadTimeMs = signal<number>(0);

  readonly filterDate = signal<string>('');
  readonly filterType = signal<MedicalRecordType | 'ALL'>('ALL');
  readonly sortDirection = signal<'DESC' | 'ASC'>('DESC');

  readonly showConsultationForm = signal(false);
  readonly editingRecord = signal<MedicalRecord | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly typeConfig = MEDICAL_RECORD_TYPE_CONFIG;
  readonly recordTypeOptions: readonly { value: MedicalRecordType; label: string }[] = (
    Object.keys(MEDICAL_RECORD_TYPE_CONFIG) as MedicalRecordType[]
  ).map((key) => ({
    value: key,
    label: MEDICAL_RECORD_TYPE_CONFIG[key].label
  }));

  /** Solo el rol VETERINARIO puede crear o editar consultas médicas */
  readonly canEditConsultations = computed(() =>
    this.authService.hasRole('VETERINARIO')
  );

  /** Registros ordenados cronológicamente y filtrados por fecha o tipo */
  readonly filteredRecords = computed(() => {
    const selectedDate = this.filterDate().trim();
    const selectedType = this.filterType();
    const direction = this.sortDirection();

    const filtered = this.records().filter((rec) => {
      if (selectedType !== 'ALL' && rec.recordType !== selectedType) {
        return false;
      }
      if (selectedDate && !rec.recordDate.startsWith(selectedDate)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.recordDate).getTime();
      const timeB = new Date(b.recordDate).getTime();
      return direction === 'DESC' ? timeB - timeA : timeA - timeB;
    });
  });

  ngOnInit(): void {
    const routePetId =
      this.route.snapshot.paramMap.get('petId') ||
      this.route.snapshot.queryParamMap.get('petId') ||
      MOCK_PATIENT_FALLBACK.id;

    this.loadPatientAndHistory(routePetId);
  }

  onSelectPatient(petId: string): void {
    this.showConsultationForm.set(false);
    this.editingRecord.set(null);
    this.loadPatientAndHistory(petId);
  }

  loadPatientAndHistory(petId: string): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);
    const startTime = performance.now();

    this.petsService.getPetById(petId).subscribe({
      next: (pet) => {
        this.patient.set(pet);
      },
      error: () => {
        const fallback =
          MOCK_PATIENTS_CATALOG.find((p) => p.id === petId) ?? MOCK_PATIENT_FALLBACK;
        this.patient.set(fallback);
      }
    });

    this.medicalRecordsService.getMedicalHistory(petId).subscribe({
      next: (items) => {
        this.records.set(items);
        this.lastLoadTimeMs.set(Math.round(performance.now() - startTime));
        this.isLoading.set(false);
      },
      error: (err) => {
        if (err.status === 0) {
          const mockItems = MOCK_MEDICAL_RECORDS.filter((r) => r.petId === petId);
          this.records.set(mockItems);
        } else {
          this.errorMessage.set('No fue posible consultar el expediente médico.');
        }
        this.lastLoadTimeMs.set(Math.round(performance.now() - startTime));
        this.isLoading.set(false);
      }
    });
  }

  toggleSortDirection(): void {
    this.sortDirection.update((dir) => (dir === 'DESC' ? 'ASC' : 'DESC'));
  }

  clearFilters(): void {
    this.filterDate.set('');
    this.filterType.set('ALL');
  }

  openNewConsultation(): void {
    if (!this.canEditConsultations()) {
      this.errorMessage.set('Solo el rol VETERINARIO puede registrar nuevas consultas.');
      return;
    }
    this.editingRecord.set(null);
    this.showConsultationForm.set(true);
  }

  openEditConsultation(record: MedicalRecord): void {
    if (!this.canEditConsultations()) {
      this.errorMessage.set('Solo el rol VETERINARIO puede editar consultas.');
      return;
    }
    this.editingRecord.set(record);
    this.showConsultationForm.set(true);
  }

  onConsultationSaved(savedRecord: MedicalRecord): void {
    const existingIndex = this.records().findIndex((r) => r.id === savedRecord.id);
    if (existingIndex >= 0) {
      this.records.update((list) =>
        list.map((item) => (item.id === savedRecord.id ? savedRecord : item))
      );
      this.showToast('Atención clínica actualizada correctamente.');
    } else {
      this.records.update((list) => [savedRecord, ...list]);
      this.showToast('Consulta médica registrada en el expediente.');
    }
    this.showConsultationForm.set(false);
    this.editingRecord.set(null);
  }

  onConsultationCancelled(): void {
    this.showConsultationForm.set(false);
    this.editingRecord.set(null);
  }

  exportFullHistoryPdf(): void {
    const currentPet = this.patient();
    this.isExportingPdf.set(true);
    this.errorMessage.set(null);

    this.medicalRecordsService.exportMedicalHistoryPdf(currentPet.id).subscribe({
      next: (blob) => {
        this.triggerPdfDownload(blob, `expediente-${currentPet.uniqueCode}.pdf`);
        this.isExportingPdf.set(false);
        this.showToast(`Expediente ${currentPet.uniqueCode} exportado a PDF.`);
      },
      error: (err) => {
        this.isExportingPdf.set(false);
        if (err.status === 0) {
          const fallbackBlob = buildClinicalHistoryPdfBlob(
            currentPet,
            this.filteredRecords()
          );
          this.triggerPdfDownload(fallbackBlob, `expediente-${currentPet.uniqueCode}.pdf`);
          this.showToast(`Expediente ${currentPet.uniqueCode} exportado a PDF (modo demo).`);
          return;
        }
        this.errorMessage.set('Error al generar el PDF del expediente médico.');
      }
    });
  }

  exportSingleRecordPdf(record: MedicalRecord): void {
    this.isExportingPdf.set(true);
    this.errorMessage.set(null);

    this.medicalRecordsService.exportConsultationPdf(record.id).subscribe({
      next: (blob) => {
        this.triggerPdfDownload(blob, `atencion-${record.id}.pdf`);
        this.isExportingPdf.set(false);
        this.showToast('Atención clínica exportada a PDF.');
      },
      error: (err) => {
        this.isExportingPdf.set(false);
        if (err.status === 0) {
          const fallbackBlob = buildClinicalHistoryPdfBlob(this.patient(), [record]);
          this.triggerPdfDownload(fallbackBlob, `atencion-${record.id}.pdf`);
          this.showToast('Atención clínica exportada a PDF (modo demo).');
          return;
        }
        this.errorMessage.set('Error al generar el PDF de la atención médica.');
      }
    });
  }

  triggerPdfDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }
}

