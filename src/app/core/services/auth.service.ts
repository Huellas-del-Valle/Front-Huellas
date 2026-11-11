import { Injectable, computed, signal } from '@angular/core';
import { UserRole, UserSession } from '../models/auth.models';

const STORAGE_KEY = 'front_huellas_session';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _session = signal<UserSession | null>(this.loadStoredSession());

  /** Sesión actual inmutable expuesta como señal */
  readonly session = this._session.asReadonly();

  /** Usuario autenticado actual */
  readonly currentUser = computed(() => this._session());

  /** Rol actual del usuario ('ADMIN' | 'VETERINARIO' | 'RECEPCIONISTA' | null) */
  readonly role = computed<UserRole | null>(() => this._session()?.role ?? null);

  /** Token JWT activo */
  readonly token = computed<string | null>(() => this._session()?.token ?? null);

  /** Indica si existe sesión activa y token no expirado */
  readonly isAuthenticated = computed<boolean>(() => {
    const current = this._session();
    if (!current?.token) {
      return false;
    }
    if (current.tokenExpiresAt && Date.now() >= current.tokenExpiresAt) {
      return false;
    }
    return true;
  });

  /**
   * Obtiene el token JWT actual
   */
  getToken(): string | null {
    return this.token();
  }

  /**
   * Obtiene el rol actual del usuario autenticado
   */
  getUserRole(): UserRole | null {
    return this.role();
  }

  /**
   * Valida si el usuario tiene uno de los roles requeridos según RBAC
   */
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
    if (!expectedRoles) {
      return true;
    }

    const rolesArray: readonly string[] = Array.isArray(expectedRoles)
      ? (expectedRoles as readonly string[])
      : [expectedRoles as string];

    if (rolesArray.length === 0) {
      return true;
    }

    const currentRole = this.role();
    if (!currentRole || !this.isAuthenticated()) {
      return false;
    }

    return rolesArray.includes(currentRole);
  }

  /**
   * Establece una nueva sesión de usuario
   */
  setSession(session: UserSession): void {
    this._session.set(session);
    this.persistSession(session);
  }

  /**
   * Limpia reactivamente la sesión activa y elimina datos persistidos
   */
  clearSession(): void {
    this._session.set(null);
    this.removePersistedSession();
  }

  /**
   * Cierra sesión del usuario
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Helper para simular inicio de sesión rápido en desarrollo / pruebas
   */
  setMockSession(role: UserRole, name = `Usuario ${role}`, token = 'mock-jwt-token-huellas-xyz'): void {
    const session: UserSession = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      name,
      email: `${role.toLowerCase()}@huellasdelvalle.com`,
      role,
      token,
      tokenExpiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 horas
    };
    this.setSession(session);
  }

  private loadStoredSession(): UserSession | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as UserSession;
        if (parsed?.tokenExpiresAt && Date.now() >= parsed.tokenExpiresAt) {
          window.sessionStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return parsed;
      }
    } catch {
      // Fallback silencioso en entornos sin storage
    }
    return null;
  }

  private persistSession(session: UserSession): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Fallback silencioso
    }
  }

  private removePersistedSession(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Fallback silencioso
    }
  }
}
