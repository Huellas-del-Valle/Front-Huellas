import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AppointmentCalendarComponent } from '../features/appointments/components/appointment-calendar/appointment-calendar.component';
import { AppointmentFormDialogComponent } from '../features/appointments/components/appointment-form-dialog/appointment-form-dialog.component';
import { AppointmentsService } from '../features/appointments/services/appointments.service';
import { SessionService } from '../core/services/session.service';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import {
  Appointment,
  AppointmentStatus,
  APPOINTMENT_STATUS_CONFIG,
  CreateAppointmentDto,
  INITIAL_MOCK_APPOINTMENTS,
  TimeSlotAvailability
} from '../features/appointments/models/appointment.model';
import { routes } from '../app.routes';

describe('Módulo de Agenda y Calendario de Citas (Appointments Module Integration)', () => {
  let calendarFixture: ComponentFixture<AppointmentCalendarComponent>;
  let calendarComponent: AppointmentCalendarComponent;
  let formFixture: ComponentFixture<AppointmentFormDialogComponent>;
  let formComponent: AppointmentFormDialogComponent;

  let appointmentsService: AppointmentsService;
  let sessionService: SessionService;
  let httpMock: HttpTestingController;

  const mockAppointments: Appointment[] = [...INITIAL_MOCK_APPOINTMENTS];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentCalendarComponent, AppointmentFormDialogComponent],
      providers: [
        AppointmentsService,
        SessionService,
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes)
      ]
    }).compileComponents();

    appointmentsService = TestBed.inject(AppointmentsService);
    sessionService = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);

    // Iniciar con rol autorizado (RECEPCIONISTA / VETERINARIO / ADMIN)
    sessionService.setMockSession('RECEPCIONISTA', 'Sandra Morales');

    calendarFixture = TestBed.createComponent(AppointmentCalendarComponent);
    calendarComponent = calendarFixture.componentInstance;
    calendarFixture.detectChanges();

    // Drenar peticiones iniciales disparadas por ngOnInit
    const initReq = httpMock.match(`${environment.apiUrl}/appointments`);
    initReq.forEach((r) => r.flush(mockAppointments));

    formFixture = TestBed.createComponent(AppointmentFormDialogComponent);
    formComponent = formFixture.componentInstance;
    formFixture.detectChanges();

    const availReq = httpMock.match((r) => r.url.includes('/appointments/availability'));
    availReq.forEach((r) => r.flush([]));
  });

  afterEach(() => {
    sessionService.clearSession();
    vi.restoreAllMocks();
  });

  describe('Criterio 1: El calendario ofrece vistas diaria, semanal y mensual, con filtros por veterinario asignado', () => {
    it('debe inicializar en vista MENSUAL con la cuadrícula de días calculada', () => {
      expect(calendarComponent.viewMode()).toBe('MONTH');
      const monthDays = calendarComponent.monthGridDays();
      expect(monthDays.length).toBeGreaterThanOrEqual(28);
      expect(monthDays.some((d) => d.isCurrentMonth)).toBe(true);
    });

    it('debe cambiar a vista SEMANAL y contener 7 días', () => {
      calendarComponent.setViewMode('WEEK');
      expect(calendarComponent.viewMode()).toBe('WEEK');
      const weekDays = calendarComponent.weekDays();
      expect(weekDays.length).toBe(7);
    });

    it('debe cambiar a vista DIARIA y calcular las citas para el día seleccionado', () => {
      calendarComponent.setViewMode('DAY');
      expect(calendarComponent.viewMode()).toBe('DAY');
      expect(calendarComponent.dayAppointments()).toBeDefined();
    });

    it('debe filtrar las citas por veterinario asignado', () => {
      // Filtrar por Dr. Carlos Mendoza (vet-001)
      calendarComponent.setVeterinarianFilter('vet-001');
      expect(calendarComponent.selectedVeterinarianFilter()).toBe('vet-001');

      const filtered = calendarComponent.filteredAppointments();
      expect(filtered.every((a) => a.veterinarianId === 'vet-001')).toBe(true);

      // Reestablecer a TODOS
      calendarComponent.setVeterinarianFilter('ALL');
      expect(calendarComponent.filteredAppointments().length).toBeGreaterThanOrEqual(filtered.length);
    });
  });

  describe('Criterio 2: El modal permite seleccionar paciente, veterinario, fecha, hora y motivo con validación de obligatorios', () => {
    it('debe marcar el formulario como inválido cuando los campos obligatorios están vacíos', () => {
      formComponent.appointmentForm.reset();
      expect(formComponent.appointmentForm.valid).toBe(false);
      expect(formComponent.appointmentForm.get('petId')?.hasError('required')).toBe(true);
      expect(formComponent.appointmentForm.get('veterinarianId')?.hasError('required')).toBe(true);
      expect(formComponent.appointmentForm.get('date')?.hasError('required')).toBe(true);
      expect(formComponent.appointmentForm.get('timeSlot')?.hasError('required')).toBe(true);
      expect(formComponent.appointmentForm.get('reason')?.hasError('required')).toBe(true);
    });

    it('debe validar que el motivo de consulta tenga al menos 5 caracteres', () => {
      formComponent.appointmentForm.patchValue({ reason: 'Dol' });
      expect(formComponent.appointmentForm.get('reason')?.hasError('minlength')).toBe(true);

      formComponent.appointmentForm.patchValue({ reason: 'Dolor en pata delantera izquierda' });
      expect(formComponent.appointmentForm.get('reason')?.hasError('minlength')).toBe(false);
    });

    it('debe ser válido cuando todos los campos obligatorios son correctos', () => {
      formComponent.appointmentForm.patchValue({
        petId: 'pet-001',
        veterinarianId: 'vet-001',
        date: '2026-10-25',
        timeSlot: '09:00 - 10:00',
        reason: 'Vacunación y chequeo general preventivo'
      });
      expect(formComponent.appointmentForm.valid).toBe(true);
    });
  });

  describe('Criterio 3: La disponibilidad se consulta al seleccionar profesional y fecha; las franjas ocupadas quedan deshabilitadas', () => {
    it('debe consultar la disponibilidad del veterinario al cambiar profesional y fecha', () => {
      const availabilitySpy = vi.spyOn(appointmentsService, 'getAvailability').mockReturnValue(
        of([
          { time: '08:00', timeSlot: '08:00 - 09:00', available: true, isAvailable: true },
          { time: '09:00', timeSlot: '09:00 - 10:00', available: false, isAvailable: false, appointmentId: 'apt-001', petName: 'Max' },
          { time: '10:00', timeSlot: '10:00 - 11:00', available: true, isAvailable: true }
        ])
      );

      formComponent.checkAvailability('vet-001', '2026-10-22');

      expect(availabilitySpy).toHaveBeenCalledWith('vet-001', '2026-10-22');
      expect(formComponent.availabilitySlots().length).toBe(3);
    });

    it('debe identificar que la franja de las 09:00 está ocupada y no permitir seleccionarla', () => {
      formComponent.availabilitySlots.set([
        { time: '08:00', timeSlot: '08:00 - 09:00', available: true, isAvailable: true },
        { time: '09:00', timeSlot: '09:00 - 10:00', available: false, isAvailable: false, appointmentId: 'apt-001', petName: 'Max' }
      ]);

      expect(formComponent.isSlotAvailable('09:00 - 10:00')).toBe(false);
      expect(formComponent.isSlotAvailable('08:00 - 09:00')).toBe(true);

      // Intentar seleccionar la franja ocupada no debe cambiar el valor
      formComponent.selectTimeSlot('09:00 - 10:00');
      expect(formComponent.appointmentForm.get('timeSlot')?.value).not.toBe('09:00 - 10:00');

      // Seleccionar franja disponible sí cambia el valor
      formComponent.selectTimeSlot('08:00 - 09:00');
      expect(formComponent.appointmentForm.get('timeSlot')?.value).toBe('08:00 - 09:00');
    });
  });

  describe('Criterio 4: Los estados se distinguen por color: pendiente (amarillo), confirmada (azul), atendida (verde), cancelada (rojo) y no asistida (gris)', () => {
    it('debe mapear cada estado a su color institucional correspondiente', () => {
      // Pendiente -> amarillo
      expect(APPOINTMENT_STATUS_CONFIG.PENDIENTE.badgeClass).toContain('amber');
      expect(APPOINTMENT_STATUS_CONFIG.PENDIENTE.label).toBe('Pendiente');

      // Confirmada -> azul
      expect(APPOINTMENT_STATUS_CONFIG.CONFIRMADA.badgeClass).toContain('sky');
      expect(APPOINTMENT_STATUS_CONFIG.CONFIRMADA.label).toBe('Confirmada');

      // Atendida -> verde
      expect(APPOINTMENT_STATUS_CONFIG.ATENDIDA.badgeClass).toContain('emerald');
      expect(APPOINTMENT_STATUS_CONFIG.ATENDIDA.label).toBe('Atendida');

      // Cancelada -> rojo
      expect(APPOINTMENT_STATUS_CONFIG.CANCELADA.badgeClass).toContain('rose');
      expect(APPOINTMENT_STATUS_CONFIG.CANCELADA.label).toBe('Cancelada');

      // No asistida -> gris
      expect(APPOINTMENT_STATUS_CONFIG.NO_ASISTIDA.badgeClass).toContain('slate');
      expect(APPOINTMENT_STATUS_CONFIG.NO_ASISTIDA.label).toBe('No Asistida');
    });

    it('debe renderizar la leyenda con los 5 estados en la vista', () => {
      const compiled = calendarFixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="legend-pendiente"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="legend-confirmada"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="legend-atendida"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="legend-cancelada"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="legend-no-asistida"]')).toBeTruthy();
    });
  });

  describe('Criterio 5: El menú contextual permite reprogramar y cambiar el estado de la cita', () => {
    it('debe abrir el menú contextual al hacer clic en una cita', () => {
      const apt = mockAppointments[0];
      const dummyEvent = new MouseEvent('click');
      calendarComponent.toggleContextMenu(apt, dummyEvent);

      expect(calendarComponent.activeContextMenuAppointment()).toEqual(apt);
    });

    it('debe permitir cambiar el estado de la cita a CONFIRMADA, ATENDIDA, CANCELADA o NO_ASISTIDA', () => {
      calendarComponent.appointments.set([...mockAppointments]);
      const apt = mockAppointments[0];
      const updateSpy = vi.spyOn(appointmentsService, 'updateAppointmentStatus').mockReturnValue(
        of({ ...apt, status: 'ATENDIDA' })
      );

      calendarComponent.updateStatus(apt, 'ATENDIDA');
      expect(updateSpy).toHaveBeenCalledWith(apt.id, 'ATENDIDA');

      const updated = calendarComponent.appointments().find((a) => a.id === apt.id);
      expect(updated?.status).toBe('ATENDIDA');
      expect(calendarComponent.feedbackMessage()).toContain('Atendida');
    });

    it('debe permitir abrir el modal para reprogramar la cita conservando sus datos', () => {
      const apt = mockAppointments[0];
      calendarComponent.openRescheduleModal(apt);

      expect(calendarComponent.isFormModalOpen()).toBe(true);
      expect(calendarComponent.selectedAppointmentForEdit()).toEqual(apt);
    });
  });

  describe('Criterio 6: Una respuesta HTTP 409 muestra una alerta comprensible y conserva la información ingresada', () => {
    it('debe mostrar alerta visual y conservar los datos del formulario al recibir HTTP 409', () => {
      const conflictError = new HttpErrorResponse({
        error: { message: 'El horario seleccionado ya no se encuentra disponible.' },
        status: 409,
        statusText: 'Conflict'
      });

      vi.spyOn(appointmentsService, 'createAppointment').mockReturnValue(throwError(() => conflictError));

      formComponent.appointmentForm.patchValue({
        petId: 'pet-001',
        veterinarianId: 'vet-001',
        date: '2026-10-22',
        timeSlot: '09:00 - 10:00',
        reason: 'Revisión por vómito continuo'
      });

      formComponent.onSubmit();

      // Alerta visible comprensible
      expect(formComponent.conflictAlert()).toBeTruthy();
      expect(formComponent.conflictAlert()?.toLowerCase()).toContain('conflicto de horario');

      // Conserva la información ingresada
      expect(formComponent.appointmentForm.get('petId')?.value).toBe('pet-001');
      expect(formComponent.appointmentForm.get('veterinarianId')?.value).toBe('vet-001');
      expect(formComponent.appointmentForm.get('date')?.value).toBe('2026-10-22');
      expect(formComponent.appointmentForm.get('reason')?.value).toBe('Revisión por vómito continuo');
      expect(formComponent.isSubmitting()).toBe(false);
    });
  });

  describe('Criterio 7: AppointmentsService integra las rutas de agenda, disponibilidad, creación y actualización de estado; renderizar/cambiar vista tarda menos de 1 segundo', () => {
    it('AppointmentsService integra GET /api/v1/appointments', () => {
      const url = `${environment.apiUrl}/appointments`;
      appointmentsService.getAppointments().subscribe((res) => {
        expect(res).toBeDefined();
      });

      const req = httpMock.expectOne((r) => r.url === url && r.method === 'GET');
      expect(req.request.method).toBe('GET');
      req.flush(mockAppointments);
    });

    it('AppointmentsService integra GET /api/v1/appointments/availability', () => {
      const url = `${environment.apiUrl}/appointments/availability?veterinarianId=vet-001&date=2026-10-22`;
      appointmentsService.getVeterinarianAvailability('vet-001', '2026-10-22').subscribe((res: TimeSlotAvailability[]) => {
        expect(res.length).toBeGreaterThan(0);
      });

      const req = httpMock.expectOne((r) => r.urlWithParams === url && r.method === 'GET');
      expect(req.request.method).toBe('GET');
      req.flush([{ time: '08:00', available: true }]);
    });

    it('AppointmentsService integra POST /api/v1/appointments', () => {
      const newDto: CreateAppointmentDto = {
        petId: 'pet-001',
        veterinarianId: 'vet-001',
        startDateTime: '2026-10-22T11:00:00Z',
        endDateTime: '2026-10-22T12:00:00Z',
        date: '2026-10-22',
        timeSlot: '11:00 - 12:00',
        reason: 'Control posoperatorio'
      };

      appointmentsService.createAppointment(newDto).subscribe((res: Appointment) => {
        expect(res.id).toBeDefined();
      });

      const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/appointments` && r.method === 'POST');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newDto);
      req.flush({ ...mockAppointments[0], ...newDto, id: 'apt-created-1' });
    });

    it('AppointmentsService integra PATCH /api/v1/appointments/:id/status', () => {
      appointmentsService.updateAppointmentStatus('apt-001', 'CONFIRMADA').subscribe((res: Appointment) => {
        expect(res.status).toBe('CONFIRMADA');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/appointments/apt-001/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'CONFIRMADA' });
      req.flush({ ...mockAppointments[0], status: 'CONFIRMADA' });
    });

    it('AppointmentsService integra PUT /api/v1/appointments/:id', () => {
      appointmentsService.updateAppointment('apt-001', { timeSlot: '14:00 - 15:00' }).subscribe((res: Appointment) => {
        expect(res.timeSlot).toBe('14:00 - 15:00');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/appointments/apt-001`);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...mockAppointments[0], timeSlot: '14:00 - 15:00' });
    });

    it('el cambio de vista debe completarse en menos de 1 segundo (RNF-09)', () => {
      const startTime = performance.now();

      calendarComponent.setViewMode('WEEK');
      calendarFixture.detectChanges();

      calendarComponent.setViewMode('DAY');
      calendarFixture.detectChanges();

      calendarComponent.setViewMode('MONTH');
      calendarFixture.detectChanges();

      const durationMs = performance.now() - startTime;
      expect(durationMs).toBeLessThan(1000);
    });
  });

  describe('Criterio 8: Pasan las pruebas del formulario y del mapeo de estados', () => {
    it('debe emitir saved y cerrar el modal al crear o reprogramar una cita con éxito', () => {
      const savedSpy = vi.spyOn(formComponent.saved, 'emit');
      vi.spyOn(appointmentsService, 'createAppointment').mockReturnValue(
        of(mockAppointments[0])
      );

      formComponent.appointmentForm.patchValue({
        petId: 'pet-001',
        veterinarianId: 'vet-001',
        date: '2026-10-22',
        timeSlot: '08:00 - 09:00',
        reason: 'Consulta médica general'
      });

      formComponent.onSubmit();
      expect(savedSpy).toHaveBeenCalledWith(mockAppointments[0]);
    });

    it('debe emitir cancelled al presionar cancelar en el formulario', () => {
      const cancelSpy = vi.spyOn(formComponent.cancelled, 'emit');
      formComponent.onCancel();
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('debe permitir acceso al módulo a los roles ADMIN, VETERINARIO y RECEPCIONISTA', () => {
      // RECEPCIONISTA
      sessionService.setMockSession('RECEPCIONISTA', 'Sandra');
      expect(sessionService.hasRole(['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'])).toBe(true);

      // VETERINARIO
      sessionService.setMockSession('VETERINARIO', 'Dr. Carlos');
      expect(sessionService.hasRole(['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'])).toBe(true);

      // ADMIN
      sessionService.setMockSession('ADMIN', 'Administrador');
      expect(sessionService.hasRole(['ADMIN', 'VETERINARIO', 'RECEPCIONISTA'])).toBe(true);
    });
  });
});
