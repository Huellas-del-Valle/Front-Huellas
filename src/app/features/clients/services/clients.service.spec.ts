import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientsService } from './clients.service';
import { environment } from '../../../../environments/environment';
import { Client, ClientPetSummary, CreateClientDto, UpdateClientDto } from '../models/client.model';

describe('ClientsService', () => {
  let service: ClientsService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/clients`;

  const mockClient: Client = {
    id: 'cli-001',
    identification: '1088000111',
    fullName: 'Carlos Gómez',
    phone: '3001234567',
    email: 'carlos.gomez@gmail.com',
    address: 'Calle 15 # 24-30',
    dataProcessingAuthorized: true,
    createdAt: '2026-01-10T10:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClientsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ClientsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('GET /api/v1/clients debe obtener la lista de clientes', () => {
    service.getClients().subscribe((clients) => {
      expect(clients.length).toBe(1);
      expect(clients[0]).toEqual(mockClient);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockClient]);
  });

  it('GET /api/v1/clients/search?query=1088 debe enviar el término de búsqueda', () => {
    service.searchClients('1088').subscribe((clients) => {
      expect(clients.length).toBe(1);
      expect(clients[0].identification).toBe('1088000111');
    });

    const req = httpMock.expectOne(`${baseUrl}/search?query=1088`);
    expect(req.request.method).toBe('GET');
    req.flush([mockClient]);
  });

  it('GET /api/v1/clients/:id debe obtener el detalle del cliente', () => {
    service.getClientById('cli-001').subscribe((client) => {
      expect(client.id).toBe('cli-001');
      expect(client.fullName).toBe('Carlos Gómez');
    });

    const req = httpMock.expectOne(`${baseUrl}/cli-001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClient);
  });

  it('GET /api/v1/clients/:id/pets debe obtener las mascotas del cliente', () => {
    const mockPets: ClientPetSummary[] = [
      {
        id: 'pet-001',
        uniqueCode: 'HUV-2026-0001',
        name: 'Max',
        species: 'CANINO',
        breed: 'Golden Retriever',
        gender: 'MACHO'
      }
    ];

    service.getClientPets('cli-001').subscribe((pets) => {
      expect(pets.length).toBe(1);
      expect(pets[0].name).toBe('Max');
    });

    const req = httpMock.expectOne(`${baseUrl}/cli-001/pets`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPets);
  });

  it('POST /api/v1/clients debe registrar un nuevo cliente con Habeas Data', () => {
    const createDto: CreateClientDto = {
      identification: '1088000111',
      fullName: 'Carlos Gómez',
      phone: '3001234567',
      email: 'carlos.gomez@gmail.com',
      address: 'Calle 15 # 24-30',
      dataProcessingAuthorized: true
    };

    service.createClient(createDto).subscribe((client) => {
      expect(client.fullName).toBe(createDto.fullName);
      expect(client.dataProcessingAuthorized).toBe(true);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createDto);
    req.flush({ ...createDto, id: 'cli-new-1', createdAt: '2026-02-23' });
  });

  it('PUT /api/v1/clients/:id debe actualizar los datos de un cliente', () => {
    const updateDto: UpdateClientDto = {
      phone: '3119876543',
      address: 'Nueva Dirección 123'
    };

    service.updateClient('cli-001', updateDto).subscribe((client) => {
      expect(client.phone).toBe('3119876543');
    });

    const req = httpMock.expectOne(`${baseUrl}/cli-001`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateDto);
    req.flush({ ...mockClient, ...updateDto });
  });
});
