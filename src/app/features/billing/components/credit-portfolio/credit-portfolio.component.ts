import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BillingService } from '../../services/billing.service';
import {
  CreditAccount,
  CreditPaymentReceipt,
  PaymentMethod
} from '../../models/billing.model';

@Component({
  selector: 'app-credit-portfolio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './credit-portfolio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditPortfolioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly billingService = inject(BillingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly credits = signal<readonly CreditAccount[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly selectedCredit = signal<CreditAccount | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);
  readonly lastReceipt = signal<CreditPaymentReceipt | null>(null);

  readonly paymentForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    method: ['EFECTIVO' as Exclude<PaymentMethod, 'CREDITO'>, [Validators.required]]
  });

  readonly filteredCredits = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return this.credits();
    return this.credits().filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        c.clientDocument.toLowerCase().includes(q) ||
        c.invoiceNumber.toLowerCase().includes(q)
    );
  });

  readonly totalPortfolioBalance = computed(() =>
    this.credits().reduce((sum, c) => sum + c.balance, 0)
  );

  ngOnInit(): void {
    this.loadCredits();
  }

  loadCredits(): void {
    this.isLoading.set(true);
    this.billingService
      .getCredits()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.credits.set(list);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }

  openPaymentDialog(credit: CreditAccount): void {
    this.selectedCredit.set(credit);
    this.submitError.set(null);
    this.paymentForm.reset({
      amount: credit.balance,
      method: 'EFECTIVO'
    });
  }

  closePaymentDialog(): void {
    this.selectedCredit.set(null);
  }

  exceedsBalance(): boolean {
    const target = this.selectedCredit();
    if (!target) return false;
    const amount = Number(this.paymentForm.controls.amount.value) || 0;
    return amount > target.balance;
  }

  onSubmitPayment(): void {
    const target = this.selectedCredit();
    if (!target || this.paymentForm.invalid || this.exceedsBalance()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.paymentForm.getRawValue();
    const amount = Number(raw.amount);

    this.billingService
      .registerCreditPayment(target.id, { amount, method: raw.method })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (receipt) => {
          this.credits.update((list) =>
            list.map((c) =>
              c.id === target.id
                ? {
                    ...c,
                    paidAmount: c.paidAmount + receipt.amountPaid,
                    balance: receipt.newBalance
                  }
                : c
            )
          );
          this.isSubmitting.set(false);
          this.lastReceipt.set(receipt);
          this.closePaymentDialog();
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting.set(false);
          this.submitError.set(
            err?.error?.message || 'No se pudo registrar el abono al crédito.'
          );
        }
      });
  }

  printReceipt(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }
}
