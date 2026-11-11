import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor, isApiUrl } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    authService.clearSession();
  });

  describe('isApiUrl helper', () => {
    it('debe retornar true si la URL coincide con la base de la API', () => {
      expect(isApiUrl('http://localhost:3000/api/v1/patients', 'http://localhost:3000/api/v1')).toBe(true);
      expect(isApiUrl('/api/v1/patients', '/api/v1')).toBe(true);
    });

    it('debe retornar true para peticiones relativas cuando la API base es absoluta', () => {
      expect(isApiUrl('/api/v1/appointments', 'http://localhost:3000/api/v1')).toBe(true);
    });

    it('debe retornar false para URLs externas o assets estáticos', () => {
      expect(isApiUrl('https://fonts.googleapis.com/css', 'http://localhost:3000/api/v1')).toBe(false);
      expect(isApiUrl('https://external-service.org/api', 'http://localhost:3000/api/v1')).toBe(false);
      expect(isApiUrl('assets/mockup.png', 'http://localhost:3000/api/v1')).toBe(false);
      expect(isApiUrl('', 'http://localhost:3000/api/v1')).toBe(false);
    });
  });

  describe('Inyección de token JWT', () => {
    it('debe adjuntar Authorization: Bearer <token> a peticiones dirigidas a la API cuando hay sesión activa', () => {
      authService.setMockSession('ADMIN', 'Administrador', 'jwt-valle-token-12345');

      httpClient.get(`${environment.apiUrl}/patients`).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/patients`);
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-valle-token-12345');
      req.flush([]);
    });

    it('NO debe adjuntar Authorization si no existe sesión activa', () => {
      authService.clearSession();

      httpClient.get(`${environment.apiUrl}/public-info`).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/public-info`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('NO debe adjuntar Authorization a URLs externas aunque exista sesión activa', () => {
      authService.setMockSession('VETERINARIO', 'Dra. Camila', 'token-veterinario-secure');

      const externalUrl = 'https://externo.cdn.com/medicamentos';
      httpClient.get(externalUrl).subscribe();

      const req = httpMock.expectOne(externalUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('NO debe adjuntar Authorization a peticiones de assets estáticos', () => {
      authService.setMockSession('RECEPCIONISTA', 'Carlos', 'token-recepcionista');

      const assetUrl = 'assets/icons/paw.svg';
      httpClient.get(assetUrl).subscribe();

      const req = httpMock.expectOne(assetUrl);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush('');
    });
  });
});
