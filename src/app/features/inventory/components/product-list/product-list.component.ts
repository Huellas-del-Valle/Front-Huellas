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
import { InventoryService } from '../../services/inventory.service';
import {
  InventoryAlertsResponse,
  InventoryMovementRecord,
  InventoryProduct,
  ProductCategory,
  ProductRowAlertEvaluation,
  StockAlertSeverity,
  Supplier,
  evaluateProductRowAlert
} from '../../models/inventory.model';
import { InventoryAlertsComponent } from '../inventory-alerts/inventory-alerts.component';
import { ProductFormDialogComponent } from '../product-form-dialog/product-form-dialog.component';
import { ProductMovementDialogComponent } from '../product-movement-dialog/product-movement-dialog.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    InventoryAlertsComponent,
    ProductFormDialogComponent,
    ProductMovementDialogComponent
  ],
  templateUrl: './product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<readonly InventoryProduct[]>([]);
  readonly suppliers = signal<readonly Supplier[]>([]);
  readonly alerts = signal<InventoryAlertsResponse | null>(null);

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  // Filtros reactivos
  readonly searchTerm = signal<string>('');
  readonly categoryFilter = signal<ProductCategory | 'ALL'>('ALL');
  readonly supplierFilter = signal<string>('ALL');
  readonly severityFilter = signal<StockAlertSeverity | 'ALL'>('ALL');

  // Estado de modales
  readonly isProductModalOpen = signal<boolean>(false);
  readonly editingProduct = signal<InventoryProduct | null>(null);
  readonly movementTargetProduct = signal<InventoryProduct | null>(null);

  readonly outOfStockCount = computed(
    () => this.products().filter((p) => p.currentStock <= 0).length
  );

  readonly filteredProducts = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const cat = this.categoryFilter();
    const sup = this.supplierFilter();
    const sev = this.severityFilter();

    return this.products().filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.batchNumber?.toLowerCase().includes(query) ?? false);

      const matchesCat = cat === 'ALL' || item.category === cat;
      const matchesSup = sup === 'ALL' || item.supplierId === sup;
      const evaluation = evaluateProductRowAlert(item);
      const matchesSev = sev === 'ALL' || evaluation.severity === sev;

      return matchesQuery && matchesCat && matchesSup && matchesSev;
    });
  });

  ngOnInit(): void {
    this.loadInventoryData();
  }

  loadInventoryData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.inventoryService
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.products.set(items);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('No se pudo cargar el catálogo de inventario.');
        }
      });

    this.inventoryService
      .getAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alertData) => this.alerts.set(alertData),
        error: () => this.alerts.set(null)
      });

    this.inventoryService
      .getSuppliers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (supList) => this.suppliers.set(supList),
        error: () => this.suppliers.set([])
      });
  }

  getRowAlert(product: InventoryProduct): ProductRowAlertEvaluation {
    return evaluateProductRowAlert(product);
  }

  getSupplierLabel(product: InventoryProduct): string {
    if (product.supplierName) return product.supplierName;
    const found = this.suppliers().find((s) => s.id === product.supplierId);
    return found ? found.name : 'Sin asignar';
  }

  openCreateProduct(): void {
    this.editingProduct.set(null);
    this.isProductModalOpen.set(true);
  }

  openEditProduct(product: InventoryProduct): void {
    this.editingProduct.set(product);
    this.isProductModalOpen.set(true);
  }

  closeProductModal(): void {
    this.isProductModalOpen.set(false);
    this.editingProduct.set(null);
  }

  onProductSaved(saved: InventoryProduct): void {
    const isEdit = this.editingProduct() !== null;
    this.products.update((list) =>
      isEdit ? list.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...list]
    );
    this.closeProductModal();
    this.feedbackMessage.set(
      `Producto "${saved.name}" ${isEdit ? 'actualizado' : 'registrado'} correctamente.`
    );
  }

  openMovementModal(product: InventoryProduct): void {
    this.movementTargetProduct.set(product);
  }

  closeMovementModal(): void {
    this.movementTargetProduct.set(null);
  }

  onMovementRegistered(record: InventoryMovementRecord): void {
    this.products.update((list) =>
      list.map((item) => {
        if (item.id !== record.productId) return item;
        const delta = record.type === 'ENTRADA' ? record.quantity : -record.quantity;
        return {
          ...item,
          currentStock: Math.max(0, item.currentStock + delta),
          batchNumber: record.batchNumber,
          expirationDate: record.expirationDate
        };
      })
    );
    this.closeMovementModal();
    this.feedbackMessage.set(
      `Movimiento de ${record.type} (${record.quantity} uds) registrado correctamente.`
    );
  }
}
