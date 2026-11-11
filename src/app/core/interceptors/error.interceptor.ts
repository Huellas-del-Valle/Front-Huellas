import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional reactivo para captura global de errores de autenticación y autorización
 * - HTTP 401: Ejecuta limpieza reactiva de la sesión y redirige inmediatamente al login
 * - HTTP 403: Restringe el acceso y redirige a la vista de acceso denegado
 * Cumple con respuesta y bloqueo menor a 300 ms
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          // Limpieza reactiva inmediata del estado antes de la redirección
          authService.clearSession();
          void router.navigate(['/login'], {
            queryParams: { returnUrl: router.url }
          });
        } else if (error.status === 403) {
          // Bloqueo y restricción inmediata por falta de permisos RBAC
          void router.navigate(['/access-denied']);
        }
      }

      return throwError(() => error);
    })
  );
};
