import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { MedicalRecordsService } from '../../services/medical-records.service';
import {
  CreateMedicalRecordDto,
  MEDICAL_RECORD_TYPE_CONFIG,
  MOCK_VETERINARIANS,
  MedicalRecord,
  MedicalRecordType,
  PrescriptionItem
} from '../../models/medical-record.model';

function nonEmptyTrimmedValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { required: true };
  }
  return null;
}

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './consultation-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultationFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  readonly petId = input.required<string>();
  readonly editingRecord = input<MedicalRecord | null>(null);

  readonly saved = output<MedicalRecord>();
  readonly cancelled = output<void>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly veterinarians = MOCK_VETERINARIANS;
  readonly recordTypes: readonly { value: MedicalRecordType; label: string }[] = (
    Object.keys(MEDICAL_RECORD_TYPE_CONFIG) as MedicalRecordType[]
  ).map((key) => ({
    value: key,
    label: MEDICAL_RECORD_TYPE_CONFIG[key].label
  }));

  readonly isVeterinarian = computed(() => this.authService.hasRole('VETERINARIO'));
  readonly isEditMode = computed(() => this.editingRecord() !== null);

  readonly form: FormGroup = this.fb.group({
    recordType: ['CONSULTA' as MedicalRecordType, [Validators.required]],
    veterinarianId: ['', [Validators.required, nonEmptyTrimmedValidator]],
    symptoms: ['', [Validators.required, Validators.minLength(5)]],
    weightKg: [null as number | null, [Validators.min(0.05), Validators.max(250)]],
    temperatureC: [null as number | null, [Validators.min(30), Validators.max(45)]],
    diagnosis: ['', [Validators.required, nonEmptyTrimmedValidator, Validators.minLength(3)]],
    treatment: [''],
    prescriptions: this.fb.array<FormGroup>([])
  });

  constructor() {
    effect(() => {
      const record = this.editingRecord();
      this.errorMessage.set(null);

      if (record) {
        this.form.patchValue({
          recordType: record.recordType,
          veterinarianId: record.veterinarianId,
          symptoms: record.symptoms,
          weightKg: record.weightKg,
          temperatureC: record.temperatureC,
          diagnosis: record.diagnosis,
          treatment: record.treatment
        });

        this.prescriptionsArray.clear();
        for (const item of record.prescriptions) {
          this.prescriptionsArray.push(this.createPrescriptionGroup(item));
        }
      } else {
        const defaultVetId = this.resolveDefaultVeterinarianId();
        this.form.reset({
          recordType: 'CONSULTA',
          veterinarianId: defaultVetId,
          symptoms: '',
          weightKg: null,
          temperatureC: null,
          diagnosis: '',
          treatment: ''
        });
        this.prescriptionsArray.clear();
      }
    });
  }

  get prescriptionsArray(): FormArray<FormGroup> {
    return this.form.get('prescriptions') as FormArray<FormGroup>;
  }

  addPrescription(item?: Partial<PrescriptionItem>): void {
    this.prescriptionsArray.push(this.createPrescriptionGroup(item));
  }

  removePrescription(index: number): void {
    if (index >= 0 && index < this.prescriptionsArray.length) {
      this.prescriptionsArray.removeAt(index);
    }
  }

  hasError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.isVeterinarian()) {
      this.errorMessage.set(
        'Solo un usuario con rol VETERINARIO puede registrar o editar consultas médicas.'
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const vetName = this.resolveVeterinarianName(raw.veterinarianId);
    const prescriptions: PrescriptionItem[] = (raw.prescriptions ?? [])
      .filter((p: PrescriptionItem) => p.medication && p.medication.trim().length > 0)
      .map((p: PrescriptionItem) => ({
        medication: p.medication.trim(),
        dosage: (p.dosage ?? '').trim(),
        frequency: (p.frequency ?? '').trim(),
        duration: (p.duration ?? '').trim()
      }));

    this.isSubmitting.set(true);
    const currentEditing = this.editingRecord();

    if (currentEditing) {
      const updateDto = {
        recordType: raw.recordType as MedicalRecordType,
        veterinarianId: raw.veterinarianId as string,
        veterinarianName: vetName,
        symptoms: (raw.symptoms as string).trim(),
        weightKg: raw.weightKg !== null && raw.weightKg !== '' ? Number(raw.weightKg) : null,
        temperatureC:
          raw.temperatureC !== null && raw.temperatureC !== ''
            ? Number(raw.temperatureC)
            : null,
        diagnosis: (raw.diagnosis as string).trim(),
        treatment: (raw.treatment ?? '').trim(),
        prescriptions
      };

      this.medicalRecordsService.updateConsultation(currentEditing.id, updateDto).subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          if (err.status === 0) {
            const optimistic: MedicalRecord = {
              ...currentEditing,
              ...updateDto,
              updatedAt: new Date().toISOString()
            };
            this.saved.emit(optimistic);
            return;
          }
          this.errorMessage.set(
            err.error?.message || 'No fue posible actualizar la consulta médica.'
          );
        }
      });
      return;
    }

    const createDto: CreateMedicalRecordDto = {
      petId: this.petId(),
      recordType: raw.recordType as MedicalRecordType,
      recordDate: new Date().toISOString(),
      veterinarianId: raw.veterinarianId as string,
      veterinarianName: vetName,
      symptoms: (raw.symptoms as string).trim(),
      weightKg: raw.weightKg !== null && raw.weightKg !== '' ? Number(raw.weightKg) : null,
      temperatureC:
        raw.temperatureC !== null && raw.temperatureC !== ''
          ? Number(raw.temperatureC)
          : null,
      diagnosis: (raw.diagnosis as string).trim(),
      treatment: (raw.treatment ?? '').trim(),
      prescriptions
    };

    this.medicalRecordsService.createConsultation(createDto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.saved.emit(created);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 0) {
          const optimistic: MedicalRecord = {
            id: `rec-${Date.now()}`,
            petId: createDto.petId,
            recordType: createDto.recordType,
            recordDate: createDto.recordDate ?? new Date().toISOString(),
            veterinarianId: createDto.veterinarianId,
            veterinarianName: vetName,
            symptoms: createDto.symptoms,
            weightKg: createDto.weightKg,
            temperatureC: createDto.temperatureC,
            diagnosis: createDto.diagnosis,
            treatment: createDto.treatment,
            prescriptions: createDto.prescriptions,
            createdAt: new Date().toISOString()
          };
          this.saved.emit(optimistic);
          return;
        }
        this.errorMessage.set(
          err.error?.message || 'No fue posible guardar la consulta médica.'
        );
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private createPrescriptionGroup(item?: Partial<PrescriptionItem>): FormGroup {
    return this.fb.group({
      medication: [item?.medication ?? '', [Validators.required, nonEmptyTrimmedValidator]],
      dosage: [item?.dosage ?? ''],
      frequency: [item?.frequency ?? ''],
      duration: [item?.duration ?? '']
    });
  }

  private resolveDefaultVeterinarianId(): string {
    const user = this.authService.currentUser();
    if (user && this.authService.hasRole('VETERINARIO')) {
      const matched = this.veterinarians.find(
        (v) =>
          v.id === user.id ||
          v.fullName.toLowerCase() === (user.fullName ?? user.name ?? '').toLowerCase()
      );
      if (matched) {
        return matched.id;
      }
      return user.id || this.veterinarians[0].id;
    }
    return '';
  }

  private resolveVeterinarianName(vetId: string): string {
    const matched = this.veterinarians.find((v) => v.id === vetId);
    if (matched) {
      return matched.fullName;
    }
    const user = this.authService.currentUser();
    return user?.fullName || user?.name || 'Veterinario Asignado';
  }
}

