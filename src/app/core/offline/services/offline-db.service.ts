import { Injectable } from '@angular/core';
import { OfflineActionType, PendingSyncItem } from '../models/offline-sync.model';

export const OFFLINE_DB_NAME = 'huellas_offline_db';
export const OFFLINE_DB_VERSION = 1;
export const SYNC_QUEUE_STORE = 'pendingSyncQueue';

@Injectable({
  providedIn: 'root'
})
export class OfflineDbService {
  private memoryFallback = new Map<number, PendingSyncItem>();
  private memoryAutoId = 1;

  private isIndexedDbAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          db.createObjectStore(SYNC_QUEUE_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async enqueueAction(
    actionType: OfflineActionType,
    payload: Readonly<Record<string, unknown>>
  ): Promise<PendingSyncItem> {
    const newItem: Omit<PendingSyncItem, 'id'> = {
      actionType,
      localTimestamp: new Date().toISOString(),
      payload,
      retryCount: 0
    };

    if (!this.isIndexedDbAvailable()) {
      const id = this.memoryAutoId++;
      const stored: PendingSyncItem = { id, ...newItem };
      this.memoryFallback.set(id, stored);
      return stored;
    }

    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const req = store.add(newItem);

      req.onsuccess = () => {
        const generatedId = Number(req.result);
        resolve({ id: generatedId, ...newItem });
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async getAllPending(): Promise<PendingSyncItem[]> {
    if (!this.isIndexedDbAvailable()) {
      return Array.from(this.memoryFallback.values());
    }

    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const req = store.getAll();

      req.onsuccess = () => resolve((req.result as PendingSyncItem[]) ?? []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async removeByIds(ids: readonly number[]): Promise<void> {
    if (ids.length === 0) return;

    if (!this.isIndexedDbAvailable()) {
      for (const id of ids) {
        this.memoryFallback.delete(id);
      }
      return;
    }

    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);

      for (const id of ids) {
        store.delete(id);
      }

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async incrementRetry(id: number, errorMessage: string): Promise<void> {
    if (!this.isIndexedDbAvailable()) {
      const existing = this.memoryFallback.get(id);
      if (existing) {
        this.memoryFallback.set(id, {
          ...existing,
          retryCount: existing.retryCount + 1,
          lastError: errorMessage
        });
      }
      return;
    }

    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const current = getReq.result as PendingSyncItem | undefined;
        if (current) {
          store.put({
            ...current,
            retryCount: current.retryCount + 1,
            lastError: errorMessage
          });
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.isIndexedDbAvailable()) {
      this.memoryFallback.clear();
      return;
    }

    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      tx.objectStore(SYNC_QUEUE_STORE).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}
