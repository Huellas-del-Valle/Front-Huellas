import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ClientsListComponent } from './clients-list.component';
import { ClientsService } from '../../services/clients.service';
import { SessionService } from '../../../../core/services/session.service';
import { Client } from '../../models/client.model';
import { of } from 'rxjs';

describe('ClientsListComponent', () => {
  let component: ClientsListComponent;
  let fixture: ComponentFixture<ClientsListComponent>;
  let clientsService: ClientsService;
  let sessionService: SessionService;
  let router: Router;

  const mockClients: Client[] = [
    {
      id: 'cli-001',
      identification: '1088000111',
      fullName: 'Carlos Andrés Gómez',
      phone: '3001234567',
      email: 'carlos.gomez@gmail.com',
      address: 'Calle 15 # 24-30',
      dataProcessingAuthorized: true,
      createdAt: '2026-01-10T10:00:00.000Z'
    },
    {
      id: 'cli-002',
      identification: '1098234123',
      fullName: 'María Fernanda Ruiz',
      phone: '3109876543',
      email: 'maria.ruiz@hotmail.com',
      address: 'Carrera 8 # 45-12',
      dataProcessingAuthorized: true,
      createdAt: '2026-01-18T14:20:00.000Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsListComponent],
      providers: [
        ClientsService,
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    clientsService = TestBed.inject(ClientsService);
    sessionService = TestBed.inject(SessionService);
    router = TestBed.inject(Router);

    // Iniciar con rol autorizado (RECEPCIONISTA)
    sessionService.setMockSession('RECEPCIONISTA', 'Sandra Morales');
    vi.spyOn(clientsService, 'getClients').mockReturnValue(of(mockClients));
    vi.spyOn(clientsService, 'searchClients').mockReturnValue(of([mockClients[0]]));
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ClientsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionService.clearSession();
  });

  it('debe crearse y cargar el listado de propietarios', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.clients().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('debe restringir el acceso si el usuario no tiene rol autorizado', () => {
    sessionService.clearSession();
    const unauthFixture = TestBed.createComponent(ClientsListComponent);
    const unauthComp = unauthFixture.componentInstance;
    unauthFixture.detectChanges();

    expect(unauthComp.isAuthorized()).toBe(false);
    expect(unauthComp.errorMessage()).toContain('Acceso denegado');
  });

  it('debe emitir la búsqueda mediante searchControl', async () => {
    fixture.detectChanges();

    component.searchControl.setValue('Carlos');
    expect(component.searchControl.value).toBe('Carlos');
  });

  it('debe navegar al detalle del cliente al invocar navigateToDetail', () => {
    fixture.detectChanges();
    component.navigateToDetail('cli-001');
    expect(router.navigate).toHaveBeenCalledWith(['/clients', 'cli-001']);
  });

  it('debe abrir y cerrar el modal de formulario en modo creación y edición', () => {
    fixture.detectChanges();

    component.openCreateClient();
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.selectedClientForEdit()).toBeNull();

    component.closeFormModal();
    expect(component.isFormModalOpen()).toBe(false);

    component.openEditClient(mockClients[1]);
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.selectedClientForEdit()?.id).toBe('cli-002');
  });

  it('debe actualizar la lista y mostrar feedback visual al guardar un cliente', () => {
    fixture.detectChanges();

    const newClient: Client = {
      id: 'cli-new',
      identification: '1099888777',
      fullName: 'Nuevo Cliente',
      phone: '3150001122',
      email: 'nuevo@cliente.com',
      address: 'Calle 100 # 20-30',
      dataProcessingAuthorized: true,
      createdAt: '2026-02-23'
    };

    component.onClientSaved(newClient);

    expect(component.clients().length).toBe(3);
    expect(component.feedbackMessage()).toContain('registrado exitosamente');
    expect(component.isFormModalOpen()).toBe(false);
  });
});
