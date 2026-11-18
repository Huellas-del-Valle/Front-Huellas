import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttachmentsService } from '../../services/attachments.service';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  ClinicalAttachment
} from '../../models/attachment.model';

@Component({
  selector: 'app-document-preview-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-preview-dialog.component.html',
  styleUrls: ['./document-preview-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentPreviewDialogComponent implements OnInit, OnDestroy {
  private readonly attachmentsService = inject(AttachmentsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly attachment = input.required<ClinicalAttachment>();
  readonly closed = output<void>();

  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly safeUrl = signal<SafeResourceUrl | null>(null);

  private rawObjectUrl: string | null = null;

  readonly isPdf = computed(() => this.attachment().mimeType === 'application/pdf');
  readonly isImage = computed(() =>
    this.attachment().mimeType === 'image/jpeg' || this.attachment().mimeType === 'image/png'
  );

  ngOnInit(): void {
    this.loadSecurePreview();
  }

  ngOnDestroy(): void {
    this.revokeCurrentUrl();
  }

  private loadSecurePreview(): void {
    const current = this.attachment();
    const isAllowedMime = (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(
      current.mimeType
    );

    if (!isAllowedMime) {
      this.isLoading.set(false);
      this.errorMessage.set(
        'Contenido bloqueado por seguridad: formato de archivo no autorizado para previsualización.'
      );
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.attachmentsService
      .downloadSecureAttachment(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.revokeCurrentUrl();
          const typedBlob = new Blob([blob], { type: current.mimeType });
          this.rawObjectUrl = URL.createObjectURL(typedBlob);
          this.safeUrl.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(this.rawObjectUrl)
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set(
            'No se pudo cargar la previsualización segura del documento clínico.'
          );
        }
      });
  }

  downloadFile(): void {
    if (!this.rawObjectUrl) return;
    const link = document.createElement('a');
    link.href = this.rawObjectUrl;
    link.download = this.attachment().fileName;
    link.click();
  }

  closeDialog(): void {
    this.closed.emit();
  }

  private revokeCurrentUrl(): void {
    if (this.rawObjectUrl) {
      URL.revokeObjectURL(this.rawObjectUrl);
      this.rawObjectUrl = null;
    }
  }
}
