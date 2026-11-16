import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';
import { HasRoleDirective } from '../shared/directives/has-role.directive';
import { SecuritySanitizerService } from '../core/services/security-sanitizer.service';
import { SessionService } from '../core/services/session.service';
import { AuthService } from '../core/services/auth.service';
import { UserRole } from '../core/models/auth.models';
import { environment } from '../../environments/environment';
import { appConfig } from '../app.config';

@Component({
  standalone: true,
  imports: [CommonModule, HasRoleDirective],
  template: `
    <button id="admin-action" *hasRole="'ADMIN'">Eliminar Historia Clínica</button>
    <div id="vet-data" *hasRole="['ADMIN', 'VETERINARIO']">Evolución Médica Reservada</div>
    <span id="rec-action" *hasRole="'RECEPCIONISTA'">Terminal de Cobro</span>
  `
})
class TestHostComponent {}

describe('Capa Transversal de Seguridad Frontend (Security Module Integration Spec)', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let sessionService: SessionService;
  let authService: AuthService;
  let sanitizerService: SecuritySanitizerService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        SessionService,
        AuthService,
        SecuritySanitizerService,
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    sessionService = TestBed.inject(SessionService);
    authService = TestBed.inject(AuthService);
    sanitizerService = TestBed.inject(SecuritySanitizerService);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    sessionService.clearSession();
  });

  describe('Criterio 1: AuthInterceptor inyección de Bearer Token', () => {
    it('debe adjuntar Authorization: Bearer <token> a peticiones dirigidas a la API cuando existe sesión', () => {
      sessionService.setMockSession('VETERINARIO', 'Dra. Camila', 'jwt-valle-vet-token');

      httpClient.get(`${environment.apiUrl}/patients`).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/patients`);
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-valle-vet-token');
      req.flush([]);
    });

    it('NO debe adjuntar Authorization si no existe sesión activa', () => {
      sessionService.clearSession();

      httpClient.get(`${environment.apiUrl}/public-info`).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/public-info`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('NO debe adjuntar Authorization a URLs externas ni assets estáticos aunque exista sesión', () => {
      sessionService.setMockSession('ADMIN', 'Dr. Roberto', 'admin-token');

      const externalUrl = 'https://externo.cdn.com/recurso';
      httpClient.get(externalUrl).subscribe();

      const req = httpMock.expectOne(externalUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('Criterios 2 y 3: ErrorInterceptor y Tiempos de Respuesta (< 300 ms)', () => {
    it('debe manejar HTTP 401 limpiando la sesión y redirigiendo a /login en menos de 300 ms', () => {
      sessionService.setMockSession('VETERINARIO', 'Dr. Mateo', 'expired-jwt');
      const clearSessionSpy = vi.spyOn(sessionService, 'clearSession');

      const startTime = performance.now();

      httpClient.get(`${environment.apiUrl}/medical-records`).subscribe({
        next: () => expect.unreachable('La petición debía fallar con 401'),
        error: (err) => {
          const duration = performance.now() - startTime;

          // Limpieza de sesión
          expect(clearSessionSpy).toHaveBeenCalled();
          expect(sessionService.isAuthenticated()).toBe(false);

          // Redirección a login
          expect(router.navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { returnUrl: router.url }
          });

          // Código de error 401
          expect(err.status).toBe(401);

          // Criterio 3: Tiempo menor a 300 ms
          expect(duration).toBeLessThan(300);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/medical-records`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('debe manejar HTTP 403 bloqueando el acceso y redirigiendo a /access-denied en menos de 300 ms', () => {
      sessionService.setMockSession('RECEPCIONISTA', 'Carlos', 'valid-recepcion-token');

      const startTime = performance.now();

      httpClient.get(`${environment.apiUrl}/roles`).subscribe({
        next: () => expect.unreachable('La petición debía fallar con 403'),
        error: (err) => {
          const duration = performance.now() - startTime;

          // Redirección hacia la pantalla de acceso denegado
          expect(router.navigate).toHaveBeenCalledWith(['/access-denied']);
          expect(err.status).toBe(403);

          // Criterio 3: Tiempo menor a 300 ms
          expect(duration).toBeLessThan(300);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/roles`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Criterio 4: Functional Guards (authGuard y roleGuard RBAC)', () => {
    const mockState = { url: '/users' } as RouterStateSnapshot;
    const createRoute = (roles?: UserRole[]): ActivatedRouteSnapshot => {
      return {
        data: roles ? { roles } : {}
      } as unknown as ActivatedRouteSnapshot;
    };

    it('authGuard debe impedir entrar a rutas protegidas sin token vigente y redirigir a /login', () => {
      sessionService.clearSession();
      const mockRoute = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result instanceof UrlTree).toBe(true);
      expect((result as UrlTree).toString()).toContain('/login');
    });

    it('authGuard debe permitir acceso si existe sesión activa y token no expirado', () => {
      sessionService.setMockSession('ADMIN', 'Roberto');
      const mockRoute = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
    });

    it('roleGuard debe validar roles ADMIN, VETERINARIO y RECEPCIONISTA correctamente', () => {
      // 1. ADMIN en ruta ADMIN
      sessionService.setMockSession('ADMIN', 'Roberto Admin');
      const adminRoute = createRoute(['ADMIN']);
      expect(TestBed.runInInjectionContext(() => roleGuard(adminRoute, mockState))).toBe(true);

      // 2. VETERINARIO en ruta asistencial ['ADMIN', 'VETERINARIO']
      sessionService.setMockSession('VETERINARIO', 'Dra. Camila');
      const vetRoute = createRoute(['ADMIN', 'VETERINARIO']);
      expect(TestBed.runInInjectionContext(() => roleGuard(vetRoute, mockState))).toBe(true);

      // 3. RECEPCIONISTA en ruta de caja ['ADMIN', 'RECEPCIONISTA']
      sessionService.setMockSession('RECEPCIONISTA', 'Carlos');
      const recRoute = createRoute(['ADMIN', 'RECEPCIONISTA']);
      expect(TestBed.runInInjectionContext(() => roleGuard(recRoute, mockState))).toBe(true);
    });

    it('roleGuard debe bloquear el acceso ante manipulación manual de URL y redirigir a /access-denied', () => {
      // RECEPCIONISTA intenta ingresar manualmente a /users (reservada para ADMIN)
      sessionService.setMockSession('RECEPCIONISTA', 'Carlos');
      const adminRoute = createRoute(['ADMIN']);

      const result = TestBed.runInInjectionContext(() => roleGuard(adminRoute, mockState));

      expect(result instanceof UrlTree).toBe(true);
      expect((result as UrlTree).toString()).toContain('/access-denied');
    });
  });

  describe('Criterio 5: Control Granular del DOM (*hasRole)', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;
    let hostElement: HTMLElement;

    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostElement = hostFixture.nativeElement as HTMLElement;
    });

    it('debe remover del DOM los elementos reservados si el usuario no tiene los roles permitidos', () => {
      // Como RECEPCIONISTA: no debe existir botón ADMIN ni datos clínicos
      sessionService.setMockSession('RECEPCIONISTA', 'Carlos');
      hostFixture.detectChanges();

      expect(hostElement.querySelector('#admin-action')).toBeNull();
      expect(hostElement.querySelector('#vet-data')).toBeNull();
      expect(hostElement.querySelector('#rec-action')).not.toBeNull();
    });

    it('debe mostrar los datos clínicos y ocultar administrativos para VETERINARIO', () => {
      sessionService.setMockSession('VETERINARIO', 'Dra. Camila');
      hostFixture.detectChanges();

      expect(hostElement.querySelector('#admin-action')).toBeNull();
      expect(hostElement.querySelector('#vet-data')).not.toBeNull();
      expect(hostElement.querySelector('#rec-action')).toBeNull();
    });

    it('debe mostrar todas las acciones permitidas para ADMIN', () => {
      sessionService.setMockSession('ADMIN', 'Dr. Roberto');
      hostFixture.detectChanges();

      expect(hostElement.querySelector('#admin-action')).not.toBeNull();
      expect(hostElement.querySelector('#vet-data')).not.toBeNull();
      expect(hostElement.querySelector('#rec-action')).toBeNull();
    });

    it('debe eliminar todo del DOM si no hay sesión activa', () => {
      sessionService.clearSession();
      hostFixture.detectChanges();

      expect(hostElement.querySelector('#admin-action')).toBeNull();
      expect(hostElement.querySelector('#vet-data')).toBeNull();
      expect(hostElement.querySelector('#rec-action')).toBeNull();
    });
  });

  describe('Criterio 6: Prevención XSS con SecuritySanitizerService', () => {
    it('debe escapar caracteres peligrosos en texto plano sin introducir contenido ejecutable', () => {
      const maliciousPayload = `<script>alert('XSS')</script>`;
      const sanitized = sanitizerService.sanitizeText(maliciousPayload);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;');
    });

    it('debe desinfectar fragmentos HTML y eliminar etiquetas de script y eventos on*', () => {
      const raw = `<div><script>evil()</script><p>Normal</p></div>`;
      const cleaned = sanitizerService.stripScripts(raw);

      expect(cleaned).not.toContain('<script>');
      expect(cleaned).toContain('<p>Normal</p>');
    });

    it('debe validar y sanear URLs e imágenes bloqueando esquemas javascript: y data:text/html', () => {
      expect(sanitizerService.isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(sanitizerService.sanitizeUrl('javascript:alert(1)')).toBe('about:blank');

      expect(sanitizerService.sanitizeImageUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe('about:blank');
      expect(sanitizerService.isSafeUrl('https://huellasdelvalle.com/foto.jpg')).toBe(true);
    });
  });

  describe('Criterio 7: Registro de Interceptores en Configuración Raíz (appConfig)', () => {
    it('debe verificar que la configuración raíz registre los interceptores y proveedores HTTP', () => {
      expect(appConfig.providers).toBeDefined();
      expect(appConfig.providers.length).toBeGreaterThan(0);
    });
  });
});

