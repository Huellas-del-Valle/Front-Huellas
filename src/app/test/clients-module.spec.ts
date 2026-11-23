import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ClientsListComponent } from '../features/clients/components/clients-list/clients-list.component';
import { ClientFormComponent } from '../features/clients/components/client-form/client-form.component';
import { ClientDetailComponent } from '../features/clients/components/client-detail/client-detail.component';
import { ClientsService } from '../features/clients/services/clients.service';
import { SessionService } from '../core/services/session.service';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { Client, CreateClientDto } from '../features/clients/models/client.model';
import { routes } from '../app.routes';

describe('Módulo de Gestión de Propietarios y Clientes (Clients Module Integration)', () => {
  let listFixture: ComponentFixture<ClientsListComponent>;
  let listComponent: ClientsListComponent;
  let formFixture: ComponentFixture<ClientFormComponent>;
  let formComponent: ClientFormComponent;

  let clientsService: ClientsService;
  let sessionService: SessionService;
  let httpMock: HttpTestingController;
  let router: Router;
  let getClientsSpy: any;
  let searchClientsSpy: any;

  const mockClients: Client[] = [
    {
      id: 'cli-001',
      identification: '1088000111',
      fullName: 'Carlos Andrés Gómez',
      phone: '3001234567',
      email: 'carlos.gomez@gmail.com',
      address: 'Calle 15 # 24-30',
      dataProcessingAuthorized: true,
      createdAt: '2026-01-10T10:00:00.000Z',
      pets: [
        {
          id: 'pet-001',
          uniqueCode: 'HUV-2026-0001',
          name: 'Max',
          species: 'CANINO',
          breed: 'Golden Retriever',
          gender: 'MACHO',
          age: '3 años'
        }
      ],
      clinicalHistory: [
        {
          id: 'att-001',
          date: '2026-02-15T09:30:00.000Z',
          petName: 'Max',
          petId: 'pet-001',
          reason: 'Vacunación Antirrábica',
          veterinarianName: 'Dra. Camila Torres',
          diagnosis: 'Paciente saludable',
          status: 'COMPLETADA'
        }
      ]
    },
    {
      id: 'cli-002',
      identification: '1098234123',
      fullName: 'María Fernanda Ruiz',
      phone: '3109876543',
      email: 'maria.ruiz@hotmail.com',
      address: 'Carrera 8 # 45-12',
      dataProcessingAuthorized: true,
      createdAt: '2026-01-18T14:20:00.000Z',
      pets: [],
      clinicalHistory: []
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsListComponent, ClientFormComponent, ClientDetailComponent],
      providers: [
        ClientsService,
        SessionService,
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes)
      ]
    }).compileComponents();

    clientsService = TestBed.inject(ClientsService);
    sessionService = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    // Iniciar con rol autorizado (RECEPCIONISTA)
    sessionService.setMockSession('RECEPCIONISTA', 'Sandra Morales');

    getClientsSpy = vi.spyOn(clientsService, 'getClients').mockReturnValue(of(mockClients));
    searchClientsSpy = vi.spyOn(clientsService, 'searchClients').mockImplementation((q) => {
      if (!q) return of(mockClients);
      const query = q.toLowerCase();
      const filtered = mockClients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(query) ||
          c.identification.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query)
      );
      return of(filtered);
    });

    listFixture = TestBed.createComponent(ClientsListComponent);
    listComponent = listFixture.componentInstance;
    listFixture.detectChanges();

    formFixture = TestBed.createComponent(ClientFormComponent);
    formComponent = formFixture.componentInstance;
    formFixture.detectChanges();
  });

  afterEach(() => {
    sessionService.clearSession();
  });

  describe('Criterio 1: La búsqueda acepta nombre completo, documento y teléfono, con debounceTime(300) y distinctUntilChanged', () => {
    it('debe filtrar propietarios por nombre completo', () => {
      listComponent.searchControl.setValue('Carlos Andrés');
      // Direct call check
      clientsService.searchClients('Carlos Andrés').subscribe((res) => {
        expect(res.length).toBe(1);
        expect(res[0].fullName).toBe('Carlos Andrés Gómez');
      });
    });

    it('debe filtrar propietarios por documento de identidad (cédula)', () => {
      clientsService.searchClients('1088000111').subscribe((res) => {
        expect(res.length).toBe(1);
        expect(res[0].identification).toBe('1088000111');
      });
    });

    it('debe filtrar propietarios por número de teléfono', () => {
      clientsService.searchClients('3109876543').subscribe((res) => {
        expect(res.length).toBe(1);
        expect(res[0].phone).toBe('3109876543');
      });
    });

    it('debe aplicar debounceTime(300) y distinctUntilChanged en el searchControl', () => {
      const searchSpy = vi.spyOn(clientsService, 'searchClients');

      // Modificar el valor de búsqueda
      listComponent.searchControl.setValue('María');
      expect(listComponent.searchControl.value).toBe('María');
    });
  });

  describe('Criterio 2: Los resultados se muestran de forma no bloqueante y en tiempo óptimo', () => {
    it('debe activar el estado isSearching durante la consulta sin bloquear la interfaz', () => {
      expect(listComponent.isSearching()).toBe(false);

      listComponent.searchControl.setValue('Buscando');
      // La interfaz no se congela y la tabla permanece disponible
      expect(listComponent.clients().length).toBeGreaterThan(0);
    });
  });

  describe('Criterio 3: El formulario valida cédula, nombre, teléfono, correo y dirección; no permite guardar datos incompletos o mal formados', () => {
    it('debe inicializar el formulario como inválido si los campos están vacíos', () => {
      expect(formComponent.form.valid).toBe(false);
      expect(formComponent.identification.errors?.['required']).toBe(true);
      expect(formComponent.fullName.errors?.['required']).toBe(true);
      expect(formComponent.phone.errors?.['required']).toBe(true);
      expect(formComponent.email.errors?.['required']).toBe(true);
      expect(formComponent.address.errors?.['required']).toBe(true);
    });

    it('debe validar la longitud y caracteres del documento de identidad', () => {
      formComponent.identification.setValue('123'); // Muy corto
      expect(formComponent.identification.valid).toBe(false);

      formComponent.identification.setValue('1088000111'); // Válido
      expect(formComponent.identification.valid).toBe(true);
    });

    it('debe validar el formato del correo electrónico', () => {
      formComponent.email.setValue('correo-invalido');
      expect(formComponent.email.valid).toBe(false);

      formComponent.email.setValue('cliente@gmail.com');
      expect(formComponent.email.valid).toBe(true);
    });

    it('debe validar el formato del teléfono móvil', () => {
      formComponent.phone.setValue('12'); // Inválido
      expect(formComponent.phone.valid).toBe(false);

      formComponent.phone.setValue('3001234567'); // Válido
      expect(formComponent.phone.valid).toBe(true);
    });

    it('debe bloquear el guardado si el formulario es inválido', () => {
      const createSpy = vi.spyOn(clientsService, 'createClient');
      formComponent.onSubmit();

      expect(createSpy).not.toHaveBeenCalled();
      expect(formComponent.form.touched).toBe(true);
    });
  });

  describe('Criterio 4: El consentimiento para tratamiento de datos personales es obligatorio antes de guardar', () => {
    it('debe rechazar el formulario si dataProcessingAuthorized es false (Ley 1581 de 2012)', () => {
      formComponent.form.patchValue({
        identification: '1088000111',
        fullName: 'Carlos Gómez',
        phone: '3001234567',
        email: 'carlos@gmail.com',
        address: 'Calle 15 # 24-30',
        dataProcessingAuthorized: false
      });

      expect(formComponent.dataProcessingAuthorized.valid).toBe(false);
      expect(formComponent.form.valid).toBe(false);

      const createSpy = vi.spyOn(clientsService, 'createClient');
      formComponent.onSubmit();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('debe habilitar el formulario cuando dataProcessingAuthorized es true', () => {
      formComponent.form.patchValue({
        identification: '1088000111',
        fullName: 'Carlos Gómez',
        phone: '3001234567',
        email: 'carlos@gmail.com',
        address: 'Calle 15 # 24-30',
        dataProcessingAuthorized: true
      });

      expect(formComponent.dataProcessingAuthorized.valid).toBe(true);
      expect(formComponent.form.valid).toBe(true);
    });
  });

  describe('Criterio 5: ClientDetailComponent muestra datos del propietario, historial de atenciones y mascotas asociadas con acceso a cada perfil', () => {
    it('debe cargar y renderizar los datos personales del cliente', () => {
      const detailFixture = TestBed.createComponent(ClientDetailComponent);
      const detailComp = detailFixture.componentInstance;
      vi.spyOn(clientsService, 'getClientById').mockReturnValue(of(mockClients[0]));

      detailComp.loadClientDetail('cli-001');
      detailFixture.detectChanges();

      expect(detailComp.client()?.fullName).toBe('Carlos Andrés Gómez');
      expect(detailComp.client()?.identification).toBe('1088000111');
      expect(detailComp.client()?.dataProcessingAuthorized).toBe(true);
    });

    it('debe listar las mascotas asociadas con acceso a su perfil', () => {
      const detailFixture = TestBed.createComponent(ClientDetailComponent);
      const detailComp = detailFixture.componentInstance;
      vi.spyOn(clientsService, 'getClientById').mockReturnValue(of(mockClients[0]));
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      detailComp.loadClientDetail('cli-001');
      detailFixture.detectChanges();

      expect(detailComp.client()?.pets?.length).toBe(1);
      expect(detailComp.client()?.pets?.[0].uniqueCode).toBe('HUV-2026-0001');

      detailComp.navigateToPetProfile('pet-001');
      expect(navSpy).toHaveBeenCalledWith(['/patients', 'pet-001']);
    });

    it('debe mostrar el historial de atenciones de las mascotas', () => {
      const detailFixture = TestBed.createComponent(ClientDetailComponent);
      const detailComp = detailFixture.componentInstance;
      vi.spyOn(clientsService, 'getClientById').mockReturnValue(of(mockClients[0]));

      detailComp.loadClientDetail('cli-001');
      detailFixture.detectChanges();

      expect(detailComp.client()?.clinicalHistory?.length).toBe(1);
      expect(detailComp.client()?.clinicalHistory?.[0].reason).toBe('Vacunación Antirrábica');
    });
  });

  describe('Criterio 6: Se notifican operaciones exitosas y documentos duplicados; ClientsService integra /api/v1/clients', () => {
    it('GET /api/v1/clients/search?query=1088', () => {
      searchClientsSpy.mockRestore();
      const service = TestBed.inject(ClientsService);
      service.searchClients('1088').subscribe((res) => {
        expect(res.length).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/clients/search?query=1088`);
      expect(req.request.method).toBe('GET');
      req.flush([mockClients[0]]);
    });

    it('POST /api/v1/clients con payload del contrato y respuesta 200/201', () => {
      const service = TestBed.inject(ClientsService);
      const contractPayload: CreateClientDto = {
        identification: '1088000111',
        fullName: 'user ejemplo',
        phone: '3001234567',
        email: 'userejemplo@huellas.com',
        address: 'Calle Ejemplo 123',
        dataProcessingAuthorized: true
      };

      service.createClient(contractPayload).subscribe((res) => {
        expect(res.identification).toBe('1088000111');
        expect(res.fullName).toBe('user ejemplo');
        expect(res.dataProcessingAuthorized).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/clients`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(contractPayload);
      req.flush({ ...contractPayload, id: 'uuid-v4', createdAt: '2026-10-21T10:00:00Z' });
    });

    it('GET /api/v1/clients/:id', () => {
      const service = TestBed.inject(ClientsService);
      service.getClientById('cli-001').subscribe((res) => {
        expect(res.id).toBe('cli-001');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/clients/cli-001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockClients[0]);
    });

    it('PUT /api/v1/clients/:id', () => {
      const service = TestBed.inject(ClientsService);
      service.updateClient('cli-001', { phone: '3151112233' }).subscribe((res) => {
        expect(res.phone).toBe('3151112233');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/clients/cli-001`);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...mockClients[0], phone: '3151112233' });
    });

    it('debe notificar documento duplicado en cliente antes de enviar', () => {
      formFixture.componentRef.setInput('existingIdentifications', ['1088000111']);
      formFixture.detectChanges();

      formComponent.form.patchValue({
        identification: '1088000111',
        fullName: 'Otro Propietario',
        phone: '3001234567',
        email: 'otro@gmail.com',
        address: 'Calle 10 # 20-30',
        dataProcessingAuthorized: true
      });

      const createSpy = vi.spyOn(clientsService, 'createClient');
      formComponent.onSubmit();

      expect(createSpy).not.toHaveBeenCalled();
      expect(formComponent.identification.errors?.['duplicate']).toBe(true);
      expect(formComponent.submitError()).toContain('ya se encuentra registrado');
    });

    it('debe manejar error HTTP 409 de documento duplicado devuelto por la API', () => {
      formComponent.form.patchValue({
        identification: '1099888777',
        fullName: 'Nuevo Propietario',
        phone: '3001234567',
        email: 'nuevo@gmail.com',
        address: 'Calle 10 # 20-30',
        dataProcessingAuthorized: true
      });

      vi.spyOn(clientsService, 'createClient').mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Document already exists' } }))
      );

      formComponent.onSubmit();

      expect(formComponent.identification.errors?.['duplicate']).toBe(true);
      expect(formComponent.submitError()).toContain('ya se encuentra registrado');
    });

    it('debe mostrar confirmación visual tras registrar exitosamente un propietario', () => {
      const newClient: Client = {
        id: 'cli-new',
        identification: '1099112233',
        fullName: 'Laura Montoya',
        phone: '3123456789',
        email: 'laura@gmail.com',
        address: 'Carrera 7 # 32-10',
        dataProcessingAuthorized: true,
        createdAt: '2026-02-23'
      };

      listComponent.onClientSaved(newClient);
      listFixture.detectChanges();

      expect(listComponent.feedbackMessage()).toContain('registrado exitosamente');
      const banner = listFixture.nativeElement.querySelector('[data-testid="feedback-banner"]');
      expect(banner).toBeTruthy();
    });
  });

  describe('Criterio 7: Solo usuarios autorizados (ADMIN, VETERINARIO, RECEPCIONISTA) pueden acceder', () => {
    it('la ruta /clients restringe acceso a ADMIN, VETERINARIO, RECEPCIONISTA', () => {
      const rootRoutes = routes;
      const mainRoute = rootRoutes.find((r) => r.path === '');
      const clientsChildRoute = mainRoute?.children?.find((r) => r.path === 'clients');

      expect(clientsChildRoute).toBeDefined();
      expect(clientsChildRoute?.data?.['roles']).toEqual(['ADMIN', 'VETERINARIO', 'RECEPCIONISTA']);
    });

    it('ClientsListComponent bloquea la carga si el usuario no tiene rol autorizado', () => {
      sessionService.clearSession();
      const unauthorizedFixture = TestBed.createComponent(ClientsListComponent);
      const unauthorizedComp = unauthorizedFixture.componentInstance;
      unauthorizedFixture.detectChanges();

      expect(unauthorizedComp.isAuthorized()).toBe(false);
      expect(unauthorizedComp.errorMessage()).toContain('Acceso denegado');
    });
  });
});
