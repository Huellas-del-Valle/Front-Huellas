import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OfflineDbService } from './offline-db.service';
import { NetworkStatusService } from './network-status.service';
import {
  OfflineActionType,
  PendingSyncItem,
  SyncBatchRequestDto,
  SyncBatchResponseDto
} from '../models/offline-sync.model';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly offlineDb = inject(OfflineDbService);
  private readonly networkStatus = inject(NetworkStatusService);
  private readonly apiUrl = environment.apiUrl;

  readonly pendingItems = signal<readonly PendingSyncItem[]>([]);
  readonly pendingCount = computed(() => this.pendingItems().length);
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncedAt = signal<string | null>(null);
  readonly syncError = signal<string | null>(null);

  constructor() {
    void this.refreshQueue();

    effect(() => {
      const online = this.networkStatus.isOnline();
      const count = this.pendingCount();
      if (online && count > 0 && !this.isSyncing()) {
        void this.syncPendingQueue();
      }
    });
  }

  async refreshQueue(): Promise<void> {
    const items = await this.offlineDb.getAllPending();
    this.pendingItems.set(items);
  }

  async queueOfflineOperation(
    actionType: OfflineActionType,
    payload: Readonly<Record<string, unknown>>
  ): Promise<PendingSyncItem> {
    const stored = await this.offlineDb.enqueueAction(actionType, payload);
    await this.refreshQueue();
    return stored;
  }

  async syncPendingQueue(): Promise<void> {
    if (this.isSyncing() || this.networkStatus.isOffline()) {
      return;
    }

    const items = await this.offlineDb.getAllPending();
    if (items.length === 0) {
      this.pendingItems.set([]);
      return;
    }

    this.isSyncing.set(true);
    this.syncError.set(null);

    const requestBody: SyncBatchRequestDto = {
      pendingActions: items.map((item) => ({
        actionType: item.actionType,
        localTimestamp: item.localTimestamp,
        payload: item.payload
      }))
    };

    try {
      const response = await firstValueFrom(
        this.http.post<SyncBatchResponseDto>(`${this.apiUrl}/sync/batch`, requestBody)
      );

      const syncedIds = items
        .map((i) => i.id)
        .filter((id): id is number => typeof id === 'number');

      await this.offlineDb.removeByIds(syncedIds);
      this.lastSyncedAt.set(response.syncedAt || new Date().toISOString());
      await this.refreshQueue();
    } catch {
      this.syncError.set(
        'Error al sincronizar el lote pendiente; los registros permanecen seguros en almacenamiento local.'
      );
      for (const item of items) {
        if (typeof item.id === 'number') {
          await this.offlineDb.incrementRetry(item.id, 'Sync batch failed');
        }
      }
      await this.refreshQueue();
    } finally {
      this.isSyncing.set(false);
    }
  }
}
