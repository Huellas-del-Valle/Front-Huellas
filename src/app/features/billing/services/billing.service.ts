import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateInvoiceDto,
  CreditAccount,
  CreditPaymentReceipt,
  InvoiceResponse,
  PaymentMethod
} from '../models/billing.model';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  createInvoice(payload: CreateInvoiceDto): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(`${this.apiUrl}/billing/invoices`, payload);
  }

  getInvoices(): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(`${this.apiUrl}/billing/invoices`);
  }

  downloadInvoicePdf(invoiceId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`,
      { responseType: 'blob' }
    );
  }

  getCredits(): Observable<CreditAccount[]> {
    return this.http.get<CreditAccount[]>(`${this.apiUrl}/credits`);
  }

  registerCreditPayment(
    creditId: string,
    payload: {
      readonly amount: number;
      readonly method: Exclude<PaymentMethod, 'CREDITO'>;
    }
  ): Observable<CreditPaymentReceipt> {
    return this.http.post<CreditPaymentReceipt>(
      `${this.apiUrl}/credits/${encodeURIComponent(creditId)}/payments`,
      payload
    );
  }
}
