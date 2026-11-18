import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InventoryService } from './inventory.service';
import { environment } from '../../../../environments/environment';
import {
  CreateMovementDto,
  CreateProductDto,
  CreateSupplierDto,
  InventoryAlertsResponse,
  Supplier
} from '../models/inventory.model';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InventoryService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch inventory products list', () => {
    service.getProducts().subscribe((products) => {
      expect(products.length).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/products`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should create a product with minimum safety stock', () => {
    const dto: CreateProductDto = {
      sku: 'MED-001',
      name: 'Meloxicam 1.5mg/ml',
      category: 'MEDICAMENTO',
      supplierId: 'sup-1',
      unitPrice: 38000,
      currentStock: 25,
      minStock: 10
    };

    service.createProduct(dto).subscribe((res) => {
      expect(res.id).toBe('prod-1');
      expect(res.minStock).toBe(10);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/products`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'prod-1', ...dto });
  });

  it('should update a product via PATCH', () => {
    service.updateProduct('prod-1', { currentStock: 30 }).subscribe((res) => {
      expect(res.currentStock).toBe(30);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/products/prod-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ currentStock: 30 });
    req.flush({ id: 'prod-1', currentStock: 30 });
  });

  it('should register an inventory movement with batchNumber and expirationDate', () => {
    const movement: CreateMovementDto = {
      productId: 'prod-1',
      type: 'ENTRADA',
      quantity: 50,
      reason: 'Compra según factura proveedor',
      batchNumber: 'LOTE-552',
      expirationDate: '2027-05-30'
    };

    service.registerMovement(movement).subscribe((res) => {
      expect(res.batchNumber).toBe('LOTE-552');
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/movements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(movement);
    req.flush({ id: 'mov-1', createdAt: '2026-11-18T18:00:00Z', ...movement });
  });

  it('should retrieve inventory alerts summary', () => {
    const mockAlerts: InventoryAlertsResponse = {
      summary: { totalLowStock: 2, totalNearExpiration: 1 },
      lowStock: [],
      nearExpiration: []
    };

    service.getAlerts().subscribe((alerts) => {
      expect(alerts.summary.totalLowStock).toBe(2);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/alerts`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAlerts);
  });

  it('should fetch suppliers list', () => {
    service.getSuppliers().subscribe((suppliers) => {
      expect(suppliers.length).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/suppliers`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should create a supplier', () => {
    const dto: CreateSupplierDto = {
      taxId: '900123456-1',
      name: 'Distribuidora Veterinaria del Valle',
      contactName: 'Carlos Gómez',
      phone: '3101234567',
      email: 'ventas@distrivalle.com'
    };

    service.createSupplier(dto).subscribe((res) => {
      expect(res.id).toBe('sup-1');
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/suppliers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'sup-1', ...dto });
  });

  it('should update a supplier via PATCH', () => {
    service.updateSupplier('sup-1', { phone: '3209876543' }).subscribe((res) => {
      expect(res.phone).toBe('3209876543');
    });

    const req = httpMock.expectOne(`${baseUrl}/inventory/suppliers/sup-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ phone: '3209876543' });
    req.flush({ id: 'sup-1', phone: '3209876543' });
  });
});
