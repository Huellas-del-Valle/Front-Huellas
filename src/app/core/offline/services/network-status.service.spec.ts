import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NetworkStatusService]
    });
    service = TestBed.inject(NetworkStatusService);
  });

  it('should switch to offline when browser fires offline event and back to online on reconnect', () => {
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
    expect(service.isOffline()).toBe(true);
    expect(service.lastStatusChangeAt()).not.toBeNull();

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
    expect(service.isOffline()).toBe(false);
  });
});
