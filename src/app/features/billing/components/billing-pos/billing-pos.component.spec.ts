import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { BillingPosComponent } from './billing-pos.component';
import { CashRegisterService } from '../../services/cash-register.service';
import { BillingService } from '../../services/billing.service';

describe('BillingPosComponent', () => {
  let fixture: ComponentFixture<BillingPosComponent>;
  let component: BillingPosComponent;
  let cashService: CashRegisterService;
  let billingService: BillingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingPosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    cashService = TestBed.inject(CashRegisterService);
    billingService = TestBed.inject(BillingService);
    vi.spyOn(cashService, 'getCurrentSession').mockReturnValue(of(null));

    fixture = TestBed.createComponent(BillingPosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should block invoicing and display warning banner when cash register is closed', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="pos-register-closed-banner"]')).toBeTruthy();

    component.addToCart(component.catalog()[0]);
    expect(component.cartLines().length).toBe(0);
  });

  it('should calculate subtotal, taxes, and grand total reactively and validate mixed payment coverage', () => {
    cashService.currentSession.set({
      id: 'c-1',
      status: 'ABIERTA',
      openingAmount: 100000,
      openedAt: '2026-11-19T08:00:00Z',
      openedBy: 'Dr. Roberto Mendoza'
    });
    fixture.detectChanges();

    // Consulta $45,000 (IVA 0) + Meloxicam $38,000 (+19% IVA = $7,220) -> Total = $90,220
    component.addToCart(component.catalog()[0]);
    component.addToCart(component.catalog()[3]);
    fixture.detectChanges();

    expect(component.totals().subtotal).toBe(83000);
    expect(component.totals().taxTotal).toBe(7220);
    expect(component.totals().grandTotal).toBe(90220);

    // Abrir modal y probar pago insuficiente
    component.openPaymentModal();
    component.updatePaymentAmount(0, '50000');
    expect(component.coverage().isCovered).toBe(false);

    // Agregar pago mixto con tarjeta por el restante ($40,220)
    component.addPaymentSplit();
    expect(component.coverage().isCovered).toBe(true);

    vi.spyOn(billingService, 'createInvoice').mockReturnValue(
      of({
        invoiceId: 'inv-99',
        invoiceNumber: 'FAC-2026-0099',
        total: 90220,
        status: 'PAGADA',
        issuedBy: { id: 'u-1', fullName: 'Dr. Roberto Mendoza' },
        createdAt: '2026-11-19T16:30:00Z'
      })
    );

    component.confirmCheckout();
    expect(component.issuedInvoice()?.invoiceNumber).toBe('FAC-2026-0099');
  });
});
