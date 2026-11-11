export type UserRole = 'ADMIN' | 'VETERINARIO' | 'RECEPCIONISTA';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  VETERINARIO: 'VETERINARIO',
  RECEPCIONISTA: 'RECEPCIONISTA'
} as const;

export interface UserSession {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly token: string;
  readonly tokenExpiresAt?: number;
}

export interface AuthState {
  readonly session: UserSession | null;
  readonly isAuthenticated: boolean;
  readonly role: UserRole | null;
}
