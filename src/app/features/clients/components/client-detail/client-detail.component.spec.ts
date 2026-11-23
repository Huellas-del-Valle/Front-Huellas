import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { ClientDetailComponent } from './client-detail.component';
import { ClientsService } from '../../services/clients.service';
import { Client } from '../../models/client.model';
import { of } from 'rxjs';

describe('ClientDetailComponent', () => {
  let component: ClientDetailComponent;
  let fixture: ComponentFixture<ClientDetailComponent>;
  let clientsService: ClientsService;
  let router: Router;

  const mockClient: Client = {
    id: 'cli-001',
    identification: '1088000111',
    fullName: 'Carlos Gómez',
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
  };

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? 'cli-001' : null)
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDetailComponent],
      providers: [
        ClientsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    clientsService = TestBed.inject(ClientsService);
    router = TestBed.inject(Router);
    vi.spyOn(clientsService, 'getClientById').mockReturnValue(of(mockClient));
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ClientDetailComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse y cargar el detalle del cliente por su ID', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.client()).toEqual(mockClient);
    expect(component.isLoading()).toBe(false);
  });

  it('debe mostrar los datos del propietario y el estado de Habeas Data', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('[data-testid="client-detail-name"]')?.textContent).toContain(
      'Carlos Gómez'
    );
    expect(compiled.querySelector('[data-testid="detail-phone"]')?.textContent).toContain(
      '3001234567'
    );
    expect(compiled.querySelector('[data-testid="detail-email"]')?.textContent).toContain(
      'carlos.gomez@gmail.com'
    );
    expect(compiled.querySelector('[data-testid="detail-address"]')?.textContent).toContain(
      'Calle 15 # 24-30'
    );
    expect(compiled.querySelector('[data-testid="habeas-authorized-badge"]')).toBeTruthy();
  });

  it('debe listar las mascotas asociadas con acceso a su perfil', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('[data-testid="pet-name"]')?.textContent).toContain('Max');
    expect(compiled.querySelector('[data-testid="pet-code"]')?.textContent).toContain(
      'HUV-2026-0001'
    );

    const viewPetBtn = compiled.querySelector('[data-testid="view-pet-btn-pet-001"]');
    expect(viewPetBtn).toBeTruthy();

    component.navigateToPetProfile('pet-001');
    expect(router.navigate).toHaveBeenCalledWith(['/patients', 'pet-001']);
  });

  it('debe mostrar el historial de atenciones clínicas de las mascotas del cliente', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;

    const row = compiled.querySelector('[data-testid="attention-row-att-001"]');
    expect(row).toBeTruthy();
    expect(row?.textContent).toContain('Max');
    expect(row?.textContent).toContain('Vacunación Antirrábica');
    expect(row?.textContent).toContain('Dra. Camila Torres');
  });

  it('debe permitir abrir el modal de edición y actualizar los datos con feedback visual', () => {
    fixture.detectChanges();

    expect(component.isEditModalOpen()).toBe(false);
    component.openEditModal();
    expect(component.isEditModalOpen()).toBe(true);

    const updatedClient: Client = { ...mockClient, fullName: 'Carlos Gómez Actualizado' };
    component.onClientUpdated(updatedClient);

    expect(component.isEditModalOpen()).toBe(false);
    expect(component.client()?.fullName).toBe('Carlos Gómez Actualizado');
    expect(component.feedbackMessage()).toContain('actualizados correctamente');
  });
});
