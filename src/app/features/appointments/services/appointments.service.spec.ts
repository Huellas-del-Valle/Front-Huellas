import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppointmentsService } from './appointments.service';
import { environment } from '../../../../environments/environment';
import {
  Appointment,
  CreateAppointmentDto,
  TimeSlotAvailability,
  UpdateAppointmentDto
} from '../models/appointment.model';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/appointments`;

  const mockAppointment: Appointment = {
    id: 'apt-001',
    petId: 'pet-001',
    veterinarianId: 'vet-001',
    veterinarian: { id: 'vet-001', fullName: 'Dra. Camila Torres' },
    startDateTime: '2026-10-22T09:00:00Z',
    endDateTime: '2026-10-22T09:30:00Z',
    reason: 'Consulta general',
    status: 'PENDIENTE'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppointmentsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AppointmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('GET /api/v1/appointments debe enviar parámetros de rango de fecha y profesional', () => {
    service
      .getAppointments('2026-10-01', '2026-10-31', 'vet-001')
      .subscribe((data) => {
        expect(data.length).toBe(1);
        expect(data[0]).toEqual(mockAppointment);
      });

    const req = httpMock.expectOne(
      `${baseUrl}?startDate=2026-10-01&endDate=2026-10-31&veterinarianId=vet-001`
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockAppointment]);
  });

  it('GET /api/v1/appointments/availability debe consultar franjas de disponibilidad', () => {
    const mockAvailability: TimeSlotAvailability[] = [
      { time: '09:00', available: true },
      { time: '09:30', available: false }
    ];

    service.getAvailability('vet-001', '2026-10-22').subscribe((slots) => {
      expect(slots.length).toBe(2);
      expect(slots[0].available).toBe(true);
      expect(slots[1].available).toBe(false);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/availability?veterinarianId=vet-001&date=2026-10-22`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockAvailability);
  });

  it('POST /api/v1/appointments debe enviar el payload para agendar una cita', () => {
    const createDto: CreateAppointmentDto = {
      petId: 'pet-001',
      veterinarianId: 'vet-001',
      startDateTime: '2026-10-22T09:00:00Z',
      endDateTime: '2026-10-22T09:30:00Z',
      reason: 'Consulta médica general'
    };

    service.createAppointment(createDto).subscribe((created) => {
      expect(created.id).toBe('apt-001');
      expect(created.status).toBe('PENDIENTE');
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createDto);
    req.flush(mockAppointment);
  });

  it('PATCH /api/v1/appointments/:id/status debe actualizar el estado de la cita', () => {
    service.updateAppointmentStatus('apt-001', 'CONFIRMADA').subscribe((res) => {
      expect(res.status).toBe('CONFIRMADA');
    });

    const req = httpMock.expectOne(`${baseUrl}/apt-001/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'CONFIRMADA' });
    req.flush({ ...mockAppointment, status: 'CONFIRMADA' });
  });

  it('PUT /api/v1/appointments/:id debe reprogramar una cita', () => {
    const updateDto: UpdateAppointmentDto = {
      startDateTime: '2026-10-23T10:00:00Z',
      endDateTime: '2026-10-23T10:30:00Z'
    };

    service.rescheduleAppointment('apt-001', updateDto).subscribe((res) => {
      expect(res.startDateTime).toBe('2026-10-23T10:00:00Z');
    });

    const req = httpMock.expectOne(`${baseUrl}/apt-001`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateDto);
    req.flush({ ...mockAppointment, ...updateDto });
  });
});
