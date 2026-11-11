import {
  Directive,
  Input,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/auth.models';

/**
 * Directiva estructural personalizada para control granular del DOM basado en RBAC (*hasRole)
 *
 * Uso en templates:
 *   <button *hasRole="'ADMIN'">Eliminar Registro</button>
 *   <div *hasRole="['ADMIN', 'VETERINARIO']">Historia Clínica Reservada</div>
 *
 * Si el usuario no tiene los permisos requeridos, el elemento es removido físicamente del DOM,
 * evitando fugas de información y accesos visuales a acciones no autorizadas.
 */
@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective implements OnDestroy {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private expectedRoles: UserRole[] = [];
  private hasView = false;

  constructor() {
    // Reacciona a cambios en el estado de autenticación o cambio de rol del usuario
    effect(() => {
      // Registrar dependencia reactiva sobre el rol y estado de autenticación
      this.authService.role();
      this.authService.isAuthenticated();
      this.updateView();
    });
  }

  @Input('hasRole')
  set hasRole(
    roles:
      | UserRole
      | readonly UserRole[]
      | UserRole[]
      | string
      | readonly string[]
      | string[]
      | undefined
      | null
  ) {
    if (!roles) {
      this.expectedRoles = [];
    } else if (Array.isArray(roles)) {
      this.expectedRoles = [...roles] as UserRole[];
    } else {
      this.expectedRoles = [roles as UserRole];
    }
    this.updateView();
  }

  private updateView(): void {
    const isAuthorized =
      this.expectedRoles.length > 0 ? this.authService.hasRole(this.expectedRoles) : false;

    if (isAuthorized && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isAuthorized && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  ngOnDestroy(): void {
    this.viewContainer.clear();
  }
}
