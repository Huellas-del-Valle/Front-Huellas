import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.models';

/**
 * Functional Guard que valida la autorización por roles (RBAC: ADMIN, VETERINARIO, RECEPCIONISTA)
 * Bloquea la navegación indebida incluso ante manipulación manual directa de URLs en el navegador
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si el usuario no tiene sesión activa, redirige a login
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // Extrae los roles configurados en la ruta
  const expectedRoles = (
    route.data?.['roles'] ??
    (route.data?.['role'] ? [route.data['role']] : [])
  ) as UserRole[];

  // Si la ruta no especifica restricciones de rol, se permite el acceso al usuario autenticado
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  // Valida si el rol del usuario está dentro de los permitidos
  if (authService.hasRole(expectedRoles)) {
    return true;
  }

  // Si no cuenta con el rol requerido, bloquea y redirige a pantalla de acceso denegado
  return router.createUrlTree(['/access-denied']);
};
