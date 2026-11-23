import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { environment } from '../../../../environments/environment';
import { CreateUserDto, UpdateUserDto, User } from '../models/user.model';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/users`;

  const mockUser: User = {
    id: 'usr-123',
    fullName: 'Dra. María Lopez',
    email: 'maria.lopez@huellasdelvalle.com',
    role: 'VETERINARIO',
    isActive: true,
    phone: '+57 300 111 2233',
    identification: '1098112233',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsersService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('GET /api/v1/users debe obtener la lista de usuarios sin parámetros', () => {
    const mockUsers: User[] = [mockUser];

    service.getUsers().subscribe((users) => {
      expect(users.length).toBe(1);
      expect(users).toEqual(mockUsers);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('GET /api/v1/users debe enviar parámetros de búsqueda, rol y estado cuando se especifican', () => {
    service
      .getUsers({ search: 'María', role: 'VETERINARIO', status: 'ACTIVE', page: 1, limit: 10 })
      .subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === baseUrl &&
        r.params.get('search') === 'María' &&
        r.params.get('role') === 'VETERINARIO' &&
        r.params.get('status') === 'ACTIVE' &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockUser]);
  });

  it('GET /api/v1/users/:id debe obtener el detalle de un usuario', () => {
    service.getUserById('usr-123').subscribe((user) => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${baseUrl}/usr-123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('POST /api/v1/users debe registrar un nuevo empleado', () => {
    const createDto: CreateUserDto = {
      fullName: 'Carlos Gómez',
      email: 'carlos.gomez@huellasdelvalle.com',
      password: 'Password123!',
      role: 'RECEPCIONISTA',
      isActive: true
    };

    service.createUser(createDto).subscribe((user) => {
      expect(user.fullName).toBe(createDto.fullName);
      expect(user.role).toBe('RECEPCIONISTA');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createDto);
    req.flush({ ...mockUser, ...createDto, id: 'usr-new-1' });
  });

  it('PUT /api/v1/users/:id debe actualizar los datos de un empleado', () => {
    const updateDto: UpdateUserDto = {
      fullName: 'Dra. María Lopez Actualizada',
      role: 'ADMIN'
    };

    service.updateUser('usr-123', updateDto).subscribe((user) => {
      expect(user.fullName).toBe('Dra. María Lopez Actualizada');
      expect(user.role).toBe('ADMIN');
    });

    const req = httpMock.expectOne(`${baseUrl}/usr-123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateDto);
    req.flush({ ...mockUser, ...updateDto });
  });

  it('PATCH /api/v1/users/:id/status debe activar o inactivar la cuenta de un usuario', () => {
    service.updateUserStatus('usr-123', false).subscribe((user) => {
      expect(user.isActive).toBe(false);
    });

    const req = httpMock.expectOne(`${baseUrl}/usr-123/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false, status: 'INACTIVE' });
    req.flush({ ...mockUser, isActive: false });
  });
});
