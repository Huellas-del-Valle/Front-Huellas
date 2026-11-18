import { TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AttachmentsService } from './attachments.service';
import { environment } from '../../../../environments/environment';
import { ClinicalAttachment } from '../models/attachment.model';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttachmentsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AttachmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should upload multipart/form-data and emit upload progress events', () => {
    const mockFile = new File(['%PDF-1.4 test'], 'hemograma.pdf', { type: 'application/pdf' });
    const mockResponse: ClinicalAttachment = {
      id: 'att-1',
      fileName: 'hemograma.pdf',
      fileSize: mockFile.size,
      mimeType: 'application/pdf',
      description: 'Hemograma completo',
      uploadedAt: '2026-11-16T19:00:00Z'
    };

    const observedTypes: HttpEventType[] = [];

    service.uploadAttachment('rec-101', mockFile, 'Hemograma completo').subscribe((event) => {
      observedTypes.push(event.type);
      if (event.type === HttpEventType.Response) {
        expect(event.body?.id).toBe('att-1');
      }
    });

    const req = httpMock.expectOne(`${baseUrl}/medical-records/rec-101/attachments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('description')).toBe('Hemograma completo');

    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    req.flush(mockResponse);

    expect(observedTypes).toContain(HttpEventType.UploadProgress);
    expect(observedTypes).toContain(HttpEventType.Response);
  });

  it('should fetch attachments list for a medical record', () => {
    service.getAttachments('rec-101').subscribe((items) => {
      expect(items.length).toBe(0);
    });

    const req = httpMock.expectOne(`${baseUrl}/medical-records/rec-101/attachments`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should request secure attachment as a Blob', () => {
    const fakeBlob = new Blob(['binary'], { type: 'application/pdf' });

    service.downloadSecureAttachment('att-1').subscribe((blob) => {
      expect(blob.size).toBe(fakeBlob.size);
    });

    const req = httpMock.expectOne(`${baseUrl}/attachments/secure/att-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(fakeBlob);
  });
});
