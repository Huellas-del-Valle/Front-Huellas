import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BillingService } from './billing.service';
import { environment } from '../../../../environments/environment';
import { CreateInvoiceDto } from '../models/billing.model';

describe('BillingService', () => {
  let service: BillingService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BillingService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(BillingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post a new invoice and return created response', () => {
    const dto: CreateInvoiceDto = {
      clientId: 'cli-1',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 45000 }],
      payments: [{ method: 'EFECTIVO', amount: 90000 }]
    };

    service.createInvoice(dto).subscribe((res) => {
      expect(res.invoiceNumber).toBe('FAC-2026-0001');
      expect(res.total).toBe(90000);
    });

    const req = httpMock.expectOne(`${baseUrl}/billing/invoices`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({
      invoiceId: 'inv-1',
      invoiceNumber: 'FAC-2026-0001',
      total: 90000,
      status: 'PAGADA',
      issuedBy: { id: 'u-1', fullName: 'Dr. Roberto Mendoza' },
      createdAt: '2026-11-19T16:00:00Z'
    });
  });

  it('should register a partial credit payment', () => {
    service
      .registerCreditPayment('cred-10', { amount: 50000, method: 'TRANSFERENCIA' })
      .subscribe((receipt) => {
        expect(receipt.newBalance).toBe(40000);
      });

    const req = httpMock.expectOne(`${baseUrl}/credits/cred-10/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ amount: 50000, method: 'TRANSFERENCIA' });
    req.flush({
      paymentId: 'pay-1',
      creditId: 'cred-10',
      amountPaid: 50000,
      newBalance: 40000,
      method: 'TRANSFERENCIA',
      paidAt: '2026-11-19T16:05:00Z'
    });
  });
});
