import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClinicalAttachment } from '../models/attachment.model';

@Injectable({
  providedIn: 'root'
})
export class AttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  uploadAttachment(
    recordId: string,
    file: File,
    description?: string
  ): Observable<HttpEvent<ClinicalAttachment>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (description && description.trim().length > 0) {
      formData.append('description', description.trim());
    }

    return this.http.post<ClinicalAttachment>(
      `${this.apiUrl}/medical-records/${encodeURIComponent(recordId)}/attachments`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    );
  }

  getAttachments(recordId: string): Observable<ClinicalAttachment[]> {
    return this.http.get<ClinicalAttachment[]>(
      `${this.apiUrl}/medical-records/${encodeURIComponent(recordId)}/attachments`
    );
  }

  downloadSecureAttachment(attachmentId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/attachments/secure/${encodeURIComponent(attachmentId)}`,
      {
        responseType: 'blob'
      }
    );
  }
}
