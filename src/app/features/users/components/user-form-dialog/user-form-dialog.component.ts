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
import { UsersService } from '../../services/users.service';
import {
  CreateUserDto,
  ROLE_DESCRIPTIONS,
  RoleDescription,
  UpdateUserDto,
  User
} from '../../models/user.model';
import { UserRole } from '../../../../core/models/auth.models';

/** Validador de contraseña segura: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número */
export function securePasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const hasMinLength = value.length >= 8;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      return {
        securePassword: {
          hasMinLength,
          hasUpper,
          hasLower,
          hasNumber,
          message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas y números.'
        }
      };
    }
    return null;
  };
}

/** Validador de formato de correo institucional */
export function institutionalEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) {
      return { invalidEmailFormat: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = input<User | null>(null);
  readonly existingEmails = input<readonly string[]>([]);

  readonly saved = output<User>();
  readonly closed = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly isEditMode = computed(() => this.user() !== null);
  readonly availableRoles: readonly RoleDescription[] = Object.values(ROLE_DESCRIPTIONS);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, institutionalEmailValidator()]],
    password: ['', [Validators.required, securePasswordValidator()]],
    role: ['VETERINARIO' as UserRole, [Validators.required]],
    phone: [''],
    identification: [''],
    isActive: [true]
  });

  get fullName() {
    return this.form.controls.fullName;
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  get role() {
    return this.form.controls.role;
  }

  get phone() {
    return this.form.controls.phone;
  }

  get identification() {
    return this.form.controls.identification;
  }

  get isActive() {
    return this.form.controls.isActive;
  }

  constructor() {
    effect(() => {
      const existing = this.user();
      if (existing) {
        // En modo edición la contraseña es opcional
        this.password.clearValidators();
        this.password.setValidators([securePasswordValidator()]);
        this.password.updateValueAndValidity();

        this.form.patchValue({
          fullName: existing.fullName,
          email: existing.email,
          role: existing.role,
          phone: existing.phone ?? '',
          identification: existing.identification ?? '',
          isActive: existing.isActive
        });
      }
    });
  }

  ngOnInit(): void {
    // Inicialización de valores si fueron provistos antes de OnInit
    const existing = this.user();
    if (existing) {
      this.password.clearValidators();
      this.password.setValidators([securePasswordValidator()]);
      this.password.updateValueAndValidity();

      this.form.patchValue({
        fullName: existing.fullName,
        email: existing.email,
        role: existing.role,
        phone: existing.phone ?? '',
        identification: existing.identification ?? '',
        isActive: existing.isActive
      });
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  selectRole(newRole: UserRole): void {
    this.role.setValue(newRole);
    this.role.markAsDirty();
  }

  getSelectedRoleDescription(): RoleDescription {
    return ROLE_DESCRIPTIONS[this.role.value] ?? ROLE_DESCRIPTIONS.VETERINARIO;
  }

  close(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    this.submitError.set(null);

    // Validación de correo duplicado en cliente antes de enviar
    const currentEmail = this.email.value.trim().toLowerCase();
    const existingList = this.existingEmails().map((e) => e.toLowerCase());
    const isSelfEmail = this.user()?.email.toLowerCase() === currentEmail;

    if (!isSelfEmail && existingList.includes(currentEmail)) {
      this.email.setErrors({ duplicate: true });
      this.email.markAsTouched();
      this.submitError.set('El correo institucional ya se encuentra registrado por otro empleado.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formValues = this.form.getRawValue();
    const existing = this.user();

    if (existing) {
      const updatePayload: UpdateUserDto = {
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        role: formValues.role,
        phone: formValues.phone.trim() || undefined,
        identification: formValues.identification.trim() || undefined,
        isActive: formValues.isActive,
        ...(formValues.password.trim() ? { password: formValues.password.trim() } : {})
      };

      this.usersService
        .updateUser(existing.id, updatePayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedUser) => {
            this.isSubmitting.set(false);
            this.saved.emit(updatedUser);
          },
          error: (err: unknown) => {
            this.handleSubmissionError(err);
          }
        });
    } else {
      const createPayload: CreateUserDto = {
        fullName: formValues.fullName.trim(),
        email: formValues.email.trim(),
        password: formValues.password.trim(),
        role: formValues.role,
        phone: formValues.phone.trim() || undefined,
        identification: formValues.identification.trim() || undefined,
        isActive: formValues.isActive
      };

      this.usersService
        .createUser(createPayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (newUser) => {
            this.isSubmitting.set(false);
            this.saved.emit(newUser);
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

      if (httpError.status === 409 || (httpError.error?.message && /duplicate|ya existe|already exists/i.test(httpError.error.message))) {
        this.email.setErrors({ duplicate: true });
        this.email.markAsTouched();
        this.submitError.set('El correo institucional ya se encuentra registrado por otro empleado.');
        return;
      }

      if (httpError.status === 400) {
        this.submitError.set(httpError.error?.message ?? 'Los datos ingresados no son válidos. Verifica los campos.');
        return;
      }
    }

    this.submitError.set('Ocurrió un error inesperado al guardar el usuario. Intenta nuevamente.');
  }
}
