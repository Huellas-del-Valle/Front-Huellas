import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { UserRole } from '../../core/models/auth.models';

interface LoginFormGroup {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Estado de carga durante la petición activa */
  readonly isLoading = signal<boolean>(false);

  /** Mensaje de error amigable para el usuario */
  readonly errorMessage = signal<string | null>(null);

  /** Control para alternar visibilidad de la contraseña */
  readonly showPassword = signal<boolean>(false);

  /** URL destino previa a la redirección de autenticación */
  readonly returnUrl = signal<string>(
    this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard'
  );

  /** Formulario reactivo estrictamente tipado con validaciones obligatorias y formato de correo */
  readonly loginForm = new FormGroup<LoginFormGroup>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  get email() {
    return this.loginForm.controls.email;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const credentials = {
      email: this.loginForm.controls.email.value.trim(),
      password: this.loginForm.controls.password.value
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        const target = this.returnUrl();
        const destination =
          target && target !== '/login' && target !== '/access-denied' ? target : '/dashboard';
        void this.router.navigateByUrl(destination);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.handleLoginError(error);
      }
    });
  }

  private handleLoginError(error: unknown): void {
    if (error instanceof HttpErrorResponse || (typeof error === 'object' && error !== null && 'status' in error)) {
      const httpError = error as { status: number };
      if (httpError.status === 401) {
        // Mensaje seguro sin revelar si el correo existe o si la clave falló (anti-enumeración)
        this.errorMessage.set('Correo institucional o contraseña incorrectos. Verifica tus credenciales.');
        return;
      }
      if (httpError.status === 0) {
        this.errorMessage.set('No se pudo conectar con el servidor. Verifica tu conexión a internet o intenta más tarde.');
        return;
      }
      if (httpError.status >= 500) {
        this.errorMessage.set('El servicio de autenticación no se encuentra disponible temporalmente. Intenta más tarde.');
        return;
      }
    }

    this.errorMessage.set('Ocurrió un error inesperado al procesar el inicio de sesión. Intenta nuevamente.');
  }

  /** Atajo para desarrollo / pruebas locales sin backend activo */
  loginAs(role: UserRole): void {
    const names: Record<UserRole, string> = {
      ADMIN: 'Dr. Roberto Mendoza',
      VETERINARIO: 'Dra. Camila Torres',
      RECEPCIONISTA: 'Sandra Morales'
    };
    this.sessionService.setMockSession(role, names[role]);
    void this.router.navigateByUrl(this.returnUrl());
  }
}
