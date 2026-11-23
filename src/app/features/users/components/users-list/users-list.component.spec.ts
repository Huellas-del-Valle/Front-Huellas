import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UsersListComponent } from './users-list.component';
import { UsersService } from '../../services/users.service';
import { SessionService } from '../../../../core/services/session.service';
import { INITIAL_MOCK_USERS, User } from '../../models/user.model';
import { of } from 'rxjs';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;
  let usersService: UsersService;
  let sessionService: SessionService;

  const mockUsersList: User[] = [
    {
      id: 'usr-1',
      fullName: 'Dr. Roberto Mendoza',
      email: 'admin@huellasdelvalle.com',
      role: 'ADMIN',
      isActive: true,
      identification: '1098234567',
      createdAt: '2026-01-10T08:00:00.000Z'
    },
    {
      id: 'usr-2',
      fullName: 'Dra. Camila Torres',
      email: 'camila.torres@huellasdelvalle.com',
      role: 'VETERINARIO',
      isActive: true,
      identification: '1098345678',
      createdAt: '2026-01-15T09:30:00.000Z'
    },
    {
      id: 'usr-3',
      fullName: 'Sandra Morales',
      email: 'sandra.morales@huellasdelvalle.com',
      role: 'RECEPCIONISTA',
      isActive: false,
      identification: '1098456789',
      createdAt: '2026-02-01T10:00:00.000Z'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        UsersService,
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    usersService = TestBed.inject(UsersService);
    sessionService = TestBed.inject(SessionService);

    // Simular sesión ADMIN por defecto
    sessionService.setMockSession('ADMIN', 'Admin de Prueba');

    vi.spyOn(usersService, 'getUsers').mockReturnValue(of(mockUsersList));

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionService.clearSession();
  });

  it('debe crearse correctamente y cargar la lista de usuarios', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.users().length).toBe(3);
    expect(component.isLoading()).toBe(false);
  });

  it('debe restringir el acceso y mostrar error si el usuario no tiene rol ADMIN', () => {
    sessionService.setMockSession('VETERINARIO', 'Dra. No Admin');
    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.isAdmin()).toBe(false);
    expect(component.errorMessage()).toContain('Acceso denegado');
  });

  it('debe filtrar usuarios por nombre, correo y cédula', () => {
    fixture.detectChanges();

    // Filtro por nombre
    component.setSearchTerm('Camila');
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].fullName).toBe('Dra. Camila Torres');

    // Filtro por correo
    component.setSearchTerm('admin@');
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].email).toBe('admin@huellasdelvalle.com');

    // Filtro por cédula
    component.setSearchTerm('1098456789');
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].fullName).toBe('Sandra Morales');

    // Filtro vacío
    component.setSearchTerm('');
    expect(component.filteredUsers().length).toBe(3);
  });

  it('debe filtrar usuarios por rol (ADMIN, VETERINARIO, RECEPCIONISTA)', () => {
    fixture.detectChanges();

    component.setRoleFilter('VETERINARIO');
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].role).toBe('VETERINARIO');

    component.setRoleFilter('RECEPCIONISTA');
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].role).toBe('RECEPCIONISTA');

    component.setRoleFilter('ALL');
    expect(component.filteredUsers().length).toBe(3);
  });

  it('debe filtrar usuarios por estado (ACTIVE, INACTIVE)', () => {
    fixture.detectChanges();

    component.setStatusFilter('ACTIVE');
    expect(component.filteredUsers().length).toBe(2);

    component.setStatusFilter('INACTIVE');
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].isActive).toBe(false);

    component.setStatusFilter('ALL');
    expect(component.filteredUsers().length).toBe(3);
  });

  it('debe paginar la lista de usuarios correctamente', () => {
    fixture.detectChanges();
    component.setPageSize(2);

    expect(component.pageSize()).toBe(2);
    expect(component.totalPages()).toBe(2);
    expect(component.currentPage()).toBe(1);
    expect(component.paginatedUsers().length).toBe(2);

    // Ir a la siguiente página
    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(component.paginatedUsers().length).toBe(1);

    // Regresar
    component.prevPage();
    expect(component.currentPage()).toBe(1);
  });

  it('debe abrir y cerrar el modal de formulario en modo creación y edición', () => {
    fixture.detectChanges();

    // Crear
    component.openCreateUser();
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.selectedUserForEdit()).toBeNull();

    component.closeFormModal();
    expect(component.isFormModalOpen()).toBe(false);

    // Editar
    component.openEditUser(mockUsersList[1]);
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.selectedUserForEdit()?.id).toBe('usr-2');
  });

  it('debe actualizar la lista y mostrar confirmación visual al guardar un usuario', () => {
    fixture.detectChanges();

    const newUser: User = {
      id: 'usr-new-99',
      fullName: 'Nuevo Empleado Test',
      email: 'nuevo.test@huellasdelvalle.com',
      role: 'RECEPCIONISTA',
      isActive: true,
      createdAt: '2026-02-23T00:00:00.000Z'
    };

    component.onUserSaved(newUser);

    expect(component.users().length).toBe(4);
    expect(component.feedbackMessage()).toContain('registrado exitosamente');
    expect(component.isFormModalOpen()).toBe(false);
  });

  it('requiere confirmación explícita para activar o inactivar una cuenta', () => {
    fixture.detectChanges();

    const targetUser = mockUsersList[0]; // Usuario activo
    expect(component.userToToggleStatus()).toBeNull();

    // Solicitar cambio de estado
    component.promptToggleStatus(targetUser);
    expect(component.userToToggleStatus()).toEqual(targetUser);

    // Cancelar
    component.cancelToggleStatus();
    expect(component.userToToggleStatus()).toBeNull();

    // Confirmar
    component.promptToggleStatus(targetUser);
    const updatedUser: User = { ...targetUser, isActive: false };
    const statusSpy = vi.spyOn(usersService, 'updateUserStatus').mockReturnValue(of(updatedUser));

    component.confirmToggleStatus();

    expect(statusSpy).toHaveBeenCalledWith(targetUser.id, false);
    expect(component.userToToggleStatus()).toBeNull();
    expect(component.feedbackMessage()).toContain('inactivada');
  });
});
