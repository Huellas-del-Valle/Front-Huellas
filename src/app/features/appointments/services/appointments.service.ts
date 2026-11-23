import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDto,
  TimeSlotAvailability,
  UpdateAppointmentDto
} from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene las citas dentro de un rango de fechas, con filtro opcional de veterinario.
   * Endpoint: GET /api/v1/appointments?startDate=...&endDate=...&veterinarianId=...
   */
  getAppointments(
    startDate?: string,
    endDate?: string,
    veterinarianId?: string
  ): Observable<Appointment[]> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (veterinarianId && veterinarianId !== 'ALL') {
      params = params.set('veterinarianId', veterinarianId);
    }

    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments`, { params });
  }

  /**
   * Consulta la disponibilidad horaria de un profesional en una fecha específica.
   * Endpoint: GET /api/v1/appointments/availability?veterinarianId=:id&date=2026-10-22
   */
  getAvailability(
    veterinarianId: string,
    date: string
  ): Observable<TimeSlotAvailability[]> {
    const params = new HttpParams()
      .set('veterinarianId', veterinarianId)
      .set('date', date);

    return this.http.get<TimeSlotAvailability[]>(
      `${this.apiUrl}/appointments/availability`,
      { params }
    );
  }

  /**
   * Alias de consulta de disponibilidad por compatibilidad
   */
  getVeterinarianAvailability(
    veterinarianId: string,
    date: string
  ): Observable<TimeSlotAvailability[]> {
    return this.getAvailability(veterinarianId, date);
  }

  /**
   * Registra una nueva cita médica.
   * Endpoint: POST /api/v1/appointments
   */
  createAppointment(dto: CreateAppointmentDto): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/appointments`, dto);
  }

  /**
   * Actualiza el estado de una cita médica (PENDIENTE, CONFIRMADA, ATENDIDA, CANCELADA, NO_ASISTIDA).
   * Endpoint: PATCH /api/v1/appointments/:id/status
   */
  updateAppointmentStatus(
    id: string,
    status: AppointmentStatus
  ): Observable<Appointment> {
    return this.http.patch<Appointment>(
      `${this.apiUrl}/appointments/${encodeURIComponent(id)}/status`,
      { status }
    );
  }

  /**
   * Reprograma fecha/hora o modifica una cita médica.
   * Endpoint: PUT /api/v1/appointments/:id
   */
  rescheduleAppointment(
    id: string,
    dto: UpdateAppointmentDto
  ): Observable<Appointment> {
    return this.http.put<Appointment>(
      `${this.apiUrl}/appointments/${encodeURIComponent(id)}`,
      dto
    );
  }

  /**
   * Alias de actualización/reprogramación de cita médica
   */
  updateAppointment(
    id: string,
    dto: UpdateAppointmentDto
  ): Observable<Appointment> {
    return this.rescheduleAppointment(id, dto);
  }
}
