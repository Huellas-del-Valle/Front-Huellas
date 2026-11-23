import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  effect,
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
import { HttpErrorResponse } from '@angular/common/http';
import { ClientsService } from '../../services/clients.service';
import { Client, CreateClientDto, UpdateClientDto } from '../../models/client.model';

export function identificationValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const clean = value.toString().trim();
    if (clean.length < 6 || clean.length > 15) {
      return { invalidIdentificationLength: true };
    }
    if (!/^[0-9a-zA-Z-]+$/.test(clean)) {
      return { invalidIdentificationFormat: true };
    }
    return null;
  };
}

export function colombianPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const clean = value.toString().replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(clean)) {
      return { invalidPhoneFormat: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clientsService = inject(ClientsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly client = input<Client | null>(null);
  readonly existingIdentifications = input<readonly string[]>([]);

  readonly saved = output<Client>();
  readonly closed = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  readonly isEditMode = computed(() => this.client() !== null);

  readonly form = this.fb.group({
    identification: [
      '',
      [Validators.required, Validators.minLength(6), identificationValidator()]
    ],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, colombianPhoneValidator()]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    dataProcessingAuthorized: [false, [Validators.requiredTrue]]
  });

  get identification() {
    return this.form.controls.identification;
  }

  get fullName() {
    return this.form.controls.fullName;
  }

  get phone() {
    return this.form.controls.phone;
  }

  get email() {
    return this.form.controls.email;
  }

  get address() {
    return this.form.controls.address;
  }

  get dataProcessingAuthorized() {
    return this.form.controls.dataProcessingAuthorized;
  }

  constructor() {
    effect(() => {
      const existing = this.client();
      if (existing) {
        this.form.patchValue({
          identification: existing.identification,
          fullName: existing.fullName,
          phone: existing.phone,
          email: existing.email,
          address: existing.address,
          dataProcessingAuthorized: existing.dataProcessingAuthorized
        });
      }
    });
  }

  ngOnInit(): void {
    const existing = this.client();
    if (existing) {
      this.form.patchValue({
        identification: existing.identification,
        fullName: existing.fullName,
        phone: existing.phone,
        email: existing.email,
        address: existing.address,
        dataProcessingAuthorized: existing.dataProcessingAuthorized
      });
    }
  }

  close(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    this.submitError.set(null);

    // Validación preventiva de documento duplicado en cliente
    const currentId = this.identification.value?.trim();
    if (currentId) {
      const existingList = this.existingIdentifications().map((id) => id.trim().toLowerCase());
      const isSelfId = this.client()?.identification.trim().toLowerCase() === currentId.toLowerCase();

      if (!isSelfId && existingList.includes(currentId.toLowerCase())) {
        this.identification.setErrors({ duplicate: true });
        this.identification.markAsTouched();
        this.submitError.set('El documento de identidad ya se encuentra registrado por otro propietario.');
        return;
      }
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formValues = this.form.getRawValue();
    const existing = this.client();

    if (existing) {
      const updatePayload: UpdateClientDto = {
        identification: formValues.identification?.trim(),
        fullName: formValues.fullName?.trim(),
        phone: formValues.phone?.trim(),
        email: formValues.email?.trim(),
        address: formValues.address?.trim(),
        dataProcessingAuthorized: formValues.dataProcessingAuthorized ?? true
      };

      this.clientsService
        .updateClient(existing.id, updatePayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedClient) => {
            this.isSubmitting.set(false);
            this.saved.emit(updatedClient);
          },
          error: (err: unknown) => {
            this.handleSubmissionError(err);
          }
        });
    } else {
      const createPayload: CreateClientDto = {
        identification: formValues.identification!.trim(),
        fullName: formValues.fullName!.trim(),
        phone: formValues.phone!.trim(),
        email: formValues.email!.trim(),
        address: formValues.address!.trim(),
        dataProcessingAuthorized: formValues.dataProcessingAuthorized!
      };

      this.clientsService
        .createClient(createPayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (newClient) => {
            this.isSubmitting.set(false);
            this.saved.emit(newClient);
          },
          error: (err: unknown) => {
            this.handleSubmissionError(err);
          }
        });
    }
  }

  private handleSubmissionError(error: unknown): void {
    this.isSubmitting.set(false);

    if (error instanceof HttpErrorResponse || (typeof error === 'object' && error !== null && 'status' in error)) {
      const httpError = error as { status: number; error?: { message?: string } };

      if (
        httpError.status === 409 ||
        (httpError.error?.message && /duplicate|ya existe|already exists/i.test(httpError.error.message))
      ) {
        this.identification.setErrors({ duplicate: true });
        this.identification.markAsTouched();
        this.submitError.set('El documento de identidad ya se encuentra registrado por otro propietario.');
        return;
      }

      if (httpError.status === 400) {
        this.submitError.set(
          httpError.error?.message ?? 'Los datos ingresados no son válidos o están incompletos.'
        );
        return;
      }
    }

    this.submitError.set('Ocurrió un error inesperado al guardar los datos del propietario. Intenta nuevamente.');
  }
}
