import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginRequest, LoginResponse } from '../models/auth.models';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let authService: AuthService;
  let sessionService: SessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    authService = TestBed.inject(AuthService);
    sessionService = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionService.clearSession();
  });

  describe('login()', () => {
    it('debe consumir POST /api/v1/auth/login y almacenar el token y usuario en SessionService', () => {
      const credentials: LoginRequest = {
        email: 'veterinario@huellasdelvalle.com',
        password: 'Password123!'
      };

      const mockResponse: LoginResponse = {
        accessToken: 'mock-jwt-token-valle-xyz',
        user: {
          id: 'uuid-vet-123',
          fullName: 'Dra. Camila Morales',
          email: 'veterinario@huellasdelvalle.com',
          role: 'VETERINARIO'
        }
      };

      authService.login(credentials).subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(sessionService.isAuthenticated()).toBe(true);
        expect(sessionService.getToken()).toBe('mock-jwt-token-valle-xyz');
        expect(sessionService.getUserRole()).toBe('VETERINARIO');
        expect(sessionService.currentUser()?.name).toBe('Dra. Camila Morales');
        expect(sessionService.currentUser()?.email).toBe('veterinario@huellasdelvalle.com');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });

    it('debe propagar el error HTTP si las credenciales son incorrectas (401)', () => {
      const credentials: LoginRequest = {
        email: 'invalido@huellas.com',
        password: 'wrong'
      };

      authService.login(credentials).subscribe({
        next: () => expect.unreachable('La petición debía fallar con 401'),
        error: (err) => {
          expect(err.status).toBe(401);
          expect(sessionService.isAuthenticated()).toBe(false);
          expect(sessionService.getToken()).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('debe propagar el error HTTP si el servidor no responde o hay fallo de red', () => {
      const credentials: LoginRequest = {
        email: 'admin@huellas.com',
        password: 'pass'
      };

      authService.login(credentials).subscribe({
        next: () => expect.unreachable('La petición debía fallar'),
        error: (err) => {
          expect(err.status).toBe(0);
          expect(sessionService.isAuthenticated()).toBe(false);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    });
  });

  describe('logout() y delegación', () => {
    it('debe limpiar la sesión a través de logout()', () => {
      sessionService.setMockSession('ADMIN', 'Roberto Admin');
      expect(authService.isAuthenticated()).toBe(true);

      authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getToken()).toBeNull();
      expect(authService.currentUser()).toBeNull();
    });

    it('debe exponer señales y métodos compatibles delegados a SessionService', () => {
      authService.setMockSession('RECEPCIONISTA', 'Carlos');

      expect(authService.getToken()).toBe('mock-jwt-token-huellas-xyz');
      expect(authService.getUserRole()).toBe('RECEPCIONISTA');
      expect(authService.hasRole('RECEPCIONISTA')).toBe(true);
      expect(authService.hasRole('ADMIN')).toBe(false);

      authService.clearSession();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});
