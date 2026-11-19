import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineDbService } from './offline-db.service';

describe('OfflineDbService', () => {
  let service: OfflineDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OfflineDbService]
    });
    service = TestBed.inject(OfflineDbService);
  });

  it('should enqueue and retrieve pending actions using fallback or indexedDB', async () => {
    await service.clearAll();

    const item = await service.enqueueAction('CREATE_CONSULTATION', {
      petId: 'pet-123',
      anamnesis: 'Paciente con tos leve'
    });

    expect(item.id).toBeDefined();
    expect(item.actionType).toBe('CREATE_CONSULTATION');
    expect(item.retryCount).toBe(0);

    const pending = await service.getAllPending();
    expect(pending.length).toBe(1);
    expect(pending[0].actionType).toBe('CREATE_CONSULTATION');
  });

  it('should increment retry count with error message and remove by IDs', async () => {
    await service.clearAll();

    const item = await service.enqueueAction('REGISTER_VACCINATION', {
      petId: 'pet-123',
      name: 'Antirrábica'
    });

    const id = item.id!;
    await service.incrementRetry(id, 'Network timeout');

    const pendingAfterRetry = await service.getAllPending();
    const updated = pendingAfterRetry.find((p) => p.id === id);
    expect(updated?.retryCount).toBe(1);
    expect(updated?.lastError).toBe('Network timeout');

    await service.removeByIds([id]);
    const pendingAfterRemove = await service.getAllPending();
    expect(pendingAfterRemove.length).toBe(0);
  });
});
