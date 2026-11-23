import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { UsersListComponent } from '../features/users/components/users-list/users-list.component';
import { UserFormDialogComponent } from '../features/users/components/user-form-dialog/user-form-dialog.component';
import { UsersService } from '../features/users/services/users.service';
import { SessionService } from '../core/services/session.service';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import { ROLE_DESCRIPTIONS, User } from '../features/users/models/user.model';
import { routes } from '../app.routes';

describe('Módulo de Gestión de Empleados y Usuarios (Users Module Integration)', () => {
  let listFixture: ComponentFixture<UsersListComponent>;
  let listComponent: UsersListComponent;
  let formFixture: ComponentFixture<UserFormDialogComponent>;
  let formComponent: UserFormDialogComponent;

  let usersService: UsersService;
  let sessionService: SessionService;
  let httpMock: HttpTestingController;
  let router: Router;
  let getUsersSpy: any;

  const mockUsers: User[] = [
    {
      id: 'usr-admin-01',
      fullName: 'Dr. Roberto Mendoza',
      email: 'admin@huellasdelvalle.com',
      role: 'ADMIN',
      isActive: true,
      phone: '+57 310 555 0101',
      identification: '1098234567',
      createdAt: '2026-01-10T08:00:00.000Z'
    },
    {
      id: 'usr-vet-01',
      fullName: 'Dra. Camila Torres',
      email: 'camila.torres@huellasdelvalle.com',
      role: 'VETERINARIO',
      isActive: true,
      phone: '+57 312 444 0202',
      identification: '1098345678',
      createdAt: '2026-01-15T09:30:00.000Z'
    },
    {
      id: 'usr-rec-01',
      fullName: 'Sandra Morales',
      email: 'recepcion@huellasdelvalle.com',
      role: 'RECEPCIONISTA',
      isActive: false,
      phone: '+57 315 333 0303',
      identification: '1098456789',
      createdAt: '2026-02-01T10:00:00.000Z'
    },
    {
      id: 'usr-vet-02',
      fullName: 'Dr. Alejandro Peña',
      email: 'alejandro.pena@huellasdelvalle.com',
      role: 'VETERINARIO',
      isActive: false,
      phone: '+57 318 222 0404',
      identification: '1098567890',
      createdAt: '2026-02-10T11:15:00.000Z'
    },
    {
      id: 'usr-rec-02',
      fullName: 'Carlos Gómez',
      email: 'carlos.gomez@huellasdelvalle.com',
      role: 'RECEPCIONISTA',
      isActive: true,
      phone: '+57 301 777 0505',
      identification: '1098678901',
      createdAt: '2026-02-18T14:20:00.000Z'
    },
    {
      id: 'usr-vet-03',
      fullName: 'Dra. Elena Silva',
      email: 'elena.silva@huellasdelvalle.com',
      role: 'VETERINARIO',
      isActive: true,
      phone: '+57 311 999 0606',
      identification: '1098789012',
      createdAt: '2026-02-20T16:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent, UserFormDialogComponent],
      providers: [
        UsersService,
        SessionService,
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes)
      ]
    }).compileComponents();

    usersService = TestBed.inject(UsersService);
    sessionService = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    // Iniciar con rol ADMIN
    sessionService.setMockSession('ADMIN', 'Dr. Roberto Mendoza');

    getUsersSpy = vi.spyOn(usersService, 'getUsers').mockReturnValue(of(mockUsers));

    listFixture = TestBed.createComponent(UsersListComponent);
    listComponent = listFixture.componentInstance;
    listFixture.detectChanges();

    formFixture = TestBed.createComponent(UserFormDialogComponent);
    formComponent = formFixture.componentInstance;
    formFixture.detectChanges();
  });

  afterEach(() => {
    sessionService.clearSession();
  });

  describe('Criterio 1: UsersListComponent muestra listado paginado y permite filtrar por nombre, correo, rol y estado', () => {
    it('debe renderizar la tabla con los usuarios cargados', () => {
      expect(listComponent.users().length).toBe(6);
      expect(listComponent.isLoading()).toBe(false);

      const table = listFixture.nativeElement.querySelector('[data-testid="users-table"]');
      expect(table).toBeTruthy();
    });

    it('debe permitir paginar los resultados con controles de navegación', () => {
      listComponent.setPageSize(3);
      listFixture.detectChanges();

      expect(listComponent.pageSize()).toBe(3);
      expect(listComponent.totalPages()).toBe(2);
      expect(listComponent.currentPage()).toBe(1);
      expect(listComponent.paginatedUsers().length).toBe(3);

      // Siguiente página
      listComponent.nextPage();
      listFixture.detectChanges();
      expect(listComponent.currentPage()).toBe(2);
      expect(listComponent.paginatedUsers().length).toBe(3);

      // Anterior página
      listComponent.prevPage();
      listFixture.detectChanges();
      expect(listComponent.currentPage()).toBe(1);
    });

    it('debe filtrar dinámicamente por nombre o correo', () => {
      // Filtrar por nombre
      listComponent.setSearchTerm('Camila');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().length).toBe(1);
      expect(listComponent.filteredUsers()[0].fullName).toBe('Dra. Camila Torres');

      // Filtrar por correo
      listComponent.setSearchTerm('recepcion@');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().length).toBe(1);
      expect(listComponent.filteredUsers()[0].email).toBe('recepcion@huellasdelvalle.com');

      // Limpiar filtro
      listComponent.setSearchTerm('');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().length).toBe(6);
    });

    it('debe filtrar dinámicamente por rol institucional', () => {
      listComponent.setRoleFilter('VETERINARIO');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().every((u) => u.role === 'VETERINARIO')).toBe(true);
      expect(listComponent.filteredUsers().length).toBe(3);

      listComponent.setRoleFilter('RECEPCIONISTA');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().every((u) => u.role === 'RECEPCIONISTA')).toBe(true);
      expect(listComponent.filteredUsers().length).toBe(2);

      listComponent.setRoleFilter('ADMIN');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().length).toBe(1);
    });

    it('debe filtrar dinámicamente por estado de la cuenta (activo o inactivo)', () => {
      listComponent.setStatusFilter('ACTIVE');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().every((u) => u.isActive)).toBe(true);
      expect(listComponent.filteredUsers().length).toBe(4);

      listComponent.setStatusFilter('INACTIVE');
      listFixture.detectChanges();
      expect(listComponent.filteredUsers().every((u) => !u.isActive)).toBe(true);
      expect(listComponent.filteredUsers().length).toBe(2);
    });
  });

  describe('Criterio 2: UserFormDialogComponent permite registrar y editar usuarios con validaciones de correo institucional y contraseña segura', () => {
    it('debe validar que los campos obligatorios no queden vacíos al registrar', () => {
      expect(formComponent.form.valid).toBe(false);
      expect(formComponent.fullName.errors?.['required']).toBe(true);
      expect(formComponent.email.errors?.['required']).toBe(true);
      expect(formComponent.password.errors?.['required']).toBe(true);
    });

    it('debe validar el formato del correo institucional', () => {
      formComponent.email.setValue('correo-invalido');
      expect(formComponent.email.valid).toBe(false);

      formComponent.email.setValue('valido@huellasdelvalle.com');
      expect(formComponent.email.valid).toBe(true);
    });

    it('debe validar la seguridad de la contraseña: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número', () => {
      // Insegura: sin mayúscula
      formComponent.password.setValue('password123');
      expect(formComponent.password.valid).toBe(false);
      expect(formComponent.password.errors?.['securePassword']).toBeTruthy();

      // Insegura: sin número
      formComponent.password.setValue('PasswordSinNumero');
      expect(formComponent.password.valid).toBe(false);

      // Insegura: menor a 8 caracteres
      formComponent.password.setValue('Pass1');
      expect(formComponent.password.valid).toBe(false);

      // Segura
      formComponent.password.setValue('HuellasPass2026!');
      expect(formComponent.password.valid).toBe(true);
    });

    it('en modo edición permite actualizar datos y la contraseña es opcional', () => {
      const editFixture = TestBed.createComponent(UserFormDialogComponent);
      editFixture.componentRef.setInput('user', mockUsers[1]);
      editFixture.detectChanges();
      const editComponent = editFixture.componentInstance;

      expect(editComponent.isEditMode()).toBe(true);
      expect(editComponent.fullName.value).toBe(mockUsers[1].fullName);
      expect(editComponent.email.value).toBe(mockUsers[1].email);
      expect(editComponent.password.valid).toBe(true); // Opcional en edición
    });
  });

  describe('Criterio 3: El selector presenta ADMIN, VETERINARIO y RECEPCIONISTA con una descripción comprensible de sus permisos', () => {
    it('debe presentar los 3 roles con sus títulos y descripciones detalladas de permisos', () => {
      const roles = formComponent.availableRoles;
      expect(roles.length).toBe(3);

      const admin = ROLE_DESCRIPTIONS.ADMIN;
      expect(admin.title).toBe('Administrador del Sistema');
      expect(admin.description).toContain('Control total');
      expect(admin.permissions.length).toBeGreaterThan(0);

      const vet = ROLE_DESCRIPTIONS.VETERINARIO;
      expect(vet.title).toBe('Médico Veterinario');
      expect(vet.description).toContain('clínica');
      expect(vet.permissions.length).toBeGreaterThan(0);

      const rec = ROLE_DESCRIPTIONS.RECEPCIONISTA;
      expect(rec.title).toBe('Recepción y Caja');
      expect(rec.description).toContain('Operación diaria');
      expect(rec.permissions.length).toBeGreaterThan(0);
    });

    it('debe permitir seleccionar cualquiera de los 3 roles actualizando el formulario', () => {
      formComponent.selectRole('ADMIN');
      expect(formComponent.role.value).toBe('ADMIN');

      formComponent.selectRole('RECEPCIONISTA');
      expect(formComponent.role.value).toBe('RECEPCIONISTA');

      formComponent.selectRole('VETERINARIO');
      expect(formComponent.role.value).toBe('VETERINARIO');
    });
  });

  describe('Criterio 4: Activar/inactivar cuenta requiere confirmación explícita antes de ejecutar el cambio', () => {
    it('al pulsar activar/inactivar debe abrir el diálogo de confirmación sin ejecutar la petición inmediatamente', () => {
      const targetUser = mockUsers[0];
      const statusSpy = vi.spyOn(usersService, 'updateUserStatus');

      listComponent.promptToggleStatus(targetUser);
      listFixture.detectChanges();

      expect(listComponent.userToToggleStatus()).toEqual(targetUser);
      expect(statusSpy).not.toHaveBeenCalled();

      const modal = listFixture.nativeElement.querySelector('[data-testid="confirm-status-modal"]');
      expect(modal).toBeTruthy();
    });

    it('al cancelar la confirmación debe cerrar el diálogo sin modificar el estado', () => {
      const targetUser = mockUsers[0];
      const statusSpy = vi.spyOn(usersService, 'updateUserStatus');

      listComponent.promptToggleStatus(targetUser);
      listComponent.cancelToggleStatus();
      listFixture.detectChanges();

      expect(listComponent.userToToggleStatus()).toBeNull();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('al confirmar explícitamente debe invocar updateUserStatus y actualizar el estado', () => {
      const targetUser = mockUsers[0]; // Usuario activo
      listComponent.promptToggleStatus(targetUser);

      const updatedUser: User = { ...targetUser, isActive: false };
      vi.spyOn(usersService, 'updateUserStatus').mockReturnValue(of(updatedUser));

      listComponent.confirmToggleStatus();
      listFixture.detectChanges();

      expect(usersService.updateUserStatus).toHaveBeenCalledWith(targetUser.id, false);
      expect(listComponent.userToToggleStatus()).toBeNull();
      expect(listComponent.feedbackMessage()).toContain('inactivada correctamente');
    });
  });

  describe('Criterio 5: UsersService integra los endpoints GET/POST /api/v1/users, PUT /api/v1/users/:id y PATCH /api/v1/users/:id/status', () => {
    it('GET /api/v1/users', () => {
      getUsersSpy.mockRestore();
      const service = TestBed.inject(UsersService);
      service.getUsers().subscribe((data) => {
        expect(data).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('POST /api/v1/users', () => {
      const service = TestBed.inject(UsersService);
      const newDto = {
        fullName: 'Nuevo Empleado',
        email: 'nuevo@huellasdelvalle.com',
        password: 'Password123',
        role: 'RECEPCIONISTA' as const
      };

      service.createUser(newDto).subscribe((res) => {
        expect(res.fullName).toBe(newDto.fullName);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newDto);
      req.flush({ ...newDto, id: 'usr-new-1', isActive: true, createdAt: '2026-02-23' });
    });

    it('PUT /api/v1/users/:id', () => {
      const service = TestBed.inject(UsersService);
      const updateDto = { fullName: 'Nombre Editado' };

      service.updateUser('usr-1', updateDto).subscribe((res) => {
        expect(res.fullName).toBe('Nombre Editado');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users/usr-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateDto);
      req.flush({ ...mockUsers[0], ...updateDto });
    });

    it('PATCH /api/v1/users/:id/status', () => {
      const service = TestBed.inject(UsersService);
      service.updateUserStatus('usr-1', false).subscribe((res) => {
        expect(res.isActive).toBe(false);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users/usr-1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false, status: 'INACTIVE' });
      req.flush({ ...mockUsers[0], isActive: false });
    });
  });

  describe('Criterio 6: Solo el rol ADMIN puede acceder al módulo; correo duplicado o formato inválido impide guardar', () => {
    it('la ruta /users exige roles: [ADMIN]', () => {
      const rootRoutes = routes;
      const mainRoute = rootRoutes.find((r) => r.path === '');
      const usersChildRoute = mainRoute?.children?.find((r) => r.path === 'users');

      expect(usersChildRoute).toBeDefined();
      expect(usersChildRoute?.data?.['roles']).toEqual(['ADMIN']);
    });

    it('UsersListComponent bloquea el acceso si el rol no es ADMIN', () => {
      sessionService.setMockSession('VETERINARIO', 'Dra. No Admin');
      const unauthorizedFixture = TestBed.createComponent(UsersListComponent);
      const unauthorizedComponent = unauthorizedFixture.componentInstance;
      unauthorizedFixture.detectChanges();

      expect(unauthorizedComponent.isAdmin()).toBe(false);
      expect(unauthorizedComponent.errorMessage()).toContain('Acceso denegado');
    });

    it('correo con formato inválido impide guardar el formulario', () => {
      formComponent.form.patchValue({
        fullName: 'Empleado Test',
        email: 'correo-sin-formato',
        password: 'PasswordSegura123',
        role: 'RECEPCIONISTA'
      });

      const saveSpy = vi.spyOn(usersService, 'createUser');
      formComponent.onSubmit();

      expect(saveSpy).not.toHaveBeenCalled();
      expect(formComponent.email.invalid).toBe(true);
    });

    it('correo duplicado en cliente impide guardar el formulario', () => {
      formFixture.componentRef.setInput('existingEmails', ['duplicado@huellasdelvalle.com']);
      formFixture.detectChanges();

      formComponent.form.patchValue({
        fullName: 'Empleado Test',
        email: 'duplicado@huellasdelvalle.com',
        password: 'PasswordSegura123',
        role: 'RECEPCIONISTA'
      });

      const saveSpy = vi.spyOn(usersService, 'createUser');
      formComponent.onSubmit();

      expect(saveSpy).not.toHaveBeenCalled();
      expect(formComponent.email.errors?.['duplicate']).toBe(true);
      expect(formComponent.submitError()).toContain('ya se encuentra registrado');
    });

    it('correo duplicado reportado por la API (HTTP 409) impide guardar y marca error', () => {
      formComponent.form.patchValue({
        fullName: 'Empleado Test',
        email: 'nuevo@huellasdelvalle.com',
        password: 'PasswordSegura123',
        role: 'RECEPCIONISTA'
      });

      vi.spyOn(usersService, 'createUser').mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'El correo ya existe' } }))
      );

      formComponent.onSubmit();

      expect(formComponent.email.errors?.['duplicate']).toBe(true);
      expect(formComponent.submitError()).toContain('ya se encuentra registrado');
      expect(formComponent.isSubmitting()).toBe(false);
    });
  });

  describe('Criterio 7: Las operaciones exitosas muestran confirmación visual y pasan las pruebas unitarias', () => {
    it('muestra confirmación visual tras registrar un nuevo usuario', () => {
      const newUser: User = {
        id: 'usr-new-77',
        fullName: 'Dra. Andrea Morales',
        email: 'andrea.morales@huellasdelvalle.com',
        role: 'VETERINARIO',
        isActive: true,
        createdAt: '2026-02-23'
      };

      listComponent.onUserSaved(newUser);
      listFixture.detectChanges();

      expect(listComponent.feedbackMessage()).toContain('registrado exitosamente');

      const feedbackEl = listFixture.nativeElement.querySelector('[data-testid="feedback-banner"]');
      expect(feedbackEl).toBeTruthy();
      expect(feedbackEl.textContent).toContain('Dra. Andrea Morales');
    });

    it('muestra confirmación visual tras actualizar un usuario existente', () => {
      const updatedUser: User = {
        ...mockUsers[0],
        fullName: 'Dr. Roberto Mendoza Editado'
      };

      listComponent.onUserSaved(updatedUser);
      listFixture.detectChanges();

      expect(listComponent.feedbackMessage()).toContain('actualizada con éxito');

      const feedbackEl = listFixture.nativeElement.querySelector('[data-testid="feedback-banner"]');
      expect(feedbackEl).toBeTruthy();
    });

    it('permite cerrar la notificación visual de feedback', () => {
      listComponent.feedbackMessage.set('Operación completada');
      listFixture.detectChanges();

      listComponent.dismissFeedback();
      listFixture.detectChanges();

      expect(listComponent.feedbackMessage()).toBeNull();
    });
  });
});
