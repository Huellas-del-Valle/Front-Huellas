import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AuditLogEntry,
  AuditLogFilters,
  PaginatedAuditLogs
} from '../models/reports.model';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAuditLogs(filters?: AuditLogFilters): Observable<PaginatedAuditLogs> {
    let params = new HttpParams();

    if (filters?.employeeId && filters.employeeId !== 'ALL') {
      params = params.set('employeeId', filters.employeeId);
    }
    if (filters?.startDateTime) {
      params = params.set('startDateTime', filters.startDateTime);
    }
    if (filters?.endDateTime) {
      params = params.set('endDateTime', filters.endDateTime);
    }
    if (filters?.eventType && filters.eventType !== 'ALL') {
      params = params.set('eventType', filters.eventType);
    }
    if (filters?.page !== undefined) {
      params = params.set('page', String(filters.page));
    }
    if (filters?.pageSize !== undefined) {
      params = params.set('pageSize', String(filters.pageSize));
    }

    return this.http.get<PaginatedAuditLogs>(`${this.apiUrl}/audit-logs`, { params });
  }

  getAuditLogDetail(id: string): Observable<AuditLogEntry> {
    return this.http.get<AuditLogEntry>(
      `${this.apiUrl}/audit-logs/${encodeURIComponent(id)}`
    );
  }
}
