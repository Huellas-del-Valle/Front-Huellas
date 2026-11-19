import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CashRegisterService } from './cash-register.service';
import { environment } from '../../../../environments/environment';

describe('CashRegisterService', () => {
  let service: CashRegisterService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CashRegisterService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CashRegisterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should open cash register and update isRegisterOpen signal to true', () => {
    expect(service.isRegisterOpen()).toBe(false);

    service.openRegister(200000).subscribe((session) => {
      expect(session.status).toBe('ABIERTA');
      expect(service.isRegisterOpen()).toBe(true);
    });

    const req = httpMock.expectOne(`${baseUrl}/cash-register/open`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ openingAmount: 200000 });
    req.flush({
      id: 'cash-1',
      status: 'ABIERTA',
      openingAmount: 200000,
      openedAt: '2026-11-19T08:00:00Z',
      openedBy: 'Dr. Roberto Mendoza'
    });
  });

  it('should close cash register and update isRegisterOpen signal to false', () => {
    service.closeRegister({ physicalCount: 350000, expectedCash: 350000, difference: 0 }).subscribe((session) => {
      expect(session.status).toBe('CERRADA');
      expect(service.isRegisterOpen()).toBe(false);
    });

    const req = httpMock.expectOne(`${baseUrl}/cash-register/close`);
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 'cash-1',
      status: 'CERRADA',
      openingAmount: 200000,
      openedAt: '2026-11-19T08:00:00Z',
      openedBy: 'Dr. Roberto Mendoza'
    });
  });
});
