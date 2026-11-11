import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('ErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    authService.clearSession();
  });

  it('debe manejar HTTP 401 limpiando la sesión y redirigiendo a /login en menos de 300 ms', () => {
    authService.setMockSession('VETERINARIO', 'Dr. Mateo', 'expired-token');
    const clearSessionSpy = vi.spyOn(authService, 'clearSession');

    const startTime = performance.now();

    httpClient.get('/api/v1/clinical-records').subscribe({
      next: () => {
        expect.unreachable('La petición debía fallar con 401');
      },
      error: (err) => {
        const elapsedTime = performance.now() - startTime;

        // Limpieza reactiva antes de la redirección
        expect(clearSessionSpy).toHaveBeenCalled();
        expect(authService.isAuthenticated()).toBe(false);

        // Redirección hacia login
        expect(router.navigate).toHaveBeenCalledWith(['/login'], {
          queryParams: { returnUrl: router.url }
        });

        // Error re-lanzado mediante throwError de RxJS
        expect(err.status).toBe(401);

        // Criterio de aceptación: Redirección / bloqueo en menos de 300 ms
        expect(elapsedTime).toBeLessThan(300);
      }
    });

    const req = httpMock.expectOne('/api/v1/clinical-records');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('debe manejar HTTP 403 redirigiendo a /access-denied en menos de 300 ms', () => {
    authService.setMockSession('RECEPCIONISTA', 'Carlos', 'valid-token');
    const clearSessionSpy = vi.spyOn(authService, 'clearSession');

    const startTime = performance.now();

    httpClient.get('/api/v1/roles').subscribe({
      next: () => {
        expect.unreachable('La petición debía fallar con 403');
      },
      error: (err) => {
        const elapsedTime = performance.now() - startTime;

        // No limpia la sesión, pero redirige a acceso denegado
        expect(clearSessionSpy).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/access-denied']);

        // Error propagado con throwError
        expect(err.status).toBe(403);

        // Criterio de aceptación: Redirección / bloqueo en menos de 300 ms
        expect(elapsedTime).toBeLessThan(300);
      }
    });

    const req = httpMock.expectOne('/api/v1/roles');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  it('NO debe alterar la sesión ni redirigir ante otros errores HTTP (ej. 500 o 404)', () => {
    authService.setMockSession('ADMIN', 'Roberto', 'valid-admin-token');
    const clearSessionSpy = vi.spyOn(authService, 'clearSession');

    httpClient.get('/api/v1/non-existent').subscribe({
      next: () => {
        expect.unreachable('La petición debía fallar con 404');
      },
      error: (err) => {
        expect(clearSessionSpy).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(err.status).toBe(404);
        expect(authService.isAuthenticated()).toBe(true);
      }
    });

    const req = httpMock.expectOne('/api/v1/non-existent');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });
});
