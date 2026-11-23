import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AppointmentCalendarComponent } from './appointment-calendar.component';
import { AppointmentsService } from '../../services/appointments.service';
import {
  Appointment,
  INITIAL_MOCK_APPOINTMENTS
} from '../../models/appointment.model';

describe('AppointmentCalendarComponent', () => {
  let component: AppointmentCalendarComponent;
  let fixture: ComponentFixture<AppointmentCalendarComponent>;
  let mockAppointmentsService: {
    getAppointments: ReturnType<typeof vi.fn>;
    updateAppointmentStatus: ReturnType<typeof vi.fn>;
  };

  const sampleAppointments: Appointment[] = [...INITIAL_MOCK_APPOINTMENTS];

  beforeEach(async () => {
    mockAppointmentsService = {
      getAppointments: vi.fn().mockReturnValue(of(sampleAppointments)),
      updateAppointmentStatus: vi.fn().mockImplementation((id, status) => {
        const found = sampleAppointments.find((a) => a.id === id);
        return of({ ...(found || sampleAppointments[0]), status });
      })
    };

    await TestBed.configureTestingModule({
      imports: [AppointmentCalendarComponent],
      providers: [
        { provide: AppointmentsService, useValue: mockAppointmentsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el listado de citas', () => {
    expect(component).toBeTruthy();
    expect(mockAppointmentsService.getAppointments).toHaveBeenCalled();
    expect(component.appointments().length).toBeGreaterThan(0);
    expect(component.viewMode()).toBe('MONTH');
  });

  it('debe permitir cambiar entre vistas mensual, semanal y diaria', () => {
    // Vista por defecto: Mes
    expect(component.viewMode()).toBe('MONTH');
    expect(component.monthGridDays().length).toBeGreaterThan(0);

    // Cambiar a Semana
    component.setViewMode('WEEK');
    expect(component.viewMode()).toBe('WEEK');
    expect(component.weekDays().length).toBe(7);

    // Cambiar a Día
    component.setViewMode('DAY');
    expect(component.viewMode()).toBe('DAY');
    expect(component.dayAppointments()).toBeDefined();
  });

  it('debe permitir filtrar citas por veterinario asignado', () => {
    // Todos
    expect(component.selectedVeterinarianFilter()).toBe('ALL');
    const totalCount = component.filteredAppointments().length;

    // Filtrar por Dr. Carlos Mendoza (vet-001)
    component.setVeterinarianFilter('vet-001');
    expect(component.selectedVeterinarianFilter()).toBe('vet-001');

    const vet1Appointments = component.filteredAppointments();
    expect(vet1Appointments.every((a) => a.veterinarianId === 'vet-001')).toBe(true);
    expect(vet1Appointments.length).toBeLessThanOrEqual(totalCount);
  });

  it('debe navegar hacia el mes/semana anterior, siguiente y regresar a hoy', () => {
    const initialDate = new Date(component.selectedDate());

    // Siguiente mes
    component.goToNext();
    expect(component.selectedDate().getUTCMonth()).toBe((initialDate.getUTCMonth() + 1) % 12);

    // Mes anterior
    component.goToPrevious();
    expect(component.selectedDate().getUTCMonth()).toBe(initialDate.getUTCMonth());

    // Regresar a hoy
    component.goToToday();
    expect(component.selectedDate()).toBeDefined();
  });

  it('debe abrir y cerrar el modal para agendar una nueva cita', () => {
    expect(component.isFormModalOpen()).toBe(false);

    component.openCreateModal('2026-10-25');
    expect(component.isFormModalOpen()).toBe(true);
    expect(component.preselectedDateForNew()).toBe('2026-10-25');
    expect(component.selectedAppointmentForEdit()).toBeNull();

    component.closeFormModal();
    expect(component.isFormModalOpen()).toBe(false);
  });

  it('debe abrir el modal en modo reprogramación para una cita existente', () => {
    const apt = sampleAppointments[0];
    component.openRescheduleModal(apt);

    expect(component.isFormModalOpen()).toBe(true);
    expect(component.selectedAppointmentForEdit()).toEqual(apt);
  });

  it('debe permitir cambiar el estado de la cita desde el menú contextual y mostrar feedback visual', () => {
    const apt = sampleAppointments[0];
    component.updateStatus(apt, 'CONFIRMADA');

    expect(mockAppointmentsService.updateAppointmentStatus).toHaveBeenCalledWith(apt.id, 'CONFIRMADA');
    const updated = component.appointments().find((a) => a.id === apt.id);
    expect(updated?.status).toBe('CONFIRMADA');
    expect(component.feedbackMessage()).toContain('Confirmada');
  });

  it('debe manejar fallback de actualización local si el endpoint de estado falla', () => {
    mockAppointmentsService.updateAppointmentStatus.mockReturnValueOnce(
      throwError(() => new Error('Network error'))
    );

    const apt = sampleAppointments[1];
    component.updateStatus(apt, 'CANCELADA');

    const updated = component.appointments().find((a) => a.id === apt.id);
    expect(updated?.status).toBe('CANCELADA');
    expect(component.feedbackMessage()).toContain('Cancelada');
  });

  it('debe agregar una nueva cita a la lista al guardarse', () => {
    const newApt: Appointment = {
      id: 'apt-new-test',
      petId: 'pet-001',
      petName: 'Rocky Balboa',
      ownerName: 'Juan Pérez',
      veterinarianId: 'vet-001',
      veterinarian: { id: 'vet-001', fullName: 'Dr. Carlos Mendoza' },
      veterinarianName: 'Dr. Carlos Mendoza',
      startDateTime: '2026-10-23T11:00:00Z',
      endDateTime: '2026-10-23T12:00:00Z',
      date: '2026-10-23',
      timeSlot: '11:00 - 12:00',
      reason: 'Consulta general de rutina',
      status: 'PENDIENTE',
      createdAt: '2026-10-22T08:00:00Z',
      updatedAt: '2026-10-22T08:00:00Z'
    };

    component.onAppointmentSaved(newApt);
    expect(component.appointments()[0].id).toBe('apt-new-test');
    expect(component.feedbackMessage()).toContain('exitosa');
  });
});
