import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttachmentsService } from '../../services/attachments.service';
import {
  ClinicalAttachment,
  UploadProgressState,
  validateClinicalFile
} from '../../models/attachment.model';
import { DocumentPreviewDialogComponent } from '../document-preview-dialog/document-preview-dialog.component';

@Component({
  selector: 'app-attachment-uploader',
  standalone: true,
  imports: [CommonModule, DocumentPreviewDialogComponent],
  templateUrl: './attachment-uploader.component.html',
  styleUrls: ['./attachment-uploader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttachmentUploaderComponent implements OnInit {
  private readonly attachmentsService = inject(AttachmentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly recordId = input.required<string>();

  readonly attachments = signal<readonly ClinicalAttachment[]>([]);
  readonly isLoadingList = signal<boolean>(true);
  readonly listError = signal<string | null>(null);

  readonly isDraggingOver = signal<boolean>(false);
  readonly descriptionInput = signal<string>('');
  readonly uploadState = signal<UploadProgressState>({
    status: 'IDLE',
    progress: 0
  });

  readonly previewingAttachment = signal<ClinicalAttachment | null>(null);
  readonly downloadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAttachments();
  }

  loadAttachments(): void {
    this.isLoadingList.set(true);
    this.listError.set(null);

    this.attachmentsService
      .getAttachments(this.recordId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.attachments.set(items);
          this.isLoadingList.set(false);
        },
        error: () => {
          this.isLoadingList.set(false);
          this.listError.set('No se pudieron cargar los adjuntos clínicos de esta atención.');
        }
      });
  }

  onDescriptionChange(event: Event): void {
    this.descriptionInput.set((event.target as HTMLInputElement).value);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processSelectedFile(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.processSelectedFile(inputEl.files[0]);
      inputEl.value = '';
    }
  }

  processSelectedFile(file: File): void {
    const validation = validateClinicalFile(file);

    if (!validation.valid) {
      this.uploadState.set({
        status: 'ERROR',
        progress: 0,
        error: validation.error || 'Archivo no válido.'
      });
      return;
    }

    this.uploadState.set({
      status: 'UPLOADING',
      progress: 0
    });

    this.attachmentsService
      .uploadAttachment(this.recordId(), file, this.descriptionInput())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? file.size;
            const percent = total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0;
            this.uploadState.set({
              status: 'UPLOADING',
              progress: percent
            });
          } else if (event.type === HttpEventType.Response && event.body) {
            const created = event.body;
            this.attachments.update((current) => [created, ...current]);
            this.descriptionInput.set('');
            this.uploadState.set({
              status: 'SUCCESS',
              progress: 100
            });
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.uploadState.set({
            status: 'ERROR',
            progress: 0,
            error: err?.error?.message || 'Error al subir el documento clínico al servidor.'
          });
        }
      });
  }

  openPreview(attachment: ClinicalAttachment): void {
    this.previewingAttachment.set(attachment);
  }

  closePreview(): void {
    this.previewingAttachment.set(null);
  }

  downloadProtected(attachment: ClinicalAttachment): void {
    this.downloadingId.set(attachment.id);

    this.attachmentsService
      .downloadSecureAttachment(attachment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.fileName;
          link.click();
          URL.revokeObjectURL(url);
          this.downloadingId.set(null);
        },
        error: () => {
          this.downloadingId.set(null);
          this.uploadState.set({
            status: 'ERROR',
            progress: 0,
            error: `No se pudo descargar de forma segura el archivo ${attachment.fileName}.`
          });
        }
      });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
