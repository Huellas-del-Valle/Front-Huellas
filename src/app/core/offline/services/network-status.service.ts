import { Injectable, DestroyRef, inject, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private readonly destroyRef = inject(DestroyRef);

  readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  readonly isOffline = computed(() => !this.isOnline());

  readonly lastStatusChangeAt = signal<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      const handleOnline = (): void => {
        this.isOnline.set(true);
        this.lastStatusChangeAt.set(new Date().toISOString());
      };

      const handleOffline = (): void => {
        this.isOnline.set(false);
        this.lastStatusChangeAt.set(new Date().toISOString());
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    }
  }
}
