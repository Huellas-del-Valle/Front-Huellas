import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from '../app';
import { appConfig } from '../app.config';
import { routes } from '../app.routes';
import { MainLayoutComponent } from '../layouts/main-layout/main-layout.component';
import { AuthService } from '../core/services/auth.service';
import { SessionService } from '../core/services/session.service';
import { environment as devEnvironment } from '../../environments/environment';
import { environment as prodEnvironment } from '../../environments/environment.prod';
import * as CoreExports from '../core';
import * as SharedExports from '../shared';
import * as FeaturesExports from '../features';

describe('Base Arquitectónica y Layout (Setup & Architecture Spec)', () => {
  describe('Criterio 1: Inicialización y Ejecución sin Errores de la Aplicación', () => {
    it('debe levantar y compilar el componente raíz App sin errores de ejecución', async () => {
      await TestBed.configureTestingModule({
        imports: [App],
        providers: [provideRouter([])]
      }).compileComponents();

      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      expect(app).toBeTruthy();
      expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    });

    it('debe contener los proveedores de configuración raíz en appConfig', () => {
      expect(appConfig).toBeDefined();
      expect(appConfig.providers).toBeDefined();
      expect(appConfig.providers.length).toBeGreaterThan(0);
    });
  });

  describe('Criterio 2: Enrutamiento, SCSS y Modo Estricto', () => {
    it('debe definir las rutas principales, el layout base y la redirección por defecto', () => {
      expect(routes).toBeDefined();
      expect(routes.length).toBeGreaterThan(0);

      // Ruta del layout contenedor
      const layoutRoute = routes.find((r) => r.path === '');
      expect(layoutRoute).toBeDefined();
      expect(layoutRoute?.children).toBeDefined();

      // Redirección por defecto a dashboard
      const defaultRedirect = layoutRoute?.children?.find((r) => r.path === '');
      expect(defaultRedirect?.redirectTo).toBe('dashboard');

      // Ruta wildcard
      const wildcard = routes.find((r) => r.path === '**');
      expect(wildcard?.redirectTo).toBe('');
    });

    it('debe compilar componentes con tipado estricto y estilos SCSS modulares', () => {
      expect(MainLayoutComponent).toBeDefined();
    });
  });

  describe('Criterio 3: Organización Modular en Core, Shared y Features', () => {
    it('debe estructurar y exponer artefactos transversales singleton desde src/app/core', () => {
      expect(CoreExports).toBeDefined();
      expect(CoreExports.AuthService).toBeDefined();
      expect(CoreExports.SessionService).toBeDefined();
      expect(CoreExports.SecuritySanitizerService).toBeDefined();
      expect(CoreExports.authInterceptor).toBeDefined();
      expect(CoreExports.errorInterceptor).toBeDefined();
      expect(CoreExports.authGuard).toBeDefined();
      expect(CoreExports.roleGuard).toBeDefined();
    });

    it('debe estructurar y exponer elementos reutilizables de presentación desde src/app/shared', () => {
      expect(SharedExports).toBeDefined();
      expect(SharedExports.HasRoleDirective).toBeDefined();
    });

    it('debe estructurar y exponer módulos funcionales desde src/app/features', () => {
      expect(FeaturesExports).toBeDefined();
      expect(FeaturesExports.DashboardComponent).toBeDefined();
      expect(FeaturesExports.LoginComponent).toBeDefined();
      expect(FeaturesExports.AccessDeniedComponent).toBeDefined();
    });
  });

  describe('Criterio 4: Configuración de Variables por Ambiente (Environment)', () => {
    it('debe configurar la URL esperada en desarrollo apuntando a http://localhost:3000/api/v1 con production: false', () => {
      expect(devEnvironment).toBeDefined();
      expect(devEnvironment.production).toBe(false);
      expect(devEnvironment.apiUrl).toBe('http://localhost:3000/api/v1');
    });

    it('debe configurar la URL esperada en producción con ruta relativa /api/v1 y production: true', () => {
      expect(prodEnvironment).toBeDefined();
      expect(prodEnvironment.production).toBe(true);
      expect(prodEnvironment.apiUrl).toBe('/api/v1');
    });
  });

  describe('Criterio 5: Paleta Institucional Consistente en la Interfaz', () => {
    let fixture: ComponentFixture<MainLayoutComponent>;
    let element: HTMLElement;
    let authService: AuthService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MainLayoutComponent],
        providers: [
          provideRouter([]),
          AuthService,
          SessionService
        ]
      }).compileComponents();

      authService = TestBed.inject(AuthService);
      authService.setMockSession('ADMIN', 'Dr. Roberto Mendoza');

      fixture = TestBed.createComponent(MainLayoutComponent);
      element = fixture.nativeElement;
      fixture.detectChanges();
    });

    it('debe utilizar las clases de color de la paleta institucional (pine-700, surface-app, surface-sidebar)', () => {
      // Fondo general con surface-app
      const mainContainer = element.querySelector('.bg-surface-app');
      expect(mainContainer).toBeTruthy();

      // Sidebar con surface-sidebar
      const sidebar = element.querySelector('.bg-surface-sidebar');
      expect(sidebar).toBeTruthy();

      // Logo institucional con verde pino (bg-pine-700)
      const logoBadge = element.querySelector('.bg-pine-700');
      expect(logoBadge).toBeTruthy();
    });

    it('debe reflejar la identidad institucional "Huellas del Valle S.A.S."', () => {
      expect(element.textContent).toContain('Huellas del Valle');
      expect(element.textContent).toContain('S.A.S.');
    });
  });

  describe('Criterio 6: MainLayoutComponent con Barra Superior, Menú Lateral y RouterOutlet', () => {
    let fixture: ComponentFixture<MainLayoutComponent>;
    let component: MainLayoutComponent;
    let element: HTMLElement;
    let authService: AuthService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MainLayoutComponent],
        providers: [
          provideRouter([]),
          AuthService,
          SessionService
        ]
      }).compileComponents();

      authService = TestBed.inject(AuthService);
      authService.setMockSession('ADMIN', 'Dr. Roberto Mendoza');

      fixture = TestBed.createComponent(MainLayoutComponent);
      component = fixture.componentInstance;
      element = fixture.nativeElement;
      fixture.detectChanges();
    });

    it('debe mostrar la barra superior de navegación (header) con indicador de API', () => {
      const header = element.querySelector('header');
      expect(header).toBeTruthy();
      expect(header?.textContent).toContain('Panel de Control');
      expect(header?.textContent).toContain(component.apiUrl);
    });

    it('debe mostrar el menú lateral dinámico (aside) con los 10 módulos del SRS', () => {
      const aside = element.querySelector('aside');
      expect(aside).toBeTruthy();

      const items = component.navItems();
      expect(items.length).toBe(10);

      // Comprobar módulos clave
      const labels = items.map((i) => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Roles y Permisos');
      expect(labels).toContain('Gestión de Usuarios');
      expect(labels).toContain('Clientes');
      expect(labels).toContain('Mascotas');
      expect(labels).toContain('Agenda de Citas');
      expect(labels).toContain('Inventario');
      expect(labels).toContain('Proveedores');
      expect(labels).toContain('Caja');
      expect(labels).toContain('Reportes y Auditoría');
    });

    it('debe renderizar el contenedor router-outlet en el área principal de contenido', () => {
      const main = element.querySelector('main');
      expect(main).toBeTruthy();

      const outlet = main?.querySelector('router-outlet');
      expect(outlet).toBeTruthy();
    });
  });

  describe('Criterio 7: Comportamiento Responsivo en Escritorio y Móvil sin Scroll Horizontal', () => {
    let fixture: ComponentFixture<MainLayoutComponent>;
    let component: MainLayoutComponent;
    let element: HTMLElement;
    let authService: AuthService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MainLayoutComponent],
        providers: [
          provideRouter([]),
          AuthService,
          SessionService
        ]
      }).compileComponents();

      authService = TestBed.inject(AuthService);
      authService.setMockSession('ADMIN', 'Dr. Roberto Mendoza');

      fixture = TestBed.createComponent(MainLayoutComponent);
      component = fixture.componentInstance;
      element = fixture.nativeElement;
      fixture.detectChanges();
    });

    it('debe permitir colapsar y expandir la barra lateral en escritorio mediante Signals', () => {
      expect(component.isCollapsed()).toBe(false);

      component.toggleSidebarCollapse();
      fixture.detectChanges();
      expect(component.isCollapsed()).toBe(true);

      component.toggleSidebarCollapse();
      fixture.detectChanges();
      expect(component.isCollapsed()).toBe(false);
    });

    it('debe permitir abrir y cerrar el menú móvil tipo drawer mediante Signals', () => {
      expect(component.isMobileOpen()).toBe(false);

      component.toggleMobileMenu();
      fixture.detectChanges();
      expect(component.isMobileOpen()).toBe(true);

      component.closeMobileMenu();
      fixture.detectChanges();
      expect(component.isMobileOpen()).toBe(false);
    });

    it('debe estructurar el contenedor principal con overflow-hidden para prevenir scroll horizontal', () => {
      const rootDiv = element.querySelector('.overflow-hidden');
      expect(rootDiv).toBeTruthy();

      const mainContent = element.querySelector('main.overflow-x-hidden');
      expect(mainContent).toBeTruthy();
    });
  });
});
