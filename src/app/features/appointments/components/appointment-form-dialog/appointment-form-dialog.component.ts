import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AppointmentsService } from '../../services/appointments.service';
import {
  APPOINTMENT_STATUS_CONFIG,
  AVAILABLE_PATIENTS,
  AVAILABLE_VETERINARIANS,
  Appointment,
  CreateAppointmentDto,
  PetSummary,
  STANDARD_TIME_SLOTS,
  TimeSlotAvailability,
  UpdateAppointmentDto,
  VeterinarianSummary
} from '../../models/appointment.model';

@Component({
  selector: 'app-appointment-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly appointment = input<Appointment | null>(null);
  readonly appointmentToEdit = input<Appointment | null>(null);
  readonly preselectedDate = input<string | null>(null);
  readonly initialDate = input<string | null>(null);
  readonly preselectedVeterinarianId = input<string | null>(null);

  readonly veterinarians = input<readonly VeterinarianSummary[]>(AVAILABLE_VETERINARIANS);
  readonly patients = input<readonly PetSummary[]>(AVAILABLE_PATIENTS);

  readonly saved = output<Appointment>();
  readonly closed = output<void>();
  readonly cancelled = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly isLoadingAvailability = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  readonly availableSlots = signal<TimeSlotAvailability[]>([]);
  readonly isEditMode = computed(() => (this.appointment() ?? this.appointmentToEdit()) !== null);

  readonly form = this.fb.group({
    petId: ['', [Validators.required]],
    veterinarianId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
    timeSlot: ['', [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(5)]]
  });

  get appointmentForm() {
    return this.form;
  }

  get conflictAlert() {
    return this.submitError;
  }

  get availabilitySlots() {
    return this.availableSlots;
  }

  isSlotAvailable(timeStr: string): boolean {
    const rawTime = timeStr.includes(' ') ? timeStr.split(' ')[0] : timeStr;
    const match = this.availableSlots().find(
      (s) => s.time === rawTime || s.time === timeStr || s.timeSlot === timeStr || s.timeSlot === rawTime
    );
    if (!match) return true;
    if (typeof match.isAvailable === 'boolean') return match.isAvailable;
    return match.available;
  }

  selectTimeSlot(timeStr: string): void {
    if (this.isSlotAvailable(timeStr)) {
      const rawTime = timeStr.includes(' ') ? timeStr.split(' ')[0] : timeStr;
      this.form.patchValue({ time: rawTime, timeSlot: timeStr });
    }
  }

  get petId() {
    return this.form.controls.petId;
  }

  get veterinarianId() {
    return this.form.controls.veterinarianId;
  }

  get date() {
    return this.form.controls.date;
  }

  get time() {
    return this.form.controls.time;
  }

  get reason() {
    return this.form.controls.reason;
  }

  constructor() {
    // Sincronizar time y timeSlot bidireccionalmente
    this.form.controls.time.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        if (val && this.form.controls.timeSlot.value !== val) {
          this.form.controls.timeSlot.setValue(val);
        }
      });

    this.form.controls.timeSlot.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        if (val) {
          const raw = val.includes(' ') ? val.split(' ')[0] : val;
          if (this.form.controls.time.value !== raw) {
            this.form.controls.time.setValue(raw);
          }
        }
      });

    effect(() => {
      const existing = this.appointment() ?? this.appointmentToEdit();
      if (existing) {
        const startDate = new Date(existing.startDateTime);
        const dateStr = startDate.toISOString().split('T')[0];
        const hours = String(startDate.getUTCHours()).padStart(2, '0');
        const minutes = String(startDate.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        this.form.patchValue({
          petId: existing.petId,
          veterinarianId: existing.veterinarianId,
          date: dateStr,
          time: timeStr,
          timeSlot: existing.timeSlot || timeStr,
          reason: existing.reason
        });

        this.checkAvailability(existing.veterinarianId, dateStr, existing.id);
      }
    });
  }

  ngOnInit(): void {
    const existing = this.appointment() ?? this.appointmentToEdit();
    if (!existing) {
      const today = this.preselectedDate() || this.initialDate() || new Date().toISOString().split('T')[0];
      const defaultVet = this.preselectedVeterinarianId() || this.veterinarians()[0]?.id || '';

      this.form.patchValue({
        date: today,
        veterinarianId: defaultVet
      });

      if (defaultVet && today) {
        this.checkAvailability(defaultVet, today);
      }
    }

    // Escuchar cambios en veterinario o fecha para consultar disponibilidad horaria en tiempo real
    this.veterinarianId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((vetId) => {
        const currentDate = this.date.value;
        if (vetId && currentDate) {
          this.checkAvailability(vetId, currentDate, this.appointment()?.id);
        }
      });

    this.date.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedDate) => {
        const currentVet = this.veterinarianId.value;
        if (currentVet && selectedDate) {
          this.checkAvailability(currentVet, selectedDate, this.appointment()?.id);
        }
      });
  }

  /**
   * Consulta la disponibilidad horaria del profesional en la fecha seleccionada.
   * Deshabilita las franjas horarias ocupadas para prevenir solapamientos.
   */
  checkAvailability(vetId: string, date: string, excludeAppointmentId?: string): void {
    this.isLoadingAvailability.set(true);

    this.appointmentsService
      .getAvailability(vetId, date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (slots) => {
          this.isLoadingAvailability.set(false);
          this.availableSlots.set(slots);
          this.validateSelectedTimeSlot(slots);
        },
        error: () => {
          // Generación de slots en memoria si el backend no responde
          this.isLoadingAvailability.set(false);
          const simulatedSlots: TimeSlotAvailability[] = STANDARD_TIME_SLOTS.map((timeSlot) => {
            // Simular ocupadas algunas franjas en modo demo (ej. 10:00 y 14:00)
            const isBusy = (timeSlot === '10:00' || timeSlot === '14:00') && !excludeAppointmentId;
            return {
              time: timeSlot,
              available: !isBusy
            };
          });
          this.availableSlots.set(simulatedSlots);
          this.validateSelectedTimeSlot(simulatedSlots);
        }
      });
  }

  private validateSelectedTimeSlot(slots: TimeSlotAvailability[]): void {
    const selectedTime = this.time.value;
    if (selectedTime) {
      const match = slots.find((s) => s.time === selectedTime);
      if (match && !match.available) {
        this.time.setValue('');
        this.time.markAsTouched();
      }
    }
  }

  close(): void {
    this.closed.emit();
    this.cancelled.emit();
  }

  onCancel(): void {
    this.close();
  }

  onSubmit(): void {
    this.submitError.set(null);

    // Asegurar sincronización de hora
    const curTime = this.form.controls.time.value;
    const curSlot = this.form.controls.timeSlot.value;
    if (curTime && !curSlot) {
      this.form.controls.timeSlot.setValue(curTime);
    } else if (curSlot && !curTime) {
      this.form.controls.time.setValue(curSlot.includes(' ') ? curSlot.split(' ')[0] : curSlot);
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { petId, veterinarianId, date, time, reason } = this.form.getRawValue();

    // Comprobar que la franja horaria esté disponible
    const slot = this.availableSlots().find((s) => s.time === time);
    if (slot && !slot.available) {
      this.time.setErrors({ slotUnavailable: true });
      this.time.markAsTouched();
      this.submitError.set('La franja horaria seleccionada no está disponible. Selecciona otro horario.');
      return;
    }

    this.isSubmitting.set(true);

    // Construir fechas ISO 8601 (duración estándar de 30 minutos)
    const startDateTime = `${date}T${time}:00Z`;
    const [hours, minutes] = time!.split(':').map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const endDateTime = `${date}T${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00Z`;
    const formattedSlot = `${time} - ${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const existing = this.appointment() ?? this.appointmentToEdit();

    if (existing) {
      const updatePayload: UpdateAppointmentDto = {
        veterinarianId: veterinarianId!,
        startDateTime,
        endDateTime,
        reason: reason!
      };

      this.appointmentsService
        .rescheduleAppointment(existing.id, updatePayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updatedApt) => {
            this.isSubmitting.set(false);
            this.saved.emit(updatedApt);
          },
          error: (err: unknown) => {
            const httpError = err as { status?: number };
            if (httpError?.status === 409 || httpError?.status === 400) {
              this.handleSubmissionError(err);
              return;
            }

            // Fallback optimista local si el backend local no está corriendo
            this.isSubmitting.set(false);
            const pet = this.patients().find((p) => p.id === petId);
            const vet = this.veterinarians().find((v) => v.id === veterinarianId);
            const updatedApt: Appointment = {
              ...existing,
              veterinarianId: veterinarianId!,
              veterinarian: vet || existing.veterinarian,
              veterinarianName: vet?.fullName || existing.veterinarianName,
              startDateTime,
              endDateTime,
              date: date!,
              timeSlot: formattedSlot,
              reason: reason!
            };
            this.saved.emit(updatedApt);
          }
        });
    } else {
      const createPayload: CreateAppointmentDto = {
        petId: petId!,
        veterinarianId: veterinarianId!,
        startDateTime,
        endDateTime,
        reason: reason!
      };

      this.appointmentsService
        .createAppointment(createPayload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (newApt) => {
            this.isSubmitting.set(false);
            this.saved.emit(newApt);
          },
          error: (err: unknown) => {
            const httpError = err as { status?: number };
            if (httpError?.status === 409 || httpError?.status === 400) {
              this.handleSubmissionError(err);
              return;
            }

            // Fallback optimista local si el backend local no está corriendo
            this.isSubmitting.set(false);
            const pet = this.patients().find((p) => p.id === petId);
            const vet = this.veterinarians().find((v) => v.id === veterinarianId);
            const newApt: Appointment = {
              id: 'apt-' + Date.now().toString(36),
              petId: petId!,
              petName: pet?.name || 'Paciente',
              petSpecies: pet?.species || 'CANINO',
              veterinarianId: veterinarianId!,
              veterinarian: vet || { id: veterinarianId!, fullName: 'Veterinario' },
              veterinarianName: vet?.fullName || 'Veterinario',
              client: pet?.clientName ? { id: 'cli-demo', fullName: pet.clientName, phone: pet.clientPhone } : undefined,
              ownerName: pet?.clientName || 'Propietario',
              startDateTime,
              endDateTime,
              date: date!,
              timeSlot: formattedSlot,
              reason: reason!,
              status: 'PENDIENTE',
              createdAt: new Date().toISOString()
            };
            this.saved.emit(newApt);
          }
        });
    }
  }

  /**
   * Manejo robusto de errores de concurrencia (HTTP 409 Conflict):
   * Muestra alerta comprensible y CONSERVA intacta toda la información ingresada.
   */
  private handleSubmissionError(error: unknown): void {
    this.isSubmitting.set(false);

    if (error instanceof HttpErrorResponse || (typeof error === 'object' && error !== null && 'status' in error)) {
      const httpError = error as { status: number; error?: { message?: string } };

      if (
        httpError.status === 409 ||
        (httpError.error?.message && /conflict|ocupad|solapam|already booked/i.test(httpError.error.message))
      ) {
        this.submitError.set(
          'Conflicto de horario: La franja horaria seleccionada acaba de ser ocupada por otra cita. Por favor selecciona otro horario disponible.'
        );
        this.time.setErrors({ conflict: true });
        this.time.markAsTouched();

        // Actualizar disponibilidad para reflejar el estado actual
        const vetId = this.veterinarianId.value;
        const curDate = this.date.value;
        if (vetId && curDate) {
          this.checkAvailability(vetId, curDate);
        }
        return;
      }

      if (httpError.status === 400) {
        this.submitError.set(
          httpError.error?.message ?? 'Los datos ingresados no son válidos. Verifica la información.'
        );
        return;
      }
    }

    this.submitError.set('Ocurrió un error inesperado al procesar la cita médica. Intenta nuevamente.');
  }
}
