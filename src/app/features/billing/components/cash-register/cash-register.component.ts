import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CashRegisterService } from '../../services/cash-register.service';
import {
  COLOMBIAN_DENOMINATIONS,
  CashMinorMovement,
  CashMovementType,
  calculateDenominationTotal,
  evaluateCashClosing
} from '../../models/billing.model';

@Component({
  selector: 'app-cash-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cash-register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly cashService = inject(CashRegisterService);
  private readonly destroyRef = inject(DestroyRef);

  readonly denominations = COLOMBIAN_DENOMINATIONS;

  readonly minorMovements = signal<readonly CashMinorMovement[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly isClosingModalOpen = signal<boolean>(false);
  readonly feedbackMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly denominationCounts = signal<Record<number, number>>({});
  readonly closingNotes = signal<string>('');

  readonly openForm = this.fb.nonNullable.group({
    openingAmount: [200000, [Validators.required, Validators.min(0)]]
  });

  readonly movementForm = this.fb.nonNullable.group({
    type: ['INGRESO' as CashMovementType, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly totalIngresos = computed(() =>
    this.minorMovements()
      .filter((m) => m.type === 'INGRESO')
      .reduce((acc, m) => acc + m.amount, 0)
  );

  readonly totalEgresos = computed(() =>
    this.minorMovements()
      .filter((m) => m.type === 'EGRESO')
      .reduce((acc, m) => acc + m.amount, 0)
  );

  readonly expectedCash = computed(() => {
    const base = this.cashService.currentSession()?.openingAmount ?? 0;
    return base + this.totalIngresos() - this.totalEgresos();
  });

  readonly physicalCount = computed(() =>
    calculateDenominationTotal(this.denominationCounts())
  );

  readonly closingEvaluation = computed(() =>
    evaluateCashClosing(this.expectedCash(), this.physicalCount())
  );

  ngOnInit(): void {
    if (!this.cashService.currentSession()) {
      this.cashService
        .getCurrentSession()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => undefined });
    }
  }

  onOpenRegister(): void {
    if (this.openForm.invalid) return;
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const amount = Number(this.openForm.getRawValue().openingAmount);
    this.cashService
      .openRegister(amount)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.minorMovements.set([]);
          this.feedbackMessage.set('Turno de caja abierto correctamente.');
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('No se pudo abrir la caja en el servidor.');
        }
      });
  }

  onAddMovement(): void {
    if (this.movementForm.invalid) {
      this.movementForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const raw = this.movementForm.getRawValue();

    this.cashService
      .registerMinorMovement({
        type: raw.type,
        amount: Number(raw.amount),
        description: raw.description.trim()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.minorMovements.update((list) => [created, ...list]);
          this.movementForm.reset({ type: 'INGRESO', amount: 0, description: '' });
          this.isSubmitting.set(false);
          this.feedbackMessage.set('Movimiento menor registrado en caja.');
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('No se pudo registrar el movimiento de caja.');
        }
      });
  }

  openClosingModal(): void {
    const initial: Record<number, number> = {};
    for (const d of this.denominations) {
      initial[d] = 0;
    }
    this.denominationCounts.set(initial);
    this.closingNotes.set('');
    this.isClosingModalOpen.set(true);
  }

  updateDenomination(denom: number, rawValue: string): void {
    const qty = Math.max(0, Math.floor(Number(rawValue) || 0));
    this.denominationCounts.update((prev) => ({ ...prev, [denom]: qty }));
  }

  onConfirmClose(): void {
    this.isSubmitting.set(true);
    const evalSummary = this.closingEvaluation();

    this.cashService
      .closeRegister({
        physicalCount: evalSummary.physicalCount,
        expectedCash: evalSummary.expectedCash,
        difference: evalSummary.difference,
        notes: this.closingNotes().trim() || undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isClosingModalOpen.set(false);
          this.feedbackMessage.set('Arqueo completado y caja cerrada.');
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('No se pudo cerrar el turno de caja.');
        }
      });
  }
}
