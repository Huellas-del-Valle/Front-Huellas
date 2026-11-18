export type VaccinationType = 'VACUNA' | 'DESPARASITANTE';

export type ValidityStatus = 'VIGENTE' | 'PROXIMA_A_VENCER' | 'VENCIDA';

export interface VaccinationRecord {
  readonly id: string;
  readonly type: VaccinationType;
  readonly name: string;
  readonly batchNumber: string;
  readonly applicationDate: string;
  readonly nextDueDate: string;
  readonly notified: boolean;
  readonly petId?: string;
}

export interface CreateVaccinationDto {
  readonly type: VaccinationType;
  readonly name: string;
  readonly batchNumber: string;
  readonly applicationDate: string;
  readonly nextDueDate: string;
}

export interface ValidityEvaluation {
  readonly status: ValidityStatus;
  readonly label: string;
  readonly daysRemaining: number;
}

export const EXPIRING_SOON_THRESHOLD_DAYS = 30;

export function evaluateVaccinationValidity(
  nextDueDateStr: string,
  referenceDate: Date = new Date()
): ValidityEvaluation {
  const [year, month, day] = nextDueDateStr.split('-').map(Number);
  const dueDate = new Date(year, (month || 1) - 1, day || 1);
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round((dueDate.getTime() - today.getTime()) / msPerDay);

  if (daysRemaining < 0) {
    return {
      status: 'VENCIDA',
      label: `Vencida hace ${Math.abs(daysRemaining)} día(s)`,
      daysRemaining
    };
  }

  if (daysRemaining <= EXPIRING_SOON_THRESHOLD_DAYS) {
    return {
      status: 'PROXIMA_A_VENCER',
      label: daysRemaining === 0 ? 'Vence hoy' : `Vence en ${daysRemaining} día(s)`,
      daysRemaining
    };
  }

  return {
    status: 'VIGENTE',
    label: `Vigente (${daysRemaining} días)`,
    daysRemaining
  };
}
