import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, catchError, of } from 'rxjs';
import { PetsService } from '../../services/pets.service';
import { CreatePetDto, PetGender, PetOwnerSummary, PetSpecies } from '../../models/pet.model';
import { PatientBadgeComponent } from '../../../../shared/components/patient-badge/patient-badge.component';

interface PetFormControls {
  name: FormControl<string>;
  species: FormControl<PetSpecies>;
  breed: FormControl<string>;
  ageMode: FormControl<'DATE' | 'ESTIMATED'>;
  birthDate: FormControl<string>;
  estimatedAge: FormControl<string>;
  gender: FormControl<PetGender>;
  color: FormControl<string>;
  code: FormControl<string>;
  microchip: FormControl<string>;
  ownerSearch: FormControl<string>;
  clientId: FormControl<string>;
}

@Component({
  selector: 'app-pet-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PatientBadgeComponent],
  templateUrl: './pet-form.component.html',
  styleUrls: ['./pet-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly petsService = inject(PetsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSearchingOwners = signal<boolean>(false);
  readonly ownerSuggestions = signal<readonly PetOwnerSummary[]>([]);
  readonly selectedOwner = signal<PetOwnerSummary | null>(null);
  readonly showSuggestions = signal<boolean>(false);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form: FormGroup<PetFormControls> = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    species: ['CANINO' as PetSpecies, [Validators.required]],
    breed: ['', [Validators.required, Validators.maxLength(60)]],
    ageMode: ['DATE' as 'DATE' | 'ESTIMATED', [Validators.required]],
    birthDate: [''],
    estimatedAge: [''],
    gender: ['MACHO' as PetGender, [Validators.required]],
    color: ['', [Validators.required, Validators.maxLength(40)]],
    code: [''],
    microchip: ['', [Validators.maxLength(50)]],
    ownerSearch: ['', [Validators.required]],
    clientId: ['', [Validators.required]]
  });

  readonly previewName = signal<string>('Nueva Mascota');
  readonly previewSpecies = signal<PetSpecies>('CANINO');
  readonly previewBreed = signal<string>('');
  readonly previewCode = signal<string>('HUV-2026-AUTO');

  readonly isAgeValid = computed(() => {
    const mode = this.form.controls.ageMode.value;
    if (mode === 'DATE') {
      return this.form.controls.birthDate.value.trim().length > 0;
    }
    return this.form.controls.estimatedAge.value.trim().length > 0;
  });

  ngOnInit(): void {
    this.setupOwnerAutocomplete();
    this.setupLivePreview();
  }

  private setupOwnerAutocomplete(): void {
    this.form.controls.ownerSearch.valueChanges
      .pipe(
        tap((query) => {
          const currentSelected = this.selectedOwner();
          if (currentSelected && query !== `${currentSelected.fullName} (${currentSelected.identification})`) {
            this.selectedOwner.set(null);
            this.form.controls.clientId.setValue('');
          }
        }),
        debounceTime(300),
        distinctUntilChanged(),
        filter((query) => !this.selectedOwner() && query.trim().length >= 2),
        tap(() => {
          this.isSearchingOwners.set(true);
          this.showSuggestions.set(true);
        }),
        switchMap((query) =>
          this.petsService.searchOwners(query).pipe(
            catchError(() => of([] as PetOwnerSummary[]))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((owners) => {
        this.ownerSuggestions.set(owners);
        this.isSearchingOwners.set(false);
      });
  }

  private setupLivePreview(): void {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        this.previewName.set(val.name?.trim() || 'Nueva Mascota');
        this.previewSpecies.set(val.species || 'CANINO');
        this.previewBreed.set(val.breed?.trim() || '');
        this.previewCode.set(val.code?.trim().toUpperCase() || 'HUV-2026-AUTO');
      });
  }

  selectOwner(owner: PetOwnerSummary): void {
    this.selectedOwner.set(owner);
    this.form.controls.clientId.setValue(owner.id);
    this.form.controls.ownerSearch.setValue(`${owner.fullName} (${owner.identification})`, { emitEvent: false });
    this.showSuggestions.set(false);
    this.ownerSuggestions.set([]);
  }

  clearOwner(): void {
    this.selectedOwner.set(null);
    this.form.controls.clientId.setValue('');
    this.form.controls.ownerSearch.setValue('');
    this.ownerSuggestions.set([]);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid || !this.selectedOwner() || !this.isAgeValid()) {
      this.form.markAllAsTouched();
      if (!this.selectedOwner()) {
        this.errorMessage.set('Debe buscar y seleccionar un propietario válido de la lista antes de guardar.');
      } else if (!this.isAgeValid()) {
        this.errorMessage.set('Debe ingresar la fecha de nacimiento o una edad estimada para el paciente.');
      }
      return;
    }

    const raw = this.form.getRawValue();
    const dto: CreatePetDto = {
      name: raw.name.trim(),
      species: raw.species,
      breed: raw.breed.trim(),
      gender: raw.gender,
      color: raw.color.trim(),
      clientId: raw.clientId,
      ...(raw.ageMode === 'DATE' && raw.birthDate ? { birthDate: raw.birthDate } : {}),
      ...(raw.ageMode === 'ESTIMATED' && raw.estimatedAge ? { estimatedAge: raw.estimatedAge.trim() } : {}),
      ...(raw.code.trim() ? { code: raw.code.trim().toUpperCase() } : {}),
      ...(raw.microchip.trim() ? { microchip: raw.microchip.trim() } : {})
    };

    this.isSubmitting.set(true);
    this.petsService
      .createPet(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (createdPet) => {
          this.isSubmitting.set(false);
          this.successMessage.set(`Paciente ${createdPet.name} registrado con código ${createdPet.uniqueCode}.`);
          setTimeout(() => {
            this.router.navigate(['/patients', createdPet.id]);
          }, 800);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'No se pudo registrar la mascota. Verifique los datos e intente nuevamente.');
        }
      });
  }
}
