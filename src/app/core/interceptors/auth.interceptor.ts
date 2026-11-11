import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Determina si la URL solicitada pertenece a la API base configurada
 * Evita adjuntar credenciales a librerías de terceros, CDNs o assets estáticos
 */
export function isApiUrl(url: string, baseApiUrl: string): boolean {
  if (!url || !baseApiUrl) {
    return false;
  }

  // Coincidencia directa con la URL base (absoluta o relativa)
  if (url.startsWith(baseApiUrl)) {
    return true;
  }

  // Petición relativa iniciada con '/' contra una API base absoluta (ej. /api/v1 contra http://localhost:3000/api/v1)
  if (url.startsWith('/') && baseApiUrl.startsWith('http')) {
    try {
      const parsedBase = new URL(baseApiUrl);
      return url.startsWith(parsedBase.pathname);
    } catch {
      return false;
    }
  }

  // Petición absoluta contra una API base configurada de forma relativa
  if (url.startsWith('http') && baseApiUrl.startsWith('/')) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.startsWith(baseApiUrl);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Interceptor funcional que inyecta la cabecera Authorization: Bearer <token>
 * exclusivamente en peticiones salientes dirigidas a la API base del backend
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && isApiUrl(req.url, environment.apiUrl)) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};
