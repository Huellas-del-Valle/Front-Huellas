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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BillingService } from '../../services/billing.service';
import { CashRegisterService } from '../../services/cash-register.service';
import {
  CartLineItem,
  CatalogBillableItem,
  CreateInvoiceDto,
  InvoiceResponse,
  PaymentMethod,
  PaymentSplit,
  calculateCartTotals,
  evaluatePaymentCoverage
} from '../../models/billing.model';

export interface PosClientOption {
  readonly id: string;
  readonly documentNumber: string;
  readonly fullName: string;
}

@Component({
  selector: 'app-billing-pos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './billing-pos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BillingPosComponent implements OnInit {
  private readonly billingService = inject(BillingService);
  readonly cashService = inject(CashRegisterService);
  private readonly destroyRef = inject(DestroyRef);

  readonly clients = signal<readonly PosClientOption[]>([
    { id: 'cli-001', documentNumber: '1085290112', fullName: 'Carlos Andrés Gómez' },
    { id: 'cli-002', documentNumber: '52890341', fullName: 'María Fernanda López' },
    { id: 'cli-003', documentNumber: '80112455', fullName: 'Jorge Enrique Castillo' }
  ]);

  readonly catalog = signal<readonly CatalogBillableItem[]>([
    { id: 'srv-01', code: 'CONS-01', name: 'Consulta Médica Veterinaria General', category: 'SERVICIO', unitPrice: 45000, taxRate: 0 },
    { id: 'srv-02', code: 'VAC-01', name: 'Aplicación Vacuna Antirrábica', category: 'SERVICIO', unitPrice: 35000, taxRate: 0 },
    { id: 'srv-03', code: 'ECO-01', name: 'Ecografía Abdominal Diagnóstica', category: 'SERVICIO', unitPrice: 95000, taxRate: 0 },
    { id: 'prod-01', code: 'MED-001', name: 'Meloxicam 1.5mg/ml Suspensión', category: 'PRODUCTO', unitPrice: 38000, taxRate: 0.19 },
    { id: 'prod-02', code: 'ALI-003', name: 'Alimento Renal Canino 2kg', category: 'PRODUCTO', unitPrice: 72000, taxRate: 0.19 }
  ]);

  readonly searchTerm = signal<string>('');
  readonly selectedClientId = signal<string>('cli-001');
  readonly cartLines = signal<readonly CartLineItem[]>([]);

  // Modal de cobro multiformato
  readonly isPaymentModalOpen = signal<boolean>(false);
  readonly paymentSplits = signal<readonly PaymentSplit[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  // Comprobante generado / vista PDF
  readonly issuedInvoice = signal<InvoiceResponse | null>(null);

  readonly filteredCatalog = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return this.catalog();
    return this.catalog().filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  });

  readonly totals = computed(() => calculateCartTotals(this.cartLines()));

  readonly coverage = computed(() =>
    evaluatePaymentCoverage(this.totals().grandTotal, this.paymentSplits())
  );

  ngOnInit(): void {
    if (!this.cashService.currentSession()) {
      this.cashService
        .getCurrentSession()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => undefined });
    }
  }

  addToCart(item: CatalogBillableItem): void {
    if (!this.cashService.isRegisterOpen()) return;
    this.cartLines.update((lines) => {
      const idx = lines.findIndex((l) => l.item.id === item.id);
      if (idx >= 0) {
        return lines.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...lines, { item, quantity: 1 }];
    });
  }

  updateQuantity(itemId: string, delta: number): void {
    this.cartLines.update((lines) =>
      lines
        .map((l) => (l.item.id === itemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  openPaymentModal(): void {
    if (!this.cashService.isRegisterOpen() || this.cartLines().length === 0) return;
    this.submitError.set(null);
    this.paymentSplits.set([
      { method: 'EFECTIVO', amount: this.totals().grandTotal }
    ]);
    this.isPaymentModalOpen.set(true);
  }

  addPaymentSplit(): void {
    const remaining = this.coverage().remaining;
    this.paymentSplits.update((splits) => [
      ...splits,
      { method: 'TARJETA', amount: remaining }
    ]);
  }

  updatePaymentMethod(index: number, method: PaymentMethod): void {
    this.paymentSplits.update((splits) =>
      splits.map((s, i) => (i === index ? { ...s, method } : s))
    );
  }

  updatePaymentAmount(index: number, rawAmount: string): void {
    const amount = Math.max(0, Number(rawAmount) || 0);
    this.paymentSplits.update((splits) =>
      splits.map((s, i) => (i === index ? { ...s, amount } : s))
    );
  }

  removePaymentSplit(index: number): void {
    if (this.paymentSplits().length <= 1) return;
    this.paymentSplits.update((splits) => splits.filter((_, i) => i !== index));
  }

  confirmCheckout(): void {
    if (!this.cashService.isRegisterOpen() || !this.coverage().isCovered) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const payload: CreateInvoiceDto = {
      clientId: this.selectedClientId(),
      items: this.cartLines().map((l) => ({
        productId: l.item.id,
        quantity: l.quantity,
        unitPrice: l.item.unitPrice
      })),
      payments: this.paymentSplits().map((p) => ({
        method: p.method,
        amount: p.amount
      }))
    };

    this.billingService
      .createInvoice(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice) => {
          this.isSubmitting.set(false);
          this.isPaymentModalOpen.set(false);
          this.issuedInvoice.set(invoice);
          this.cartLines.set([]);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting.set(false);
          this.submitError.set(
            err?.error?.message || 'No se pudo emitir la factura en el servidor.'
          );
        }
      });
  }

  downloadOrPrintInvoicePdf(invoice: InvoiceResponse): void {
    this.billingService
      .downloadInvoicePdf(invoice.invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${invoice.invoiceNumber}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          if (typeof window !== 'undefined' && typeof window.print === 'function') {
            window.print();
          }
        }
      });
  }
}
