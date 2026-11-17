import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of } from 'rxjs';
import { DocumentPreviewDialogComponent } from './document-preview-dialog.component';
import { AttachmentsService } from '../../services/attachments.service';
import { ClinicalAttachment } from '../../models/attachment.model';

describe('DocumentPreviewDialogComponent', () => {
  let fixture: ComponentFixture<DocumentPreviewDialogComponent>;
  let attachmentsServiceMock: {
    downloadSecureAttachment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    attachmentsServiceMock = {
      downloadSecureAttachment: vi.fn()
    };

    if (!URL.createObjectURL) {
      URL.createObjectURL = () => '';
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => {};
    }

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost:4200/mock-uuid');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [DocumentPreviewDialogComponent],
      providers: [{ provide: AttachmentsService, useValue: attachmentsServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentPreviewDialogComponent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render an iframe when previewing a valid PDF attachment', () => {
    const pdfAttachment: ClinicalAttachment = {
      id: 'att-pdf-1',
      fileName: 'ecografia.pdf',
      fileSize: 204800,
      mimeType: 'application/pdf',
      uploadedAt: '2026-11-16T19:00:00Z'
    };

    attachmentsServiceMock.downloadSecureAttachment.mockReturnValue(
      of(new Blob(['%PDF'], { type: 'application/pdf' }))
    );

    fixture.componentRef.setInput('attachment', pdfAttachment);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="pdf-preview-frame"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="image-preview-img"]')).toBeNull();
  });

  it('should render an img element when previewing a PNG/JPG attachment', () => {
    const imgAttachment: ClinicalAttachment = {
      id: 'att-img-1',
      fileName: 'radiografia.png',
      fileSize: 512000,
      mimeType: 'image/png',
      uploadedAt: '2026-11-16T19:00:00Z'
    };

    attachmentsServiceMock.downloadSecureAttachment.mockReturnValue(
      of(new Blob(['png-bytes'], { type: 'image/png' }))
    );

    fixture.componentRef.setInput('attachment', imgAttachment);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="image-preview-img"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="pdf-preview-frame"]')).toBeNull();
  });

  it('should block untrusted MIME types without calling download service', () => {
    const unsafeAttachment: ClinicalAttachment = {
      id: 'att-bad-1',
      fileName: 'payload.html',
      fileSize: 1024,
      mimeType: 'text/html',
      uploadedAt: '2026-11-16T19:00:00Z'
    };

    fixture.componentRef.setInput('attachment', unsafeAttachment);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(attachmentsServiceMock.downloadSecureAttachment).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="preview-error-box"]')).not.toBeNull();
  });
});
