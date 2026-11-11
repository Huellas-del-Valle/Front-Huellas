import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.models';

describe('roleGuard', () => {
  let authService: AuthService;
  let router: Router;

  const createRoute = (roles?: UserRole[]): ActivatedRouteSnapshot => {
    return {
      data: roles ? { roles } : {}
    } as unknown as ActivatedRouteSnapshot;
  };

  const mockState = { url: '/users' } as RouterStateSnapshot;

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

  it('debe redirigir a /login si el usuario no tiene sesión activa', () => {
    authService.clearSession();
    const route = createRoute(['ADMIN']);

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('/login');
  });

  it('debe permitir el acceso si la ruta no define roles restrictivos', () => {
    authService.setMockSession('RECEPCIONISTA', 'Carlos');
    const route = createRoute();

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result).toBe(true);
  });

  it('debe permitir acceso a ADMIN en rutas protegidas para ADMIN', () => {
    authService.setMockSession('ADMIN', 'Roberto');
    const route = createRoute(['ADMIN']);

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result).toBe(true);
  });

  it('debe permitir acceso a VETERINARIO en rutas clínicas [ADMIN, VETERINARIO]', () => {
    authService.setMockSession('VETERINARIO', 'Dra. Camila');
    const route = createRoute(['ADMIN', 'VETERINARIO']);

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result).toBe(true);
  });

  it('debe permitir acceso a RECEPCIONISTA en rutas de caja [ADMIN, RECEPCIONISTA]', () => {
    authService.setMockSession('RECEPCIONISTA', 'Carlos');
    const route = createRoute(['ADMIN', 'RECEPCIONISTA']);

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result).toBe(true);
  });

  it('debe bloquear y redirigir a /access-denied cuando RECEPCIONISTA intenta ingresar manualmente a /users (ADMIN)', () => {
    authService.setMockSession('RECEPCIONISTA', 'Carlos');
    const route = createRoute(['ADMIN']);

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result instanceof UrlTree).toBe(true);
    const urlTree = result as UrlTree;
    expect(urlTree.toString()).toContain('/access-denied');
  });

  it('debe bloquear y redirigir a /access-denied cuando VETERINARIO intenta ingresar manualmente a /cash (ADMIN, RECEPCIONISTA)', () => {
    authService.setMockSession('VETERINARIO', 'Dra. Camila');
    const route = createRoute(['ADMIN', 'RECEPCIONISTA']);

    const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));

    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toContain('/access-denied');
  });
});
