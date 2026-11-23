import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('UserFormDialogComponent', () => {
  let component: UserFormDialogComponent;
  let fixture: ComponentFixture<UserFormDialogComponent>;
  let usersService: UsersService;

  const mockUser: User = {
    id: 'usr-1',
    fullName: 'Dra. Camila Torres',
    email: 'camila.torres@huellasdelvalle.com',
    role: 'VETERINARIO',
    isActive: true,
    phone: '+57 312 444 0202',
    identification: '1098345678',
    createdAt: '2026-01-15T09:30:00.000Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormDialogComponent],
      providers: [
        UsersService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormDialogComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
  });

  it('debe crearse correctamente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.form).toBeDefined();
  });

  it('debe inicializar el formulario como inválido en modo creación cuando está vacío', () => {
    fixture.detectChanges();
    expect(component.isEditMode()).toBe(false);
    expect(component.form.valid).toBe(false);
    expect(component.fullName.errors?.['required']).toBe(true);
    expect(component.email.errors?.['required']).toBe(true);
    expect(component.password.errors?.['required']).toBe(true);
  });

  it('debe validar el formato de correo institucional rechazando correos inválidos', () => {
    fixture.detectChanges();

    component.email.setValue('correoinvalido');
    expect(component.email.valid).toBe(false);

    component.email.setValue('valido@huellasdelvalle.com');
    expect(component.email.valid).toBe(true);
  });

  it('debe validar la seguridad de la contraseña (mínimo 8 caracteres, mayúscula, minúscula y número)', () => {
    fixture.detectChanges();

    // Muy corta
    component.password.setValue('Aa1!');
    expect(component.password.valid).toBe(false);
    expect(component.password.errors?.['securePassword']).toBeTruthy();

    // Sin número
    component.password.setValue('PasswordSinNumero');
    expect(component.password.valid).toBe(false);

    // Sin mayúscula
    component.password.setValue('password12345');
    expect(component.password.valid).toBe(false);

    // Válida y segura
    component.password.setValue('PasswordSegura123');
    expect(component.password.valid).toBe(true);
  });

  it('debe presentar los tres roles (ADMIN, VETERINARIO, RECEPCIONISTA) con sus descripciones y permitir seleccionarlos', () => {
    fixture.detectChanges();
    expect(component.availableRoles.length).toBe(3);

    const roles = component.availableRoles.map((r) => r.role);
    expect(roles).toContain('ADMIN');
    expect(roles).toContain('VETERINARIO');
    expect(roles).toContain('RECEPCIONISTA');

    // Cambiar a ADMIN
    component.selectRole('ADMIN');
    expect(component.role.value).toBe('ADMIN');
    expect(component.getSelectedRoleDescription().title).toBe('Administrador del Sistema');
    expect(component.getSelectedRoleDescription().permissions.length).toBeGreaterThan(0);
  });

  it('en modo edición debe precargar los datos y dejar la contraseña como opcional', () => {
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    expect(component.isEditMode()).toBe(true);
    expect(component.fullName.value).toBe(mockUser.fullName);
    expect(component.email.value).toBe(mockUser.email);
    expect(component.role.value).toBe(mockUser.role);
    expect(component.phone.value).toBe(mockUser.phone);
    expect(component.identification.value).toBe(mockUser.identification);

    // Contraseña vacía es válida en modo edición
    expect(component.password.valid).toBe(true);
  });

  it('debe bloquear el guardado si el correo está duplicado en la lista de correos existentes', () => {
    fixture.componentRef.setInput('existingEmails', ['duplicado@huellasdelvalle.com']);
    fixture.detectChanges();

    component.form.patchValue({
      fullName: 'Empleado Nuevo',
      email: 'duplicado@huellasdelvalle.com',
      password: 'Password123',
      role: 'RECEPCIONISTA'
    });

    const createSpy = vi.spyOn(usersService, 'createUser');
    component.onSubmit();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.email.errors?.['duplicate']).toBe(true);
    expect(component.submitError()).toContain('ya se encuentra registrado');
  });

  it('debe manejar error HTTP 409 de correo duplicado devuelto por la API', () => {
    fixture.detectChanges();

    component.form.patchValue({
      fullName: 'Empleado Nuevo',
      email: 'nuevo@huellasdelvalle.com',
      password: 'Password123',
      role: 'RECEPCIONISTA'
    });

    vi.spyOn(usersService, 'createUser').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Email already exists' } }))
    );

    component.onSubmit();

    expect(component.email.errors?.['duplicate']).toBe(true);
    expect(component.submitError()).toContain('ya se encuentra registrado');
  });

  it('debe llamar a createUser y emitir evento saved ante guardado exitoso en modo creación', () => {
    fixture.detectChanges();

    component.form.patchValue({
      fullName: 'Dr. Nuevo Veterinario',
      email: 'nuevo.vet@huellasdelvalle.com',
      password: 'Password123',
      role: 'VETERINARIO'
    });

    const savedSpy = vi.spyOn(component.saved, 'emit');
    const createdUser: User = {
      id: 'usr-new',
      fullName: 'Dr. Nuevo Veterinario',
      email: 'nuevo.vet@huellasdelvalle.com',
      role: 'VETERINARIO',
      isActive: true,
      createdAt: '2026-02-23T00:00:00.000Z'
    };

    vi.spyOn(usersService, 'createUser').mockReturnValue(of(createdUser));

    component.onSubmit();

    expect(usersService.createUser).toHaveBeenCalled();
    expect(savedSpy).toHaveBeenCalledWith(createdUser);
    expect(component.isSubmitting()).toBe(false);
  });

  it('debe llamar a updateUser y emitir saved ante guardado exitoso en modo edición', () => {
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();

    component.fullName.setValue('Dra. Camila Torres Actualizada');

    const savedSpy = vi.spyOn(component.saved, 'emit');
    const updatedUser: User = {
      ...mockUser,
      fullName: 'Dra. Camila Torres Actualizada'
    };

    vi.spyOn(usersService, 'updateUser').mockReturnValue(of(updatedUser));

    component.onSubmit();

    expect(usersService.updateUser).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
      fullName: 'Dra. Camila Torres Actualizada'
    }));
    expect(savedSpy).toHaveBeenCalledWith(updatedUser);
  });

  it('debe emitir closed al invocar close()', () => {
    fixture.detectChanges();
    const closeSpy = vi.spyOn(component.closed, 'emit');

    component.close();
    expect(closeSpy).toHaveBeenCalled();
  });
});
