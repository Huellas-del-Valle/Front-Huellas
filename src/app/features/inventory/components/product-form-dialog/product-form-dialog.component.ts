import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventoryService } from '../../services/inventory.service';
import {
  CreateProductDto,
  InventoryProduct,
  ProductCategory,
  Supplier
} from '../../models/inventory.model';

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = input<InventoryProduct | null>(null);
  readonly suppliers = input.required<readonly Supplier[]>();

  readonly saved = output<InventoryProduct>();
  readonly closed = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  readonly isEditMode = computed(() => this.product() !== null);

  readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['MEDICAMENTO' as ProductCategory, [Validators.required]],
    supplierId: ['', [Validators.required]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    currentStock: [0, [Validators.required, Validators.min(0)]],
    minStock: [5, [Validators.required, Validators.min(0)]],
    batchNumber: [''],
    expirationDate: ['']
  });

  ngOnInit(): void {
    const existing = this.product();
    if (existing) {
      this.form.patchValue({
        sku: existing.sku,
        name: existing.name,
        category: existing.category,
        supplierId: existing.supplierId,
        unitPrice: existing.unitPrice,
        currentStock: existing.currentStock,
        minStock: existing.minStock,
        batchNumber: existing.batchNumber ?? '',
        expirationDate: existing.expirationDate ?? ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const payload: CreateProductDto = {
      ...raw,
      batchNumber: raw.batchNumber.trim() || undefined,
      expirationDate: raw.expirationDate || undefined
    };

    const existing = this.product();
    const request$ = existing
      ? this.inventoryService.updateProduct(existing.id, payload)
      : this.inventoryService.createProduct(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedProduct) => {
        this.isSubmitting.set(false);
        this.saved.emit(savedProduct);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isSubmitting.set(false);
        this.submitError.set(
          err?.error?.message || 'No se pudo guardar el producto en el inventario.'
        );
      }
    });
  }

  close(): void {
    this.closed.emit();
  }
}
