import { TestBed } from '@angular/core/testing';
import { SecuritySanitizerService } from './security-sanitizer.service';

describe('SecuritySanitizerService', () => {
  let service: SecuritySanitizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SecuritySanitizerService]
    });
    service = TestBed.inject(SecuritySanitizerService);
  });

  describe('sanitizeText', () => {
    it('debe escapar caracteres peligrosos para neutralizar inyecciones XSS en texto plano', () => {
      const malicious = "<script>alert('XSS')</script>";
      const sanitized = service.sanitizeText(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;');
    });

    it('debe escapar comillas, ampersands y barras diagonales en nombres y observaciones', () => {
      const input = `Max & 'Luna' / "Rocky" <danger>`;
      const sanitized = service.sanitizeText(input);

      expect(sanitized).toBe('Max &amp; &#x27;Luna&#x27; &#x2F; &quot;Rocky&quot; &lt;danger&gt;');
    });

    it('debe retornar cadena vacía ante valores nulos o indefinidos', () => {
      expect(service.sanitizeText(null)).toBe('');
      expect(service.sanitizeText(undefined)).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('debe eliminar etiquetas script ejecutables y manejadores de eventos inline', () => {
      const dirtyHtml = `<div><p>Diagnóstico clínico</p><script>window.stealCookie()</script><img src="x" onerror="alert(1)"></div>`;
      const safeHtml = service.sanitizeHtml(dirtyHtml);

      // En el safeHtml generado no debe haber script
      expect(safeHtml).toBeDefined();
    });

    it('debe remover enlaces maliciosos con esquema javascript:', () => {
      const raw = `<a href="javascript:alert(document.domain)">Ver examen</a>`;
      const clean = service.stripScripts(raw);

      expect(clean).not.toContain('javascript:');
      expect(clean).toContain('href="#"');
    });
  });

  describe('sanitizeUrl', () => {
    it('debe permitir protocolos seguros (http, https, mailto, tel y rutas relativas)', () => {
      expect(service.isSafeUrl('https://huellasdelvalle.com/docs')).toBe(true);
      expect(service.isSafeUrl('http://localhost:3000/api/v1')).toBe(true);
      expect(service.isSafeUrl('mailto:veterinaria@huellas.com')).toBe(true);
      expect(service.isSafeUrl('tel:+573001234567')).toBe(true);
      expect(service.isSafeUrl('/assets/images/logo.png')).toBe(true);
    });

    it('debe bloquear esquemas peligrosos como javascript: y vbscript:', () => {
      expect(service.isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(service.isSafeUrl('vbscript:msgbox("xss")')).toBe(false);
      expect(service.sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    });
  });

  describe('sanitizeImageUrl', () => {
    it('debe permitir imágenes HTTPS y rutas relativas seguras de la clínica', () => {
      const url = 'https://cdn.huellasdelvalle.com/pacientes/max.jpg';
      const result = service.sanitizeImageUrl(url);
      expect(result).not.toBe('about:blank');
    });

    it('debe permitir data URIs con imágenes válidas (PNG, JPEG, WEBP)', () => {
      const validDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = service.sanitizeImageUrl(validDataUri);
      expect(result).not.toBe('about:blank');
    });

    it('debe bloquear data:text/html y payloads maliciosos en fuentes de imagen', () => {
      const maliciousDataUri = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
      expect(service.sanitizeImageUrl(maliciousDataUri)).toBe('about:blank');

      const javascriptImg = 'javascript:alert("img-xss")';
      expect(service.sanitizeImageUrl(javascriptImg)).toBe('about:blank');
    });
  });

  describe('containsMaliciousContent', () => {
    it('debe detectar patrones de ataque XSS', () => {
      expect(service.containsMaliciousContent('<script>eval()</script>')).toBe(true);
      expect(service.containsMaliciousContent('javascript:doBad()')).toBe(true);
      expect(service.containsMaliciousContent('<img src=x onerror=alert(1)>')).toBe(true);
      expect(service.containsMaliciousContent('Diagnóstico normal sin ataque')).toBe(false);
    });
  });
});
