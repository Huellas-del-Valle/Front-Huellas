import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { SuppliersComponent } from './suppliers.component';
import { InventoryService } from '../../services/inventory.service';

describe('SuppliersComponent', () => {
  let fixture: ComponentFixture<SuppliersComponent>;
  let component: SuppliersComponent;
  let inventoryServiceMock: {
    getSuppliers: ReturnType<typeof vi.fn>;
    getProducts: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inventoryServiceMock = {
      getSuppliers: vi.fn().mockReturnValue(of([])),
      getProducts: vi.fn().mockReturnValue(of([])),
      createSupplier: vi.fn(),
      updateSupplier: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SuppliersComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: inventoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuppliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should validate taxId NIT format and email', () => {
    component.form.patchValue({
      taxId: 'INVALIDO',
      name: 'VetPharma',
      contactName: 'Juan',
      phone: '3001234567',
      email: 'no-es-correo'
    });

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.taxId.invalid).toBe(true);
    expect(component.form.controls.email.invalid).toBe(true);
  });

  it('should create supplier when form is valid', () => {
    inventoryServiceMock.createSupplier.mockReturnValue(
      of({
        id: 'sup-10',
        taxId: '900888777-2',
        name: 'AgroVet Colombia',
        contactName: 'Ana Ruiz',
        phone: '3112223344',
        email: 'contacto@agrovet.co'
      })
    );

    component.form.patchValue({
      taxId: '900888777-2',
      name: 'AgroVet Colombia',
      contactName: 'Ana Ruiz',
      phone: '3112223344',
      email: 'contacto@agrovet.co'
    });

    component.onSubmit();
    expect(inventoryServiceMock.createSupplier).toHaveBeenCalled();
    expect(component.suppliers().length).toBe(1);
  });
});
