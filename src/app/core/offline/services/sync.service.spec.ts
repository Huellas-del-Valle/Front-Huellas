import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncService } from './sync.service';
import { OfflineDbService } from './offline-db.service';
import { NetworkStatusService } from './network-status.service';
import { environment } from '../../../../environments/environment';

describe('SyncService', () => {
  let syncService: SyncService;
  let offlineDb: OfflineDbService;
  let networkStatus: NetworkStatusService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        SyncService,
        OfflineDbService,
        NetworkStatusService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    offlineDb = TestBed.inject(OfflineDbService);
    await offlineDb.clearAll();
    networkStatus = TestBed.inject(NetworkStatusService);
    syncService = TestBed.inject(SyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should enqueue operations locally when offline and dispatch batch upon reconnection', async () => {
    networkStatus.isOnline.set(false);

    await syncService.queueOfflineOperation('CREATE_CONSULTATION', {
      petId: 'pet-101',
      diagnosis: 'Diagnóstico registrado fuera de línea',
      treatment: 'Tratamiento de contingencia'
    });

    expect(syncService.pendingCount()).toBe(1);
    httpMock.expectNone(`${baseUrl}/sync/batch`);

    // Simular reconexión
    networkStatus.isOnline.set(true);
    const syncPromise = syncService.syncPendingQueue();

    // Permitir que se resuelva la lectura asíncrona de IndexedDB antes del POST
    await new Promise((r) => setTimeout(r, 10));

    const req = httpMock.expectOne(`${baseUrl}/sync/batch`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.pendingActions.length).toBe(1);
    expect(req.request.body.pendingActions[0].actionType).toBe('CREATE_CONSULTATION');

    req.flush({
      processedCount: 1,
      conflictsCount: 0,
      status: 'COMPLETED',
      syncedAt: '2026-11-19T18:05:00Z'
    });

    await syncPromise;
    expect(syncService.pendingCount()).toBe(0);
    expect(syncService.lastSyncedAt()).toBe('2026-11-19T18:05:00Z');
  });

  it('should retain queued items in local storage when sync endpoint fails', async () => {
    networkStatus.isOnline.set(false);
    await syncService.queueOfflineOperation('INVENTORY_MOVEMENT', {
      productId: 'prod-1',
      quantity: 3
    });

    networkStatus.isOnline.set(true);
    const syncPromise = syncService.syncPendingQueue();
    await new Promise((r) => setTimeout(r, 10));

    const req = httpMock.expectOne(`${baseUrl}/sync/batch`);
    req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });

    await syncPromise;
    expect(syncService.pendingCount()).toBe(1);
    expect(syncService.syncError()).not.toBeNull();
  });
});
