import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/medical-records' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService]
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    authService.clearSession();
  });

  it('debe permitir la navegación (true) cuando existe token vigente en sesión', () => {
    authService.setMockSession('VETERINARIO', 'Dra. Camila', 'valid-jwt-token');

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBe(true);
  });

  it('debe bloquear la navegación y redirigir a /login cuando no existe sesión activa', () => {
    authService.clearSession();

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result instanceof UrlTree).toBe(true);
    const urlTree = result as UrlTree;
    expect(urlTree.toString()).toContain('/login');
    expect(urlTree.queryParams['returnUrl']).toBe('/medical-records');
  });

  it('debe bloquear el acceso cuando el token está expirado', () => {
    authService.setSession({
      id: 'usr-exp',
      name: 'Dr. Expirado',
      email: 'exp@huellas.com',
      role: 'ADMIN',
      token: 'expired-token',
      tokenExpiresAt: Date.now() - 1000 // Expiró hace 1 segundo
    });

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result instanceof UrlTree).toBe(true);
    const urlTree = result as UrlTree;
    expect(urlTree.toString()).toContain('/login');
  });
});
