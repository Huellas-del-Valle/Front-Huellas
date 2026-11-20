import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkStatusService } from '../../services/network-status.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfflineBannerComponent {
  readonly networkStatus = inject(NetworkStatusService);
  readonly syncService = inject(SyncService);

  triggerManualSync(): void {
    void this.syncService.syncPendingQueue();
  }
}
