import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateMedicalRecordDto,
  MedicalRecord,
  MedicalRecordFilters,
  UpdateMedicalRecordDto
} from '../models/medical-record.model';

/**
 * Servicio encargado de la integración REST del módulo de Historia Clínica.
 *
 * Rutas acordadas con Backend:
 * - Consulta cronológica por paciente: GET /api/v1/pets/:petId/medical-records
 * - Consulta de atención individual: GET /api/v1/medical-records/:id
 * - Registro de consulta: POST /api/v1/medical-records
 * - Edición de consulta: PUT /api/v1/medical-records/:id
 * - Exportación PDF del expediente completo (confirmada): GET /api/v1/pets/:petId/medical-records/pdf
 * - Exportación PDF de atención individual (confirmada): GET /api/v1/medical-records/:recordId/pdf
 */
@Injectable({
  providedIn: 'root'
})
export class MedicalRecordsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMedicalHistory(
    petId: string,
    filters?: MedicalRecordFilters
  ): Observable<MedicalRecord[]> {
    let params = new HttpParams();

    if (filters?.date) {
      params = params.set('date', filters.date);
    }
    if (filters?.fromDate) {
      params = params.set('fromDate', filters.fromDate);
    }
    if (filters?.toDate) {
      params = params.set('toDate', filters.toDate);
    }
    if (filters?.recordType && filters.recordType !== 'ALL') {
      params = params.set('recordType', filters.recordType);
    }

    return this.http.get<MedicalRecord[]>(
      `${this.apiUrl}/pets/${encodeURIComponent(petId)}/medical-records`,
      { params }
    );
  }

  getMedicalRecordById(recordId: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(
      `${this.apiUrl}/medical-records/${encodeURIComponent(recordId)}`
    );
  }

  createConsultation(dto: CreateMedicalRecordDto): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(`${this.apiUrl}/medical-records`, dto);
  }

  updateConsultation(
    recordId: string,
    dto: UpdateMedicalRecordDto
  ): Observable<MedicalRecord> {
    return this.http.put<MedicalRecord>(
      `${this.apiUrl}/medical-records/${encodeURIComponent(recordId)}`,
      dto
    );
  }

  /**
   * Descarga el expediente médico completo del paciente en formato PDF.
   * Ruta validada con Backend: GET /api/v1/pets/:petId/medical-records/pdf
   */
  exportMedicalHistoryPdf(petId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/pets/${encodeURIComponent(petId)}/medical-records/pdf`,
      { responseType: 'blob' }
    );
  }

  /**
   * Descarga el comprobante/resumen de una atención médica individual en formato PDF.
   * Ruta validada con Backend: GET /api/v1/medical-records/:recordId/pdf
   */
  exportConsultationPdf(recordId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/medical-records/${encodeURIComponent(recordId)}/pdf`,
      { responseType: 'blob' }
    );
  }
}

