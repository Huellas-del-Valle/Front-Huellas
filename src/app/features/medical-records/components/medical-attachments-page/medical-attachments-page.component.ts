import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AttachmentUploaderComponent } from '../attachment-uploader/attachment-uploader.component';

@Component({
  selector: 'app-medical-attachments-page',
  standalone: true,
  imports: [CommonModule, AttachmentUploaderComponent],
  template: `
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-pine-700">Historia Clínica Digital • CU09</span>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-0.5">
            Gestión de Exámenes y Resultados Clínicos
          </h1>
        </div>
        <span class="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600 self-start sm:self-auto">
          Atención: {{ recordId() }}
        </span>
      </div>

      <app-attachment-uploader [recordId]="recordId()" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MedicalAttachmentsPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly recordId = computed(
    () => this.route.snapshot.paramMap.get('recordId') || 'demo-record-001'
  );
}
