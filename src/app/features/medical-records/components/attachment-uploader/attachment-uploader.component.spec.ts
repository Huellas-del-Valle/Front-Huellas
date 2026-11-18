import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { AttachmentUploaderComponent } from './attachment-uploader.component';
import { AttachmentsService } from '../../services/attachments.service';
import { ClinicalAttachment, MAX_ATTACHMENT_SIZE_BYTES } from '../../models/attachment.model';

describe('AttachmentUploaderComponent', () => {
  let fixture: ComponentFixture<AttachmentUploaderComponent>;
  let component: AttachmentUploaderComponent;
  let attachmentsServiceMock: {
    getAttachments: ReturnType<typeof vi.fn>;
    uploadAttachment: ReturnType<typeof vi.fn>;
    downloadSecureAttachment: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    attachmentsServiceMock = {
      getAttachments: vi.fn().mockReturnValue(of([])),
      uploadAttachment: vi.fn(),
      downloadSecureAttachment: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AttachmentUploaderComponent],
      providers: [{ provide: AttachmentsService, useValue: attachmentsServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(AttachmentUploaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('recordId', 'rec-500');
    fixture.detectChanges();
  });

  it('should reject disallowed file extensions/MIME types on client side without calling service', () => {
    const exeFile = new File(['MZ...'], 'virus.exe', { type: 'application/x-msdownload' });

    component.processSelectedFile(exeFile);
    fixture.detectChanges();

    expect(attachmentsServiceMock.uploadAttachment).not.toHaveBeenCalled();
    expect(component.uploadState().status).toBe('ERROR');
    expect(component.uploadState().error).toContain('PDF, JPG y PNG');
  });

  it('should reject files exceeding 10 MB maximum size limit without calling service', () => {
    const oversizedBuffer = new Uint8Array(MAX_ATTACHMENT_SIZE_BYTES + 1024);
    const largePdf = new File([oversizedBuffer], 'estudio_pesado.pdf', { type: 'application/pdf' });

    component.processSelectedFile(largePdf);
    fixture.detectChanges();

    expect(attachmentsServiceMock.uploadAttachment).not.toHaveBeenCalled();
    expect(component.uploadState().status).toBe('ERROR');
    expect(component.uploadState().error).toContain('10 MB');
  });

  it('should upload valid PDF file, track HTTP progress percentage, and append to list', () => {
    const validPdf = new File(['%PDF-1.4'], 'hemograma.pdf', { type: 'application/pdf' });
    const events$ = new Subject<unknown>();
    attachmentsServiceMock.uploadAttachment.mockReturnValue(events$.asObservable());

    component.processSelectedFile(validPdf);
    expect(component.uploadState().status).toBe('UPLOADING');

    events$.next({ type: HttpEventType.UploadProgress, loaded: 60, total: 100 });
    expect(component.uploadState().progress).toBe(60);

    const createdAttachment: ClinicalAttachment = {
      id: 'att-99',
      fileName: 'hemograma.pdf',
      fileSize: validPdf.size,
      mimeType: 'application/pdf',
      uploadedAt: '2026-11-16T20:00:00Z'
    };

    events$.next(new HttpResponse({ body: createdAttachment, status: 201 }));
    events$.complete();

    expect(component.uploadState().status).toBe('SUCCESS');
    expect(component.uploadState().progress).toBe(100);
    expect(component.attachments()[0].id).toBe('att-99');
  });
});
