import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryAlertsResponse } from '../../models/inventory.model';

@Component({
  selector: 'app-inventory-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-alerts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAlertsComponent {
  readonly alerts = input<InventoryAlertsResponse | null>(null);
  readonly outOfStockCount = input<number>(0);
}
