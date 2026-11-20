export type ProductCategory = 'MEDICAMENTO' | 'INSUMO' | 'ALIMENTO' | 'BIOLOGICO';

export type MovementType = 'ENTRADA' | 'SALIDA';

export type StockAlertSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface Supplier {
  readonly id: string;
  readonly taxId: string;
  readonly name: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email: string;
  readonly address?: string;
  readonly productsCount?: number;
}

export interface CreateSupplierDto {
  readonly taxId: string;
  readonly name: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email: string;
  readonly address?: string;
}

export interface InventoryProduct {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly supplierId: string;
  readonly supplierName?: string;
  readonly unitPrice: number;
  readonly currentStock: number;
  readonly minStock: number;
  readonly batchNumber?: string;
  readonly expirationDate?: string;
}

export interface CreateProductDto {
  readonly sku: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly supplierId: string;
  readonly unitPrice: number;
  readonly currentStock: number;
  readonly minStock: number;
  readonly batchNumber?: string;
  readonly expirationDate?: string;
}

export interface CreateMovementDto {
  readonly productId: string;
  readonly type: MovementType;
  readonly quantity: number;
  readonly reason: string;
  readonly batchNumber: string;
  readonly expirationDate: string;
}

export interface InventoryMovementRecord extends CreateMovementDto {
  readonly id: string;
  readonly createdAt: string;
}

export interface LowStockAlertItem {
  readonly productId: string;
  readonly name: string;
  readonly currentStock: number;
  readonly minStock: number;
}

export interface NearExpirationAlertItem {
  readonly productId: string;
  readonly name: string;
  readonly batchNumber: string;
  readonly expirationDate: string;
  readonly daysLeft: number;
}

export interface InventoryAlertsResponse {
  readonly summary: {
    readonly totalLowStock: number;
    readonly totalNearExpiration: number;
  };
  readonly lowStock: readonly LowStockAlertItem[];
  readonly nearExpiration: readonly NearExpirationAlertItem[];
}

export interface ProductRowAlertEvaluation {
  readonly severity: StockAlertSeverity;
  readonly label: string;
}

export function evaluateProductRowAlert(
  product: InventoryProduct,
  referenceDate: Date = new Date()
): ProductRowAlertEvaluation {
  if (product.currentStock <= 0) {
    return { severity: 'CRITICAL', label: 'Agotado (0 uds)' };
  }

  if (product.expirationDate) {
    const [year, month, day] = product.expirationDate.split('-').map(Number);
    const expDate = new Date(year, (month || 1) - 1, day || 1);
    const today = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    );

    if (expDate.getTime() < today.getTime()) {
      return { severity: 'CRITICAL', label: 'Producto vencido' };
    }
  }

  if (product.currentStock <= product.minStock) {
    return { severity: 'WARNING', label: 'Stock mínimo alcanzado' };
  }

  return { severity: 'NORMAL', label: 'Stock óptimo' };
}
