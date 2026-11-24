import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReportFilters, ReportsDashboardData } from '../models/reports.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getDashboardMetrics(filters?: ReportFilters): Observable<ReportsDashboardData> {
    const params = this.buildFilterParams(filters);
    return this.http.get<ReportsDashboardData>(`${this.apiUrl}/reports/dashboard`, {
      params
    });
  }

  exportReportPdf(filters?: ReportFilters): Observable<Blob> {
    const params = this.buildFilterParams(filters);
    return this.http.get(`${this.apiUrl}/reports/export/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  exportReportExcel(filters?: ReportFilters): Observable<Blob> {
    const params = this.buildFilterParams(filters);
    return this.http.get(`${this.apiUrl}/reports/export/xlsx`, {
      params,
      responseType: 'blob'
    });
  }

  private buildFilterParams(filters?: ReportFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.veterinarianId && filters.veterinarianId !== 'ALL') {
      params = params.set('veterinarianId', filters.veterinarianId);
    }
    if (filters.serviceType && filters.serviceType !== 'ALL') {
      params = params.set('serviceType', filters.serviceType);
    }
    if (filters.cashStatus && filters.cashStatus !== 'ALL') {
      params = params.set('cashStatus', filters.cashStatus);
    }

    return params;
  }
}
