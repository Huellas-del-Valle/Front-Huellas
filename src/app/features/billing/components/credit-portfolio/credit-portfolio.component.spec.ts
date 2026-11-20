import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { CreditPortfolioComponent } from './credit-portfolio.component';
import { BillingService } from '../../services/billing.service';
import { CreditAccount } from '../../models/billing.model';

describe('CreditPortfolioComponent', () => {
  let fixture: ComponentFixture<CreditPortfolioComponent>;
  let component: CreditPortfolioComponent;
  let billingServiceMock: {
    getCredits: ReturnType<typeof vi.fn>;
    registerCreditPayment: ReturnType<typeof vi.fn>;
  };

  const sampleCredits: CreditAccount[] = [
    {
      id: 'cred-1',
      invoiceNumber: 'FAC-2026-0015',
      clientId: 'cli-1',
      clientName: 'Carlos Andrés Gómez',
      clientDocument: '1085290112',
      totalAmount: 150000,
      paidAmount: 50000,
      balance: 100000,
      dueDate: '2026-12-15'
    }
  ];

  beforeEach(async () => {
    billingServiceMock = {
      getCredits: vi.fn().mockReturnValue(of(sampleCredits)),
      registerCreditPayment: vi.fn().mockReturnValue(
        of({
          paymentId: 'REC-001',
          creditId: 'cred-1',
          amountPaid: 40000,
          newBalance: 60000,
          method: 'EFECTIVO',
          paidAt: '2026-11-19T17:00:00Z'
        })
      )
    };

    await TestBed.configureTestingModule({
      imports: [CreditPortfolioComponent],
      providers: [
        provideRouter([]),
        { provide: BillingService, useValue: billingServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreditPortfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should prevent registering a payment higher than pending balance', () => {
    component.openPaymentDialog(sampleCredits[0]);
    component.paymentForm.patchValue({ amount: 120000 });
    expect(component.exceedsBalance()).toBe(true);

    component.onSubmitPayment();
    expect(billingServiceMock.registerCreditPayment).not.toHaveBeenCalled();
  });

  it('should register partial payment, update balance, and display payment receipt', () => {
    component.openPaymentDialog(sampleCredits[0]);
    component.paymentForm.patchValue({ amount: 40000, method: 'EFECTIVO' });

    component.onSubmitPayment();
    fixture.detectChanges();

    expect(billingServiceMock.registerCreditPayment).toHaveBeenCalledWith('cred-1', {
      amount: 40000,
      method: 'EFECTIVO'
    });
    expect(component.credits()[0].balance).toBe(60000);
    expect(component.lastReceipt()?.paymentId).toBe('REC-001');
  });
});
