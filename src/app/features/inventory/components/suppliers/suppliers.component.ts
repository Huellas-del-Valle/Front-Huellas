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
import { InventoryService } from '../../services/inventory.service';
import { CreateSupplierDto, InventoryProduct, Supplier } from '../../models/inventory.model';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './suppliers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly suppliers = signal<readonly Supplier[]>([]);
  readonly products = signal<readonly InventoryProduct[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly isModalOpen = signal<boolean>(false);
  readonly editingSupplier = signal<Supplier | null>(null);
  readonly selectedSupplierProducts = signal<Supplier | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly feedbackMessage = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  readonly filteredSuppliers = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return this.suppliers();
    return this.suppliers().filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.taxId.toLowerCase().includes(q) ||
        s.contactName.toLowerCase().includes(q)
    );
  });

  readonly associatedProducts = computed(() => {
    const target = this.selectedSupplierProducts();
    if (!target) return [];
    return this.products().filter((p) => p.supplierId === target.id);
  });

  readonly form = this.fb.nonNullable.group({
    taxId: ['', [Validators.required, Validators.pattern(/^[0-9]{6,12}(-[0-9])?$/)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    contactName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    email: ['', [Validators.required, Validators.email]],
    address: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.inventoryService
      .getSuppliers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.suppliers.set(list);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });

    this.inventoryService
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (prods) => this.products.set(prods),
        error: () => this.products.set([])
      });
  }

  countProductsForSupplier(supplierId: string): number {
    return this.products().filter((p) => p.supplierId === supplierId).length;
  }

  openCreateModal(): void {
    this.editingSupplier.set(null);
    this.submitError.set(null);
    this.form.reset({ taxId: '', name: '', contactName: '', phone: '', email: '', address: '' });
    this.isModalOpen.set(true);
  }

  openEditModal(supplier: Supplier): void {
    this.editingSupplier.set(supplier);
    this.submitError.set(null);
    this.form.patchValue({
      taxId: supplier.taxId,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address ?? ''
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingSupplier.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const payload: CreateSupplierDto = {
      taxId: raw.taxId.trim(),
      name: raw.name.trim(),
      contactName: raw.contactName.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      address: raw.address.trim() || undefined
    };

    const existing = this.editingSupplier();
    const request$ = existing
      ? this.inventoryService.updateSupplier(existing.id, payload)
      : this.inventoryService.createSupplier(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.suppliers.update((list) =>
          existing ? list.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...list]
        );
        this.isSubmitting.set(false);
        this.closeModal();
        this.feedbackMessage.set(
          `Proveedor "${saved.name}" ${existing ? 'actualizado' : 'registrado'} correctamente.`
        );
      },
      error: (err: { error?: { message?: string } }) => {
        this.isSubmitting.set(false);
        this.submitError.set(err?.error?.message || 'No se pudo guardar el proveedor.');
      }
    });
  }
}
