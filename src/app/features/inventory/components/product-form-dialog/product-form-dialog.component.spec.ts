import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProductFormDialogComponent } from './product-form-dialog.component';
import { InventoryService } from '../../services/inventory.service';
import { InventoryProduct, Supplier } from '../../models/inventory.model';

describe('ProductFormDialogComponent', () => {
  let fixture: ComponentFixture<ProductFormDialogComponent>;
  let component: ProductFormDialogComponent;
  let inventoryServiceMock: {
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
  };

  const sampleSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      taxId: '900123456-1',
      name: 'Distribuidora Valle',
      contactName: 'Carlos Gómez',
      phone: '3101234567',
      email: 'carlos@valle.com'
    }
  ];

  beforeEach(async () => {
    inventoryServiceMock = {
      createProduct: vi.fn(),
      updateProduct: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductFormDialogComponent],
      providers: [{ provide: InventoryService, useValue: inventoryServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('suppliers', sampleSuppliers);
    fixture.detectChanges();
  });

  it('should initialize form as invalid when empty and block submission', () => {
    component.onSubmit();
    expect(component.form.invalid).toBe(true);
    expect(inventoryServiceMock.createProduct).not.toHaveBeenCalled();
  });

  it('should create a new product when form is filled and submitted in create mode', () => {
    const createdProd: InventoryProduct = {
      id: 'prod-new',
      sku: 'MED-099',
      name: 'Ketamina 10%',
      category: 'MEDICAMENTO',
      supplierId: 'sup-1',
      unitPrice: 45000,
      currentStock: 15,
      minStock: 5
    };

    inventoryServiceMock.createProduct.mockReturnValue(of(createdProd));
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.form.patchValue({
      sku: 'MED-099',
      name: 'Ketamina 10%',
      category: 'MEDICAMENTO',
      supplierId: 'sup-1',
      unitPrice: 45000,
      currentStock: 15,
      minStock: 5
    });
    fixture.detectChanges();

    component.onSubmit();
    expect(inventoryServiceMock.createProduct).toHaveBeenCalled();
    expect(savedSpy).toHaveBeenCalledWith(createdProd);
  });
});
