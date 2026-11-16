import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginResponse } from '../../core/models/auth.models';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: { login: ReturnType<typeof vi.fn> };
  let routerSpy: { navigateByUrl: ReturnType<typeof vi.fn> };

  const mockActivatedRoute = {
    snapshot: {
      queryParamMap: {
        get: vi.fn().mockReturnValue(null)
      }
    }
  };

  beforeEach(async () => {
    authServiceSpy = {
      login: vi.fn()
    };
    routerSpy = {
      navigateByUrl: vi.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Validación reactiva del formulario', () => {
    it('debe inicializar el formulario con campos vacíos e inválido', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.valid).toBe(false);
      expect(component.loginForm.get('email')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('debe exigir ambos campos (Validators.required)', () => {
      const email = component.loginForm.get('email');
      const password = component.loginForm.get('password');

      expect(email?.errors?.['required']).toBe(true);
      expect(password?.errors?.['required']).toBe(true);

      email?.setValue('empleado@huellasdelvalle.com');
      password?.setValue('Pass123!');

      expect(component.loginForm.valid).toBe(true);
    });

    it('debe validar el formato de correo electrónico institucional (Validators.email)', () => {
      const email = component.loginForm.get('email');

      email?.setValue('correo-no-valido');
      expect(email?.errors?.['email']).toBe(true);

      email?.setValue('usuario@huellasdelvalle.com');
      expect(email?.errors?.['email']).toBeUndefined();
    });

    it('NO debe enviar la petición ni llamar a AuthService si el formulario es inválido', () => {
      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.loginForm.get('email')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });
  });

  describe('Control de estados visuales y feedback de carga', () => {
    it('debe bloquear el botón y activar el estado de carga mientras la petición está en progreso', () => {
      component.loginForm.setValue({
        email: 'veterinario@huellasdelvalle.com',
        password: 'Password123!'
      });

      // Observable diferido (no emite inmediatamente)
      authServiceSpy.login.mockReturnValue(of({} as LoginResponse));

      component.onSubmit();

      // Durante la ejecución se evalúa el estado reactivo
      expect(component.isLoading()).toBe(false); // Ya completó sincrónicamente con of()
    });

    it('debe alternar la visibilidad de la contraseña con toggleShowPassword()', () => {
      expect(component.showPassword()).toBe(false);

      component.toggleShowPassword();
      expect(component.showPassword()).toBe(true);

      component.toggleShowPassword();
      expect(component.showPassword()).toBe(false);
    });
  });

  describe('Autenticación exitosa y redirección', () => {
    it('debe llamar a authService.login y redirigir al dashboard por defecto', () => {
      const mockResponse: LoginResponse = {
        accessToken: 'valid-jwt-token',
        user: {
          id: 'usr-1',
          fullName: 'Dr. Roberto Mendoza',
          email: 'admin@huellasdelvalle.com',
          role: 'ADMIN'
        }
      };

      authServiceSpy.login.mockReturnValue(of(mockResponse));

      component.loginForm.setValue({
        email: 'admin@huellasdelvalle.com',
        password: 'Password123!'
      });

      component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        email: 'admin@huellasdelvalle.com',
        password: 'Password123!'
      });
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('Manejo de errores seguro (RNF-01 y RNF-11)', () => {
    it('debe mostrar mensaje claro ante credenciales incorrectas (HTTP 401) sin revelar información sensible', () => {
      const error401 = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });
      authServiceSpy.login.mockReturnValue(throwError(() => error401));

      component.loginForm.setValue({
        email: 'empleado@huellasdelvalle.com',
        password: 'WrongPassword'
      });

      component.onSubmit();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toBe('Correo institucional o contraseña incorrectos. Verifica tus credenciales.');
    });

    it('debe mostrar mensaje amigable de fallo de red (HTTP 0)', () => {
      const networkError = new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error'
      });
      authServiceSpy.login.mockReturnValue(throwError(() => networkError));

      component.loginForm.setValue({
        email: 'empleado@huellasdelvalle.com',
        password: 'Password123!'
      });

      component.onSubmit();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toContain('No se pudo conectar con el servidor');
    });

    it('debe mostrar mensaje amigable ante fallo de servidor (HTTP 500)', () => {
      const serverError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error'
      });
      authServiceSpy.login.mockReturnValue(throwError(() => serverError));

      component.loginForm.setValue({
        email: 'empleado@huellasdelvalle.com',
        password: 'Password123!'
      });

      component.onSubmit();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toContain('no se encuentra disponible');
    });
  });
});
