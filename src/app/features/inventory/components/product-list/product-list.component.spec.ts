import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ProductListComponent } from './product-list.component';
import { InventoryService } from '../../services/inventory.service';
import { InventoryProduct } from '../../models/inventory.model';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;

  const mockProducts: InventoryProduct[] = [
    {
      id: 'p-1',
      sku: 'MED-01',
      name: 'Cefalexina 500mg',
      category: 'MEDICAMENTO',
      supplierId: 's-1',
      unitPrice: 18000,
      currentStock: 4,
      minStock: 10,
      batchNumber: 'L-100',
      expirationDate: '2027-08-01'
    },
    {
      id: 'p-2',
      sku: 'INS-02',
      name: 'Jeringas 5ml',
      category: 'INSUMO',
      supplierId: 's-1',
      unitPrice: 800,
      currentStock: 0,
      minStock: 20
    },
    {
      id: 'p-3',
      sku: 'ALI-03',
      name: 'Dieta Renal 2kg',
      category: 'ALIMENTO',
      supplierId: 's-2',
      unitPrice: 65000,
      currentStock: 30,
      minStock: 5
    }
  ];

  beforeEach(async () => {
    const inventoryServiceMock = {
      getProducts: vi.fn().mockReturnValue(of(mockProducts)),
      getAlerts: vi.fn().mockReturnValue(
        of({
          summary: { totalLowStock: 1, totalNearExpiration: 0 },
          lowStock: [],
          nearExpiration: []
        })
      ),
      getSuppliers: vi.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should filter products by category and search query', () => {
    component.categoryFilter.set('MEDICAMENTO');
    fixture.detectChanges();

    expect(component.filteredProducts().length).toBe(1);
    expect(component.filteredProducts()[0].sku).toBe('MED-01');
  });

  it('should apply orange warning row for minStock and red critical row for out-of-stock', () => {
    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('tbody tr');

    expect(rows[0].getAttribute('data-severity')).toBe('WARNING');
    expect(rows[0].className).toContain('bg-amber-50');

    expect(rows[1].getAttribute('data-severity')).toBe('CRITICAL');
    expect(rows[1].className).toContain('bg-red-50');

    expect(rows[2].getAttribute('data-severity')).toBe('NORMAL');
  });
});
