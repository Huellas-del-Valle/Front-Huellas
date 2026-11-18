import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProductMovementDialogComponent } from './product-movement-dialog.component';
import { InventoryService } from '../../services/inventory.service';
import { InventoryProduct } from '../../models/inventory.model';

describe('ProductMovementDialogComponent', () => {
  let fixture: ComponentFixture<ProductMovementDialogComponent>;
  let component: ProductMovementDialogComponent;
  let inventoryServiceMock: {
    registerMovement: ReturnType<typeof vi.fn>;
  };

  const sampleProduct: InventoryProduct = {
    id: 'prod-1',
    sku: 'MED-001',
    name: 'Meloxicam Oral',
    category: 'MEDICAMENTO',
    supplierId: 'sup-1',
    unitPrice: 25000,
    currentStock: 8,
    minStock: 5
  };

  beforeEach(async () => {
    inventoryServiceMock = {
      registerMovement: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductMovementDialogComponent],
      providers: [{ provide: InventoryService, useValue: inventoryServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductMovementDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', sampleProduct);
    fixture.detectChanges();
  });

  it('should block SALIDA movement when quantity exceeds available stock', () => {
    component.form.patchValue({
      type: 'SALIDA',
      quantity: 12,
      batchNumber: 'LOTE-10',
      expirationDate: '2027-06-01',
      reason: 'Consumo hospitalización'
    });
    fixture.detectChanges();

    expect(component.exceedsAvailableStock()).toBe(true);
    component.onSubmit();
    expect(inventoryServiceMock.registerMovement).not.toHaveBeenCalled();
  });

  it('should allow valid ENTRADA movement with batchNumber and expirationDate', () => {
    inventoryServiceMock.registerMovement.mockReturnValue(
      of({
        id: 'mov-10',
        productId: 'prod-1',
        type: 'ENTRADA',
        quantity: 20,
        batchNumber: 'LOTE-20',
        expirationDate: '2027-12-31',
        reason: 'Compra factura 101',
        createdAt: '2026-11-18T19:00:00Z'
      })
    );

    const movedSpy = vi.fn();
    component.moved.subscribe(movedSpy);

    component.form.patchValue({
      type: 'ENTRADA',
      quantity: 20,
      batchNumber: 'LOTE-20',
      expirationDate: '2027-12-31',
      reason: 'Compra factura 101'
    });
    fixture.detectChanges();

    component.onSubmit();
    expect(inventoryServiceMock.registerMovement).toHaveBeenCalled();
    expect(movedSpy).toHaveBeenCalled();
  });
});
