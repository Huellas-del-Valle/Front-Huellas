import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessDeniedComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  logoutAndSwitch(): void {
    this.authService.clearSession();
    void this.router.navigate(['/login']);
  }
}
