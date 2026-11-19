export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';

export type InvoiceStatus = 'PAGADA' | 'PENDIENTE_CREDITO' | 'ANULADA';

export type CashMovementType = 'INGRESO' | 'EGRESO';

export type CashRegisterStatus = 'ABIERTA' | 'CERRADA';

export interface CatalogBillableItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: 'SERVICIO' | 'PRODUCTO';
  readonly unitPrice: number;
  readonly taxRate: number; // e.g., 0 or 0.19
}

export interface CartLineItem {
  readonly item: CatalogBillableItem;
  readonly quantity: number;
}

export interface CartTotals {
  readonly subtotal: number;
  readonly taxTotal: number;
  readonly grandTotal: number;
}

export interface PaymentSplit {
  readonly method: PaymentMethod;
  readonly amount: number;
  readonly reference?: string;
}

export interface PaymentCoverage {
  readonly totalPaid: number;
  readonly remaining: number;
  readonly change: number;
  readonly isCovered: boolean;
}

export interface CreateInvoiceItemPayload {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface CreateInvoiceDto {
  readonly clientId: string;
  readonly items: readonly CreateInvoiceItemPayload[];
  readonly payments: readonly {
    readonly method: PaymentMethod;
    readonly amount: number;
  }[];
}

export interface InvoiceResponse {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly total: number;
  readonly status: InvoiceStatus;
  readonly issuedBy: {
    readonly id: string;
    readonly fullName: string;
  };
  readonly createdAt: string;
}

export interface CreditAccount {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly clientDocument: string;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly balance: number;
  readonly dueDate: string;
}

export interface CreditPaymentReceipt {
  readonly paymentId: string;
  readonly creditId: string;
  readonly amountPaid: number;
  readonly newBalance: number;
  readonly method: Exclude<PaymentMethod, 'CREDITO'>;
  readonly paidAt: string;
}

export interface CashSession {
  readonly id: string;
  readonly status: CashRegisterStatus;
  readonly openingAmount: number;
  readonly openedAt: string;
  readonly openedBy: string;
}

export interface CashMinorMovement {
  readonly id: string;
  readonly type: CashMovementType;
  readonly amount: number;
  readonly description: string;
  readonly createdAt: string;
}

export interface CashClosingSummary {
  readonly expectedCash: number;
  readonly physicalCount: number;
  readonly difference: number;
  readonly isBalanced: boolean;
}

export const COLOMBIAN_DENOMINATIONS: readonly number[] = [
  100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100
];

export function calculateCartTotals(lines: readonly CartLineItem[]): CartTotals {
  let subtotal = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const lineBase = line.item.unitPrice * line.quantity;
    subtotal += lineBase;
    taxTotal += Math.round(lineBase * line.item.taxRate);
  }

  return {
    subtotal,
    taxTotal,
    grandTotal: subtotal + taxTotal
  };
}

export function evaluatePaymentCoverage(
  grandTotal: number,
  payments: readonly PaymentSplit[]
): PaymentCoverage {
  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const diff = totalPaid - grandTotal;

  return {
    totalPaid,
    remaining: diff < 0 ? Math.abs(diff) : 0,
    change: diff > 0 ? diff : 0,
    isCovered: grandTotal > 0 && totalPaid >= grandTotal
  };
}

export function calculateDenominationTotal(
  counts: Readonly<Record<number, number>>
): number {
  return COLOMBIAN_DENOMINATIONS.reduce(
    (sum, denom) => sum + denom * (Number(counts[denom]) || 0),
    0
  );
}

export function evaluateCashClosing(
  expectedCash: number,
  physicalCount: number
): CashClosingSummary {
  const difference = physicalCount - expectedCash;
  return {
    expectedCash,
    physicalCount,
    difference,
    isBalanced: difference === 0
  };
}
