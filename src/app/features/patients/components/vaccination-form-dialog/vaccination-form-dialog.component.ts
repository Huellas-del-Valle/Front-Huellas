import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VaccinationService } from '../../services/vaccination.service';
import {
  CreateVaccinationDto,
  VaccinationRecord,
  VaccinationType
} from '../../models/vaccination.model';

export const nextDueDateAfterApplicationValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const appDate = group.get('applicationDate')?.value as string | undefined;
  const nextDate = group.get('nextDueDate')?.value as string | undefined;

  if (!appDate || !nextDate) {
    return null;
  }

  return nextDate < appDate ? { nextDueDateBeforeApplication: true } : null;
};

@Component({
  selector: 'app-vaccination-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './vaccination-form-dialog.component.html',
  styleUrls: ['./vaccination-form-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VaccinationFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vaccinationService = inject(VaccinationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly petId = input.required<string>();
  readonly defaultType = input<VaccinationType>('VACUNA');

  readonly saved = output<VaccinationRecord>();
  readonly closed = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  private readonly todayIso = new Date().toISOString().slice(0, 10);

  readonly form = this.fb.nonNullable.group(
    {
      type: ['VACUNA' as VaccinationType, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      batchNumber: ['', [Validators.required, Validators.minLength(2)]],
      applicationDate: [this.todayIso, [Validators.required]],
      nextDueDate: ['', [Validators.required]]
    },
    { validators: [nextDueDateAfterApplicationValidator] }
  );

  ngOnInit(): void {
    this.form.patchValue({ type: this.defaultType() });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const payload: CreateVaccinationDto = this.form.getRawValue();

    this.vaccinationService
      .createVaccination(this.petId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.saved.emit(created);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting.set(false);
          this.submitError.set(
            err?.error?.message || 'No se pudo registrar la aplicación clínica.'
          );
        }
      });
  }

  close(): void {
    this.closed.emit();
  }
}
