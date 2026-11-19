export type OfflineActionType =
  | 'CREATE_CONSULTATION'
  | 'REGISTER_VACCINATION'
  | 'INVENTORY_MOVEMENT'
  | 'CREATE_INVOICE';

export interface PendingSyncItem {
  readonly id?: number;
  readonly actionType: OfflineActionType;
  readonly localTimestamp: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly retryCount: number;
  readonly lastError?: string;
}

export interface SyncBatchActionPayload {
  readonly actionType: OfflineActionType;
  readonly localTimestamp: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface SyncBatchRequestDto {
  readonly pendingActions: readonly SyncBatchActionPayload[];
}

export interface SyncBatchResponseDto {
  readonly processedCount: number;
  readonly conflictsCount: number;
  readonly status: 'COMPLETED' | 'PARTIAL';
  readonly syncedAt: string;
}
