import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppointmentFormDialogComponent } from './appointment-form-dialog.component';
import { AppointmentsService } from '../../services/appointments.service';
import { Appointment, TimeSlotAvailability } from '../../models/appointment.model';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('AppointmentFormDialogComponent', () => {
  let component: AppointmentFormDialogComponent;
  let fixture: ComponentFixture<AppointmentFormDialogComponent>;
  let appointmentsService: AppointmentsService;

  const mockAppointment: Appointment = {
    id: 'apt-001',
    petId: 'pet-001',
    veterinarianId: 'vet-001',
    veterinarian: { id: 'vet-001', fullName: 'Dra. Camila Torres' },
    startDateTime: '2026-10-22T09:00:00Z',
    endDateTime: '2026-10-22T09:30:00Z',
    reason: 'Consulta médica general',
    status: 'PENDIENTE'
  };

  const mockSlots: TimeSlotAvailability[] = [
    { time: '08:00', available: true },
    { time: '08:30', available: false }, // Ocupada
    { time: '09:00', available: true }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentFormDialogComponent],
      providers: [
        AppointmentsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    appointmentsService = TestBed.inject(AppointmentsService);
    vi.spyOn(appointmentsService, 'getAvailability').mockReturnValue(of(mockSlots));

    fixture = TestBed.createComponent(AppointmentFormDialogComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse e inicializar el formulario', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.form).toBeDefined();
  });

  it('debe marcar el formulario como inválido si los campos obligatorios están vacíos', () => {
    fixture.detectChanges();
    expect(component.form.valid).toBe(false);
    expect(component.petId.errors?.['required']).toBe(true);
    expect(component.reason.errors?.['required']).toBe(true);
  });

  it('debe validar la longitud mínima del motivo de consulta', () => {
    fixture.detectChanges();

    component.reason.setValue('Hola');
    expect(component.reason.valid).toBe(false);
    expect(component.reason.errors?.['minlength']).toBeTruthy();

    component.reason.setValue('Vacunación y chequeo general');
    expect(component.reason.valid).toBe(true);
  });

  it('debe consultar la disponibilidad horaria al seleccionar profesional y fecha', () => {
    fixture.detectChanges();

    component.checkAvailability('vet-001', '2026-10-22');

    expect(appointmentsService.getAvailability).toHaveBeenCalledWith('vet-001', '2026-10-22');
    expect(component.availableSlots().length).toBe(3);
    expect(component.availableSlots()[1].available).toBe(false); // 08:30 ocupada
  });

  it('debe impedir seleccionar una franja horaria ocupada', () => {
    fixture.detectChanges();
    component.availableSlots.set(mockSlots);

    component.form.patchValue({
      petId: 'pet-001',
      veterinarianId: 'vet-001',
      date: '2026-10-22',
      time: '08:30', // Ocupada
      reason: 'Consulta general'
    });

    component.onSubmit();

    expect(component.time.errors?.['slotUnavailable']).toBe(true);
    expect(component.submitError()).toContain('no está disponible');
  });

  it('debe enviar la petición createAppointment y emitir saved ante guardado exitoso', () => {
    fixture.detectChanges();
    component.availableSlots.set(mockSlots);

    component.form.patchValue({
      petId: 'pet-001',
      veterinarianId: 'vet-001',
      date: '2026-10-22',
      time: '09:00', // Disponible
      reason: 'Consulta médica general'
    });

    const savedSpy = vi.spyOn(component.saved, 'emit');
    vi.spyOn(appointmentsService, 'createAppointment').mockReturnValue(of(mockAppointment));

    component.onSubmit();

    expect(appointmentsService.createAppointment).toHaveBeenCalled();
    expect(savedSpy).toHaveBeenCalledWith(mockAppointment);
    expect(component.isSubmitting()).toBe(false);
  });

  it('ante respuesta HTTP 409 debe mostrar alerta comprensible y CONSERVAR la información ingresada', () => {
    fixture.detectChanges();
    component.availableSlots.set(mockSlots);

    const formData = {
      petId: 'pet-001',
      veterinarianId: 'vet-001',
      date: '2026-10-22',
      time: '09:00',
      reason: 'Consulta médica general'
    };

    component.form.patchValue(formData);

    vi.spyOn(appointmentsService, 'createAppointment').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Slot already booked' } }))
    );

    component.onSubmit();

    // Comprobar que muestra la alerta
    expect(component.submitError()).toContain('Conflicto de horario');
    expect(component.time.errors?.['conflict']).toBe(true);

    // Comprobar que conserva toda la información ingresada
    expect(component.petId.value).toBe(formData.petId);
    expect(component.veterinarianId.value).toBe(formData.veterinarianId);
    expect(component.date.value).toBe(formData.date);
    expect(component.reason.value).toBe(formData.reason);
  });

  it('en modo edición debe llamar a rescheduleAppointment', () => {
    const editFixture = TestBed.createComponent(AppointmentFormDialogComponent);
    editFixture.componentRef.setInput('appointment', mockAppointment);
    editFixture.detectChanges();
    const editComp = editFixture.componentInstance;

    editComp.availableSlots.set(mockSlots);
    editComp.form.patchValue({
      time: '09:00',
      reason: 'Reprogramada por solicitud del cliente'
    });

    const updatedApt = { ...mockAppointment, reason: 'Reprogramada por solicitud del cliente' };
    vi.spyOn(appointmentsService, 'rescheduleAppointment').mockReturnValue(of(updatedApt));
    const savedSpy = vi.spyOn(editComp.saved, 'emit');

    editComp.onSubmit();

    expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith(
      mockAppointment.id,
      expect.objectContaining({ reason: 'Reprogramada por solicitud del cliente' })
    );
    expect(savedSpy).toHaveBeenCalledWith(updatedApt);
  });
});
