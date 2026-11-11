import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { UserSession } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    service.clearSession();
  });

  it('debe iniciar sin sesión activa por defecto', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.role()).toBeNull();
    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('debe actualizar las señales reactivas al establecer una sesión válida', () => {
    const mockSession: UserSession = {
      id: 'usr-01',
      name: 'Dra. Andrea',
      email: 'andrea@huellasdelvalle.com',
      role: 'VETERINARIO',
      token: 'jwt-header.payload.signature',
      tokenExpiresAt: Date.now() + 3600000
    };

    service.setSession(mockSession);

    expect(service.currentUser()).toEqual(mockSession);
    expect(service.role()).toBe('VETERINARIO');
    expect(service.token()).toBe('jwt-header.payload.signature');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getToken()).toBe('jwt-header.payload.signature');
    expect(service.getUserRole()).toBe('VETERINARIO');
  });

  it('debe limpiar reactivamente la sesión con clearSession y logout', () => {
    service.setMockSession('ADMIN', 'Dr. Roberto');
    expect(service.isAuthenticated()).toBe(true);

    service.clearSession();

    expect(service.currentUser()).toBeNull();
    expect(service.role()).toBeNull();
    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  describe('hasRole (RBAC)', () => {
    it('debe retornar true si no se especifican roles restrictivos', () => {
      expect(service.hasRole(undefined)).toBe(true);
      expect(service.hasRole(null)).toBe(true);
      expect(service.hasRole([])).toBe(true);
    });

    it('debe retornar false si el usuario no tiene sesión activa', () => {
      service.clearSession();
      expect(service.hasRole('ADMIN')).toBe(false);
      expect(service.hasRole(['VETERINARIO', 'RECEPCIONISTA'])).toBe(false);
    });

    it('debe validar correctamente el rol ADMIN', () => {
      service.setMockSession('ADMIN', 'Roberto Admin');
      expect(service.hasRole('ADMIN')).toBe(true);
      expect(service.hasRole(['ADMIN', 'VETERINARIO'])).toBe(true);
      expect(service.hasRole('RECEPCIONISTA')).toBe(false);
    });

    it('debe validar correctamente el rol VETERINARIO', () => {
      service.setMockSession('VETERINARIO', 'Dra. Camila');
      expect(service.hasRole('VETERINARIO')).toBe(true);
      expect(service.hasRole(['ADMIN', 'VETERINARIO'])).toBe(true);
      expect(service.hasRole('ADMIN')).toBe(false);
      expect(service.hasRole('RECEPCIONISTA')).toBe(false);
    });

    it('debe validar correctamente el rol RECEPCIONISTA', () => {
      service.setMockSession('RECEPCIONISTA', 'Carlos');
      expect(service.hasRole('RECEPCIONISTA')).toBe(true);
      expect(service.hasRole(['ADMIN', 'RECEPCIONISTA'])).toBe(true);
      expect(service.hasRole(['ADMIN', 'VETERINARIO'])).toBe(false);
    });
  });

  it('debe considerar no autenticado un usuario con token expirado', () => {
    service.setSession({
      id: 'usr-exp',
      name: 'Dr. Expirado',
      email: 'exp@huellas.com',
      role: 'ADMIN',
      token: 'expired-token',
      tokenExpiresAt: Date.now() - 5000
    });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.hasRole('ADMIN')).toBe(false);
  });
});
