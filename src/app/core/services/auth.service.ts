import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, UserRole, UserSession } from '../models/auth.models';
import { SessionService } from './session.service';
import { environment } from '../../../environments/environment';

/**
 * Servicio encargado de la comunicación con la API de autenticación
 * y orquestación del flujo de login / logout delegando el estado a SessionService.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionService = inject(SessionService);

  /** URL del endpoint de login según el contrato: POST /api/v1/auth/login */
  readonly loginUrl = `${environment.apiUrl}/auth/login`;

  /** Señales reactivas expuestas desde SessionService */
  readonly session = this.sessionService.session;
  readonly currentUser = this.sessionService.currentUser;
  readonly role = this.sessionService.role;
  readonly token = this.sessionService.token;
  readonly isAuthenticated = this.sessionService.isAuthenticated;

  /**
   * Consume el endpoint de autenticación POST /api/v1/auth/login
   * y almacena la sesión en SessionService ante respuesta exitosa
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, credentials).pipe(
      tap((response) => {
        const session: UserSession = {
          id: response.user.id,
          name: response.user.fullName || response.user.email,
          fullName: response.user.fullName,
          email: response.user.email,
          role: response.user.role,
          token: response.accessToken
        };
        this.sessionService.setSession(session);
      })
    );
  }

  /**
   * Cierra sesión del usuario y limpia el estado almacenado
   */
  logout(): void {
    this.sessionService.clearSession();
  }

  /**
   * Métodos proxy para compatibilidad con Interceptors, Guards y Directivas
   */
  getToken(): string | null {
    return this.sessionService.getToken();
  }

  getUserRole(): UserRole | null {
    return this.sessionService.getUserRole();
  }

  hasRole(
    expectedRoles:
      | UserRole
      | readonly UserRole[]
      | UserRole[]
      | string
      | readonly string[]
      | string[]
      | undefined
      | null
  ): boolean {
    return this.sessionService.hasRole(expectedRoles);
  }

  setSession(session: UserSession): void {
    this.sessionService.setSession(session);
  }

  clearSession(): void {
    this.sessionService.clearSession();
  }

  setMockSession(role: UserRole, name = `Usuario ${role}`, token = 'mock-jwt-token-huellas-xyz'): void {
    this.sessionService.setMockSession(role, name, token);
  }
}
