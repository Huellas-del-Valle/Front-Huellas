import { Injectable, SecurityContext, inject } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SecuritySanitizerService {
  private readonly domSanitizer = inject(DomSanitizer);

  /**
   * Patrones maliciosos comunes de inyección XSS
   */
  private readonly dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi // Event handlers como onclick=, onerror=, onload=
  ];

  /**
   * Protocolos de URL permitidos
   */
  private readonly allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

  /**
   * MIME types de imágenes permitidos para data URIs
   */
  private readonly allowedImageDataTypes = [
    'data:image/png',
    'data:image/jpeg',
    'data:image/jpg',
    'data:image/webp',
    'data:image/gif'
  ];

  /**
   * Sanea texto plano escapando caracteres especiales HTML para prevenir XSS reflejado/almacenado
   */
  sanitizeText(text: string | null | undefined): string {
    if (!text) {
      return '';
    }

    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return String(text).replace(/[&<>"'/]/g, (char) => htmlEntities[char] ?? char);
  }

  /**
   * Desinfecta fragmentos HTML eliminando scripts y manejadores de eventos ejecutables
   */
  sanitizeHtml(rawHtml: string | null | undefined): SafeHtml {
    if (!rawHtml) {
      return '';
    }

    const stripped = this.stripScripts(rawHtml);
    const sanitized = this.domSanitizer.sanitize(SecurityContext.HTML, stripped) ?? '';
    return this.domSanitizer.bypassSecurityTrustHtml(sanitized);
  }

  /**
   * Valida y sanea URLs salientes o enlaces clínicos, bloqueando esquemas javascript: y vbscript:
   */
  sanitizeUrl(url: string | null | undefined): SafeUrl {
    if (!url) {
      return '';
    }

    const trimmed = url.trim();
    if (!this.isSafeUrl(trimmed)) {
      return 'about:blank';
    }

    const sanitized = this.domSanitizer.sanitize(SecurityContext.URL, trimmed) ?? 'about:blank';
    return this.domSanitizer.bypassSecurityTrustUrl(sanitized);
  }

  /**
   * Valida y sanea URLs de imágenes (fotos de mascotas, radiografías, exámenes clínicos)
   * Previene inyección mediante SVGs maliciosos o scripts en data URIs
   */
  sanitizeImageUrl(url: string | null | undefined): SafeResourceUrl | SafeUrl | string {
    if (!url) {
      return '';
    }

    const trimmed = url.trim();

    // Bloquear scripts o manejadores en la URL
    if (this.containsMaliciousContent(trimmed)) {
      return 'about:blank';
    }

    // Permitir data URLs válidas de imágenes ráster
    if (trimmed.startsWith('data:image/')) {
      const isAllowedData = this.allowedImageDataTypes.some((type) =>
        trimmed.toLowerCase().startsWith(type.toLowerCase())
      );
      if (isAllowedData) {
        return this.domSanitizer.bypassSecurityTrustResourceUrl(trimmed);
      }
      // Si es SVG u otro tipo peligroso en data URI, bloquear
      return 'about:blank';
    }

    // Validar URLs HTTP/HTTPS o relativas seguras
    if (this.isSafeUrl(trimmed)) {
      return this.domSanitizer.bypassSecurityTrustResourceUrl(trimmed);
    }

    return 'about:blank';
  }

  /**
   * Comprueba si una URL es segura según la lista blanca de protocolos y rutas relativas
   */
  isSafeUrl(url: string): boolean {
    if (!url) return false;

    const trimmed = url.trim();

    if (this.containsMaliciousContent(trimmed)) {
      return false;
    }

    // Rutas relativas seguras (/path, assets/...)
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('assets/')) {
      return !trimmed.toLowerCase().includes('javascript:');
    }

    try {
      const parsed = new URL(trimmed);
      return this.allowedProtocols.includes(parsed.protocol.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Detecta si una cadena contiene contenido o payloads ejecutables maliciosos
   */
  containsMaliciousContent(content: string): boolean {
    if (!content) return false;
    return this.dangerousPatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(content);
    });
  }

  /**
   * Elimina completamente etiquetas <script>, <iframe>, <object>, <embed> y atributos on*
   */
  stripScripts(content: string): string {
    if (!content) return '';

    let clean = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"')
      .replace(/src\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'src=""');

    return clean;
  }
}
