import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly returnUrl = signal<string>(
    this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard'
  );

  loginAs(role: UserRole): void {
    const roleNames: Record<UserRole, string> = {
      ADMIN: 'Dr. Roberto Mendoza (Admin)',
      VETERINARIO: 'Dra. Camila Morales (Veterinaria)',
      RECEPCIONISTA: 'Carlos Restrepo (Recepción)'
    };

    this.authService.setMockSession(
      role,
      roleNames[role],
      `jwt-token-${role.toLowerCase()}-${Date.now()}`
    );

    const destination = this.returnUrl() || '/dashboard';
    void this.router.navigateByUrl(destination);
  }
}
