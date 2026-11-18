export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
] as const;

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png'
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type AllowedMimeType = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export interface AttachmentUploaderSummary {
  readonly id: string;
  readonly fullName: string;
}

export interface ClinicalAttachment {
  readonly id: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: AllowedMimeType | string;
  readonly description?: string;
  readonly uploadedBy?: AttachmentUploaderSummary;
  readonly uploadedAt: string;
}

export interface FileValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

export interface UploadProgressState {
  readonly status: 'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  readonly progress: number;
  readonly error?: string;
}

export function validateClinicalFile(file: File): FileValidationResult {
  const fileNameLower = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_ATTACHMENT_EXTENSIONS.some((ext) =>
    fileNameLower.endsWith(ext)
  );
  const hasValidMime = (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(
    file.type
  );

  if (!hasValidExtension || !hasValidMime) {
    return {
      valid: false,
      error: `Formato no permitido (${file.name}). Solo se aceptan archivos PDF, JPG y PNG.`
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'El archivo seleccionado está vacío (0 bytes).'
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo (${sizeMb} MB) supera el límite máximo permitido de 10 MB.`
    };
  }

  return { valid: true };
}
