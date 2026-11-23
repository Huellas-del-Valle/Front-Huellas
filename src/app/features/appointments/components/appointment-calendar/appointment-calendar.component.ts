import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppointmentsService } from '../../services/appointments.service';
import {
  APPOINTMENT_STATUS_CONFIG,
  AVAILABLE_PATIENTS,
  AVAILABLE_VETERINARIANS,
  Appointment,
  AppointmentStatus,
  CalendarViewMode,
  INITIAL_MOCK_APPOINTMENTS,
  STANDARD_TIME_SLOTS,
  VeterinarianSummary
} from '../../models/appointment.model';
import { SessionService } from '../../../../core/services/session.service';
import { AppointmentFormDialogComponent } from '../appointment-form-dialog/appointment-form-dialog.component';

export interface CalendarDay {
  readonly date: Date;
  readonly dateString: string; // YYYY-MM-DD
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly appointments: readonly Appointment[];
}

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [CommonModule, AppointmentFormDialogComponent],
  templateUrl: './appointment-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentCalendarComponent implements OnInit {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly sessionService = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly appointments = signal<readonly Appointment[]>([]);
  readonly selectedDate = signal<Date>(new Date('2026-10-22T08:00:00Z'));
  readonly viewMode = signal<CalendarViewMode>('MONTH');
  readonly selectedVeterinarianFilter = signal<string>('ALL');

  readonly isLoading = signal<boolean>(true);
  readonly feedbackMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Estados de modales y menú contextual
  readonly isFormModalOpen = signal<boolean>(false);
  readonly selectedAppointmentForEdit = signal<Appointment | null>(null);
  readonly preselectedDateForNew = signal<string | null>(null);
  readonly activeContextMenuAppointment = signal<Appointment | null>(null);

  // Catálogos
  readonly veterinarians: readonly VeterinarianSummary[] = AVAILABLE_VETERINARIANS;
  readonly statusConfigs = APPOINTMENT_STATUS_CONFIG;
  readonly timeSlots = STANDARD_TIME_SLOTS;

  // Contadores reactivos para métricas rápidas
  readonly pendingAppointmentsCount = computed(() =>
    this.appointments().filter((a) => a.status === 'PENDIENTE').length
  );
  readonly confirmedAppointmentsCount = computed(() =>
    this.appointments().filter((a) => a.status === 'CONFIRMADA').length
  );
  readonly attendedAppointmentsCount = computed(() =>
    this.appointments().filter((a) => a.status === 'ATENDIDA').length
  );

  // Citas filtradas por veterinario
  readonly filteredAppointments = computed(() => {
    const vetId = this.selectedVeterinarianFilter();
    const all = this.appointments();
    if (vetId === 'ALL') {
      return all;
    }
    return all.filter((a) => a.veterinarianId === vetId);
  });

  // Título dinámico del rango según la vista
  readonly viewTitle = computed(() => {
    const current = this.selectedDate();
    const mode = this.viewMode();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (mode === 'MONTH') {
      return `${monthNames[current.getUTCMonth()]} ${current.getUTCFullYear()}`;
    }

    if (mode === 'WEEK') {
      const weekDays = this.getWeekDays(current);
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.getDate()} ${monthNames[start.getMonth()].substring(0, 3)} - ${end.getDate()} ${monthNames[end.getMonth()].substring(0, 3)} ${end.getFullYear()}`;
    }

    // DAY
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${dayNames[current.getUTCDay()]}, ${current.getUTCDate()} de ${monthNames[current.getUTCMonth()]} de ${current.getUTCFullYear()}`;
  });

  // Generación de días para la vista mensual (42 celdas)
  readonly monthGridDays = computed<readonly CalendarDay[]>(() => {
    const current = this.selectedDate();
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth();

    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));

    // Determinar día de inicio de semana (0=Dom, 1=Lun...)
    let startDayOfWeek = firstDayOfMonth.getUTCDay();
    // Ajustar a semana iniciando en Lunes (0=Lun, ..., 6=Dom)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: CalendarDay[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const appts = this.filteredAppointments();

    // Días del mes anterior para rellenar
    const prevMonthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(Date.UTC(year, month - 1, dayNum));
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        appointments: appts.filter((a) => a.startDateTime.startsWith(dateStr))
      });
    }

    // Días del mes actual
    for (let dayNum = 1; dayNum <= lastDayOfMonth.getUTCDate(); dayNum++) {
      const d = new Date(Date.UTC(year, month, dayNum));
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        appointments: appts.filter((a) => a.startDateTime.startsWith(dateStr))
      });
    }

    // Días del siguiente mes para completar 35 o 42 celdas
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(Date.UTC(year, month + 1, dayNum));
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        appointments: appts.filter((a) => a.startDateTime.startsWith(dateStr))
      });
    }

    return days;
  });

  // Generación de días para la vista semanal (7 días)
  readonly weekDays = computed<readonly CalendarDay[]>(() => {
    const current = this.selectedDate();
    const rawWeek = this.getWeekDays(current);
    const todayStr = new Date().toISOString().split('T')[0];
    const appts = this.filteredAppointments();

    return rawWeek.map((d) => {
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: d,
        dateString: dateStr,
        dayNumber: d.getUTCDate(),
        isCurrentMonth: d.getUTCMonth() === current.getUTCMonth(),
        isToday: dateStr === todayStr,
        appointments: appts.filter((a) => a.startDateTime.startsWith(dateStr))
      };
    });
  });

  // Citas del día seleccionado para la vista diaria
  readonly dayAppointments = computed(() => {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    return this.filteredAppointments().filter((a) => a.startDateTime.startsWith(dateStr));
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.appointmentsService
      .getAppointments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.appointments.set(data && data.length > 0 ? data : INITIAL_MOCK_APPOINTMENTS);
          this.isLoading.set(false);
        },
        error: () => {
          // Fallback a los datos mock si el backend local no está corriendo
          this.appointments.set(INITIAL_MOCK_APPOINTMENTS);
          this.isLoading.set(false);
        }
      });
  }

  setViewMode(mode: CalendarViewMode): void {
    this.viewMode.set(mode);
    this.closeContextMenu();
  }

  setVeterinarianFilter(vetId: string): void {
    this.selectedVeterinarianFilter.set(vetId);
    this.closeContextMenu();
  }

  goToPrevious(): void {
    this.closeContextMenu();
    const current = new Date(this.selectedDate());
    const mode = this.viewMode();

    if (mode === 'MONTH') {
      current.setUTCMonth(current.getUTCMonth() - 1);
    } else if (mode === 'WEEK') {
      current.setUTCDate(current.getUTCDate() - 7);
    } else {
      current.setUTCDate(current.getUTCDate() - 1);
    }

    this.selectedDate.set(current);
  }

  goToNext(): void {
    this.closeContextMenu();
    const current = new Date(this.selectedDate());
    const mode = this.viewMode();

    if (mode === 'MONTH') {
      current.setUTCMonth(current.getUTCMonth() + 1);
    } else if (mode === 'WEEK') {
      current.setUTCDate(current.getUTCDate() + 7);
    } else {
      current.setUTCDate(current.getUTCDate() + 1);
    }

    this.selectedDate.set(current);
  }

  goToToday(): void {
    this.closeContextMenu();
    this.selectedDate.set(new Date('2026-10-22T08:00:00Z'));
  }

  openCreateModal(dateStr?: string): void {
    this.closeContextMenu();
    this.selectedAppointmentForEdit.set(null);
    this.preselectedDateForNew.set(dateStr || this.selectedDate().toISOString().split('T')[0]);
    this.isFormModalOpen.set(true);
  }

  openRescheduleModal(apt: Appointment): void {
    this.closeContextMenu();
    this.selectedAppointmentForEdit.set(apt);
    this.preselectedDateForNew.set(null);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedAppointmentForEdit.set(null);
  }

  onAppointmentSaved(savedApt: Appointment): void {
    const list = this.appointments();
    const idx = list.findIndex((a) => a.id === savedApt.id);

    if (idx >= 0) {
      const updated = [...list];
      updated[idx] = savedApt;
      this.appointments.set(updated);
      this.feedbackMessage.set(`Cita de "${savedApt.petName || 'Paciente'}" reprogramada con éxito.`);
    } else {
      this.appointments.set([savedApt, ...list]);
      this.feedbackMessage.set(`Cita médica agendada exitosamente.`);
    }

    if (savedApt.startDateTime) {
      this.selectedDate.set(new Date(savedApt.startDateTime));
    }

    this.closeFormModal();
  }

  toggleContextMenu(apt: Appointment, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeContextMenuAppointment()?.id === apt.id) {
      this.closeContextMenu();
    } else {
      this.activeContextMenuAppointment.set(apt);
    }
  }

  closeContextMenu(): void {
    this.activeContextMenuAppointment.set(null);
  }

  /**
   * Cambia el estado de una cita médica desde el menú contextual
   */
  updateStatus(apt: Appointment, newStatus: AppointmentStatus): void {
    this.appointmentsService
      .updateAppointmentStatus(apt.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.applyStatusChange(updated, newStatus);
        },
        error: () => {
          // Actualización optimista local
          const updated = { ...apt, status: newStatus };
          this.applyStatusChange(updated, newStatus);
        }
      });
  }

  private applyStatusChange(apt: Appointment, newStatus: AppointmentStatus): void {
    const list = this.appointments();
    const updated = list.map((a) => (a.id === apt.id ? { ...a, status: newStatus } : a));
    this.appointments.set(updated);
    this.closeContextMenu();
    this.feedbackMessage.set(
      `Estado de la cita actualizado a "${this.statusConfigs[newStatus].label}".`
    );
  }

  dismissFeedback(): void {
    this.feedbackMessage.set(null);
  }

  getStartTime(apt: Appointment): string {
    if (apt.timeSlot) {
      return apt.timeSlot.split(' ')[0] || apt.timeSlot;
    }
    const d = new Date(apt.startDateTime);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  selectDayAndSwitchToDayView(date: Date): void {
    this.selectedDate.set(new Date(date));
    this.setViewMode('DAY');
  }

  private getWeekDays(referenceDate: Date): Date[] {
    const d = new Date(referenceDate);
    let day = d.getUTCDay();
    day = day === 0 ? 6 : day - 1; // 0=Lunes

    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day);

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setUTCDate(monday.getUTCDate() + i);
      week.push(nextDay);
    }
    return week;
  }
}
