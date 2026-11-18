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
  CreateMovementDto,
  InventoryMovementRecord,
  InventoryProduct,
  MovementType
} from '../../models/inventory.model';

@Component({
  selector: 'app-product-movement-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-movement-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductMovementDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = input.required<InventoryProduct>();

  readonly moved = output<InventoryMovementRecord>();
  readonly closed = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    type: ['ENTRADA' as MovementType, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    batchNumber: ['', [Validators.required, Validators.minLength(2)]],
    expirationDate: ['', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly selectedType = signal<MovementType>('ENTRADA');
  readonly requestedQuantity = signal<number>(1);

  readonly exceedsAvailableStock = computed(
    () =>
      this.selectedType() === 'SALIDA' &&
      this.requestedQuantity() > this.product().currentStock
  );

  ngOnInit(): void {
    const prod = this.product();
    this.form.patchValue({
      batchNumber: prod.batchNumber ?? '',
      expirationDate: prod.expirationDate ?? ''
    });

    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.selectedType.set(val));

    this.form.controls.quantity.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.requestedQuantity.set(Number(val) || 0));
  }

  onSubmit(): void {
    if (this.form.invalid || this.exceedsAvailableStock()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const payload: CreateMovementDto = {
      productId: this.product().id,
      type: raw.type,
      quantity: Number(raw.quantity),
      reason: raw.reason.trim(),
      batchNumber: raw.batchNumber.trim(),
      expirationDate: raw.expirationDate
    };

    this.inventoryService
      .registerMovement(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.isSubmitting.set(false);
          this.moved.emit(record);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting.set(false);
          this.submitError.set(
            err?.error?.message || 'No se pudo registrar el movimiento de inventario.'
          );
        }
      });
  }

  close(): void {
    this.closed.emit();
  }
}
