import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CashMinorMovement,
  CashMovementType,
  CashSession
} from '../models/billing.model';

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly currentSession = signal<CashSession | null>(null);
  readonly isRegisterOpen = computed(() => this.currentSession()?.status === 'ABIERTA');

  getCurrentSession(): Observable<CashSession | null> {
    return this.http
      .get<CashSession | null>(`${this.apiUrl}/cash-register/current`)
      .pipe(tap((session) => this.currentSession.set(session)));
  }

  openRegister(openingAmount: number): Observable<CashSession> {
    return this.http
      .post<CashSession>(`${this.apiUrl}/cash-register/open`, { openingAmount })
      .pipe(tap((session) => this.currentSession.set(session)));
  }

  registerMinorMovement(payload: {
    readonly type: CashMovementType;
    readonly amount: number;
    readonly description: string;
  }): Observable<CashMinorMovement> {
    return this.http.post<CashMinorMovement>(
      `${this.apiUrl}/cash-register/movements`,
      payload
    );
  }

  closeRegister(payload: {
    readonly physicalCount: number;
    readonly expectedCash: number;
    readonly difference: number;
    readonly notes?: string;
  }): Observable<CashSession> {
    return this.http
      .post<CashSession>(`${this.apiUrl}/cash-register/close`, payload)
      .pipe(tap((session) => this.currentSession.set(session)));
  }
}
