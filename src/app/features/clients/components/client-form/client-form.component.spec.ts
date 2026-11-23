import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientFormComponent } from './client-form.component';
import { ClientsService } from '../../services/clients.service';
import { Client } from '../../models/client.model';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('ClientFormComponent', () => {
  let component: ClientFormComponent;
  let fixture: ComponentFixture<ClientFormComponent>;
  let clientsService: ClientsService;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientFormComponent],
      providers: [
        ClientsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientFormComponent);
    component = fixture.componentInstance;
    clientsService = TestBed.inject(ClientsService);
  });

  it('debe crearse correctamente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.form).toBeDefined();
  });

  it('debe inicializar el formulario como inválido cuando los campos están vacíos', () => {
    fixture.detectChanges();
    expect(component.form.valid).toBe(false);
    expect(component.identification.errors?.['required']).toBe(true);
    expect(component.fullName.errors?.['required']).toBe(true);
    expect(component.phone.errors?.['required']).toBe(true);
    expect(component.email.errors?.['required']).toBe(true);
    expect(component.address.errors?.['required']).toBe(true);
    expect(component.dataProcessingAuthorized.errors?.['required']).toBe(true);
  });

  it('debe validar la longitud y formato de la cédula / documento', () => {
    fixture.detectChanges();

    component.identification.setValue('123'); // Corto
    expect(component.identification.valid).toBe(false);

    component.identification.setValue('1088000111'); // Válido
    expect(component.identification.valid).toBe(true);
  });

  it('debe validar el formato del número telefónico', () => {
    fixture.detectChanges();

    component.phone.setValue('12'); // Inválido
    expect(component.phone.valid).toBe(false);

    component.phone.setValue('3001234567'); // Válido
    expect(component.phone.valid).toBe(true);
  });

  it('debe validar el formato del correo electrónico', () => {
    fixture.detectChanges();

    component.email.setValue('correoinvalido');
    expect(component.email.valid).toBe(false);

    component.email.setValue('valido@huellasdelvalle.com');
    expect(component.email.valid).toBe(true);
  });

  it('debe exigir obligatoriamente la autorización de tratamiento de datos personales (Habeas Data)', () => {
    fixture.detectChanges();

    component.form.patchValue({
      identification: '1088000111',
      fullName: 'Carlos Gómez',
      phone: '3001234567',
      email: 'carlos.gomez@gmail.com',
      address: 'Calle 15 # 24-30',
      dataProcessingAuthorized: false // Sin autorización
    });

    expect(component.form.valid).toBe(false);
    expect(component.dataProcessingAuthorized.valid).toBe(false);

    // Con autorización marcada
    component.dataProcessingAuthorized.setValue(true);
    expect(component.dataProcessingAuthorized.valid).toBe(true);
    expect(component.form.valid).toBe(true);
  });

  it('debe bloquear el guardado si el documento ya se encuentra registrado (duplicado en cliente)', () => {
    fixture.componentRef.setInput('existingIdentifications', ['1088000111']);
    fixture.detectChanges();

    component.form.patchValue({
      identification: '1088000111',
      fullName: 'Otro Propietario',
      phone: '3001234567',
      email: 'otro@gmail.com',
      address: 'Carrera 10 # 20-30',
      dataProcessingAuthorized: true
    });

    const createSpy = vi.spyOn(clientsService, 'createClient');
    component.onSubmit();

    expect(createSpy).not.toHaveBeenCalled();
    expect(component.identification.errors?.['duplicate']).toBe(true);
    expect(component.submitError()).toContain('ya se encuentra registrado');
  });

  it('debe manejar error HTTP 409 de documento duplicado devuelto por la API', () => {
    fixture.detectChanges();

    component.form.patchValue({
      identification: '1088000999',
      fullName: 'Nuevo Propietario',
      phone: '3001234567',
      email: 'nuevo@gmail.com',
      address: 'Calle 15 # 24-30',
      dataProcessingAuthorized: true
    });

    vi.spyOn(clientsService, 'createClient').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Document already exists' } }))
    );

    component.onSubmit();

    expect(component.identification.errors?.['duplicate']).toBe(true);
    expect(component.submitError()).toContain('ya se encuentra registrado');
  });

  it('debe llamar a createClient y emitir saved ante guardado exitoso en modo creación', () => {
    fixture.detectChanges();

    const newClientPayload = {
      identification: '1088000222',
      fullName: 'Ana María Morales',
      phone: '3157654321',
      email: 'ana.morales@gmail.com',
      address: 'Carrera 5 # 12-40',
      dataProcessingAuthorized: true
    };

    component.form.patchValue(newClientPayload);

    const savedSpy = vi.spyOn(component.saved, 'emit');
    const createdClient: Client = {
      ...newClientPayload,
      id: 'cli-new-001',
      createdAt: '2026-02-23'
    };

    vi.spyOn(clientsService, 'createClient').mockReturnValue(of(createdClient));

    component.onSubmit();

    expect(clientsService.createClient).toHaveBeenCalledWith(newClientPayload);
    expect(savedSpy).toHaveBeenCalledWith(createdClient);
  });

  it('en modo edición debe precargar los datos y llamar a updateClient al guardar', () => {
    const editFixture = TestBed.createComponent(ClientFormComponent);
    editFixture.componentRef.setInput('client', mockClient);
    editFixture.detectChanges();
    const editComponent = editFixture.componentInstance;

    expect(editComponent.isEditMode()).toBe(true);
    expect(editComponent.fullName.value).toBe(mockClient.fullName);
    expect(editComponent.identification.value).toBe(mockClient.identification);

    editComponent.phone.setValue('3109998877');

    const updatedClient: Client = { ...mockClient, phone: '3109998877' };
    vi.spyOn(clientsService, 'updateClient').mockReturnValue(of(updatedClient));
    const savedSpy = vi.spyOn(editComponent.saved, 'emit');

    editComponent.onSubmit();

    expect(clientsService.updateClient).toHaveBeenCalledWith(
      mockClient.id,
      expect.objectContaining({ phone: '3109998877' })
    );
    expect(savedSpy).toHaveBeenCalledWith(updatedClient);
  });
});
