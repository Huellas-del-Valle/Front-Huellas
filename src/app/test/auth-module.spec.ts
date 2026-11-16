import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginComponent } from '../features/auth/login.component';
import { AuthService } from '../core/services/auth.service';
import { SessionService } from '../core/services/session.service';
import { LoginResponse } from '../core/models/auth.models';
import { environment } from '../../environments/environment';

describe('Módulo de Autenticación (Auth Module Integration)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: AuthService;
  let sessionService: SessionService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockActivatedRoute = {
    snapshot: {
      queryParamMap: {
        get: vi.fn().mockReturnValue(null)
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        AuthService,
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    sessionService = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    sessionService.clearSession();
  });

  describe('1. Inicialización e Interfaz del Formulario Reactivo', () => {
    it('debe crear el componente y presentar los campos de correo institucional y contraseña', () => {
      expect(component).toBeTruthy();
      expect(component.loginForm).toBeDefined();

      const element: HTMLElement = fixture.nativeElement;
      const emailInput = element.querySelector('input#email');
      const passwordInput = element.querySelector('input#password');
      const submitBtn = element.querySelector('button[type="submit"]');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(submitBtn).toBeTruthy();
    });

    it('debe iniciar con estado de carga inactivo, sin errores y sesión limpia', () => {
      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
      expect(sessionService.isAuthenticated()).toBe(false);
      expect(sessionService.getToken()).toBeNull();
    });

    it('debe alternar la visibilidad de la contraseña en el DOM', () => {
      const element: HTMLElement = fixture.nativeElement;
      const passwordInput = element.querySelector<HTMLInputElement>('input#password');

      expect(passwordInput?.type).toBe('password');

      component.toggleShowPassword();
      fixture.detectChanges();
      expect(passwordInput?.type).toBe('text');

      component.toggleShowPassword();
      fixture.detectChanges();
      expect(passwordInput?.type).toBe('password');
    });
  });

  describe('2. Validaciones de Formulario en Cliente', () => {
    it('debe marcar el formulario como inválido si los campos están vacíos', () => {
      expect(component.loginForm.valid).toBe(false);
      expect(component.email.errors?.['required']).toBe(true);
      expect(component.password.errors?.['required']).toBe(true);
    });

    it('debe exigir un formato de correo electrónico institucional válido', () => {
      component.email.setValue('formato-invalido');
      expect(component.email.errors?.['email']).toBe(true);

      component.email.setValue('veterinario@huellasdelvalle.com');
      expect(component.email.errors?.['email']).toBeUndefined();
    });

    it('NO debe realizar peticiones HTTP si el formulario es inválido al enviar', () => {
      component.onSubmit();
      fixture.detectChanges();

      httpMock.expectNone(`${environment.apiUrl}/auth/login`);
      expect(component.email.touched).toBe(true);
      expect(component.password.touched).toBe(true);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('3. Flujo Completo de Autenticación Exitosa (Integración AuthService + SessionService)', () => {
    it('debe consumir POST /api/v1/auth/login, guardar token/usuario en SessionService y redirigir', () => {
      const mockResponse: LoginResponse = {
        accessToken: 'jwt-valle-super-secure-token',
        user: {
          id: 'usr-vet-001',
          fullName: 'Dra. Camila Morales',
          email: 'camila.morales@huellasdelvalle.com',
          role: 'VETERINARIO'
        }
      };

      component.loginForm.setValue({
        email: 'camila.morales@huellasdelvalle.com',
        password: 'Clinica2026Secure!'
      });

      component.onSubmit();

      // Durante la petición: botón bloqueado y spinner activo
      expect(component.isLoading()).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'camila.morales@huellasdelvalle.com',
        password: 'Clinica2026Secure!'
      });

      // El backend responde 200 OK con el contrato acordado
      req.flush(mockResponse);
      fixture.detectChanges();

      // Verificación de estado de sesión persistido en SessionService
      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toBeNull();
      expect(sessionService.isAuthenticated()).toBe(true);
      expect(sessionService.getToken()).toBe('jwt-valle-super-secure-token');
      expect(sessionService.getUserRole()).toBe('VETERINARIO');
      expect(sessionService.currentUser()?.fullName).toBe('Dra. Camila Morales');

      // Redirección hacia el Dashboard
      expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('debe respetar el returnUrl al autenticar si provenía de una ruta protegida previa', () => {
      component.returnUrl.set('/cash');

      const mockResponse: LoginResponse = {
        accessToken: 'jwt-recepcion-token',
        user: {
          id: 'usr-rec-002',
          fullName: 'Carlos Restrepo',
          email: 'carlos@huellasdelvalle.com',
          role: 'RECEPCIONISTA'
        }
      };

      component.loginForm.setValue({
        email: 'carlos@huellasdelvalle.com',
        password: 'Password123!'
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockResponse);

      expect(router.navigateByUrl).toHaveBeenCalledWith('/cash');
      expect(sessionService.getUserRole()).toBe('RECEPCIONISTA');
    });
  });

  describe('4. Manejo Seguro de Errores y Feedback al Usuario (RNF-01 y RNF-11)', () => {
    it('debe mostrar mensaje amigable sin revelar información sensible ante HTTP 401', () => {
      component.loginForm.setValue({
        email: 'intruso@desconocido.com',
        password: 'clave-incorrecta'
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toBe('Correo institucional o contraseña incorrectos. Verifica tus credenciales.');
      expect(sessionService.isAuthenticated()).toBe(false);

      // El DOM debe desplegar la alerta visual con rol alert
      const element: HTMLElement = fixture.nativeElement;
      const alertBox = element.querySelector('[role="alert"]');
      expect(alertBox).toBeTruthy();
      expect(alertBox?.textContent).toContain('Correo institucional o contraseña incorrectos');
    });

    it('debe alertar claramente si ocurre un fallo de red o el servidor está inalcanzable (status 0)', () => {
      component.loginForm.setValue({
        email: 'admin@huellasdelvalle.com',
        password: 'Password123!'
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toContain('No se pudo conectar con el servidor');
      expect(sessionService.isAuthenticated()).toBe(false);
    });

    it('debe alertar amigablemente si el servidor responde con error interno (status 500)', () => {
      component.loginForm.setValue({
        email: 'admin@huellasdelvalle.com',
        password: 'Password123!'
      });

      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Internal Error', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.errorMessage()).toContain('no se encuentra disponible');
    });
  });

  describe('5. Cierre de Sesión y Limpieza de Estado', () => {
    it('debe purgar todos los datos de SessionService al invocar logout()', () => {
      sessionService.setMockSession('ADMIN', 'Dr. Roberto Mendoza', 'jwt-token-to-purge');
      expect(sessionService.isAuthenticated()).toBe(true);

      authService.logout();

      expect(sessionService.isAuthenticated()).toBe(false);
      expect(sessionService.getToken()).toBeNull();
      expect(sessionService.currentUser()).toBeNull();
      expect(sessionService.role()).toBeNull();
    });
  });
});
