import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateVaccinationDto, VaccinationRecord } from '../models/vaccination.model';

@Injectable({
  providedIn: 'root'
})
export class VaccinationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getVaccinationsByPet(petId: string): Observable<VaccinationRecord[]> {
    return this.http.get<VaccinationRecord[]>(
      `${this.apiUrl}/pets/${encodeURIComponent(petId)}/vaccinations`
    );
  }

  createVaccination(
    petId: string,
    payload: CreateVaccinationDto
  ): Observable<VaccinationRecord> {
    return this.http.post<VaccinationRecord>(
      `${this.apiUrl}/pets/${encodeURIComponent(petId)}/vaccinations`,
      payload
    );
  }

  sendReminder(
    petId: string,
    vaccinationId: string
  ): Observable<{ readonly notified: boolean }> {
    return this.http.post<{ readonly notified: boolean }>(
      `${this.apiUrl}/pets/${encodeURIComponent(petId)}/vaccinations/${encodeURIComponent(vaccinationId)}/send-reminder`,
      {}
    );
  }

  downloadCertificatePdf(petId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/pets/${encodeURIComponent(petId)}/vaccinations/certificate`,
      { responseType: 'blob' }
    );
  }
}
