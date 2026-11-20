import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateMovementDto,
  CreateProductDto,
  CreateSupplierDto,
  InventoryAlertsResponse,
  InventoryMovementRecord,
  InventoryProduct,
  Supplier
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getProducts(): Observable<InventoryProduct[]> {
    return this.http.get<InventoryProduct[]>(`${this.apiUrl}/inventory/products`);
  }

  createProduct(payload: CreateProductDto): Observable<InventoryProduct> {
    return this.http.post<InventoryProduct>(`${this.apiUrl}/inventory/products`, payload);
  }

  updateProduct(
    id: string,
    payload: Partial<CreateProductDto>
  ): Observable<InventoryProduct> {
    return this.http.patch<InventoryProduct>(
      `${this.apiUrl}/inventory/products/${encodeURIComponent(id)}`,
      payload
    );
  }

  registerMovement(payload: CreateMovementDto): Observable<InventoryMovementRecord> {
    return this.http.post<InventoryMovementRecord>(
      `${this.apiUrl}/inventory/movements`,
      payload
    );
  }

  getAlerts(): Observable<InventoryAlertsResponse> {
    return this.http.get<InventoryAlertsResponse>(`${this.apiUrl}/inventory/alerts`);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.apiUrl}/inventory/suppliers`);
  }

  createSupplier(payload: CreateSupplierDto): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.apiUrl}/inventory/suppliers`, payload);
  }

  updateSupplier(
    id: string,
    payload: Partial<CreateSupplierDto>
  ): Observable<Supplier> {
    return this.http.patch<Supplier>(
      `${this.apiUrl}/inventory/suppliers/${encodeURIComponent(id)}`,
      payload
    );
  }
}
