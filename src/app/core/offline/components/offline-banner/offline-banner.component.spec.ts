import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineBannerComponent } from './offline-banner.component';
import { NetworkStatusService } from '../../services/network-status.service';
import { SyncService } from '../../services/sync.service';
import { OfflineDbService } from '../../services/offline-db.service';

describe('OfflineBannerComponent', () => {
  let fixture: ComponentFixture<OfflineBannerComponent>;
  let networkStatus: NetworkStatusService;
  let syncService: SyncService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineBannerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    const db = TestBed.inject(OfflineDbService);
    await db.clearAll();

    networkStatus = TestBed.inject(NetworkStatusService);
    syncService = TestBed.inject(SyncService);

    fixture = TestBed.createComponent(OfflineBannerComponent);
    fixture.detectChanges();
  });

  it('should be hidden when online with zero pending operations', () => {
    networkStatus.isOnline.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="offline-contingency-banner"]')).toBeNull();
    expect(el.querySelector('[data-testid="sync-progress-banner"]')).toBeNull();
  });

  it('should display contingency banner and pending count when offline', async () => {
    networkStatus.isOnline.set(false);
    await syncService.queueOfflineOperation('CREATE_CONSULTATION', { petId: 'p-1' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const banner = el.querySelector('[data-testid="offline-contingency-banner"]');
    const badge = el.querySelector('[data-testid="offline-pending-count"]');

    expect(banner).toBeTruthy();
    expect(badge?.textContent).toContain('En cola: 1');
  });
});
