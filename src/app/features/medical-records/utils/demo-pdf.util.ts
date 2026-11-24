import { Pet } from '../../patients/models/pet.model';
import {
  MEDICAL_RECORD_TYPE_CONFIG,
  MedicalRecord
} from '../models/medical-record.model';

interface PdfLine {
  readonly text: string;
  readonly bold?: boolean;
  readonly size?: number;
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\xFF]/g, '?');
}

function toLatin1Buffer(str: string): ArrayBuffer {
  const buffer = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f;
  }
  return buffer;
}

function wrapLines(text: string, maxChars = 84): string[] {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return ['-'];
  }
  const words = normalized.split(' ');
  const result: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      result.push(current);
      current = word;
    }
  }
  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildRecordLines(record: MedicalRecord): PdfLine[] {
  const typeLabel = MEDICAL_RECORD_TYPE_CONFIG[record.recordType]?.label ?? record.recordType;
  const lines: PdfLine[] = [
    {
      text: `[${typeLabel.toUpperCase()}]  ${formatDate(record.recordDate)}  |  Prof: ${record.veterinarianName}`,
      bold: true,
      size: 10
    }
  ];

  const vitals: string[] = [];
  if (record.weightKg !== null) vitals.push(`Peso: ${record.weightKg} kg`);
  if (record.temperatureC !== null) vitals.push(`Temperatura: ${record.temperatureC} °C`);
  if (vitals.length > 0) {
    lines.push({ text: `Signos vitales: ${vitals.join('  |  ')}`, size: 9 });
  }

  for (const part of wrapLines(`Sintomas / Anamnesis: ${record.symptoms}`)) {
    lines.push({ text: part, size: 9 });
  }
  for (const part of wrapLines(`Diagnostico: ${record.diagnosis}`)) {
    lines.push({ text: part, bold: true, size: 9 });
  }
  if (record.treatment) {
    for (const part of wrapLines(`Tratamiento: ${record.treatment}`)) {
      lines.push({ text: part, size: 9 });
    }
  }
  if (record.prescriptions.length > 0) {
    lines.push({ text: 'Prescripciones:', bold: true, size: 9 });
    for (const p of record.prescriptions) {
      const desc = `  - ${p.medication}${p.dosage ? ` | ${p.dosage}` : ''}${p.frequency ? ` | ${p.frequency}` : ''}${p.duration ? ` (${p.duration})` : ''}`;
      for (const part of wrapLines(desc, 80)) {
        lines.push({ text: part, size: 9 });
      }
    }
  }
  lines.push({ text: '--------------------------------------------------------------------------------', size: 9 });
  return lines;
}

function renderPdfDocument(lines: PdfLine[]): Blob {
  const pageHeight = 792;
  const topMargin = 745;
  const bottomMargin = 50;
  const lineHeight = 14;

  const pagesLines: PdfLine[][] = [];
  let currentPage: PdfLine[] = [];
  let y = topMargin;

  for (const line of lines) {
    if (y < bottomMargin) {
      pagesLines.push(currentPage);
      currentPage = [];
      y = topMargin;
    }
    currentPage.push(line);
    y -= lineHeight;
  }
  if (currentPage.length > 0 || pagesLines.length === 0) {
    pagesLines.push(currentPage);
  }

  // Objetos base:
  // 1: Catalog, 2: Pages, 3: Font F1 (Helvetica), 4: Font F2 (Helvetica-Bold)
  // Por cada página i: PageObj (5 + i*2), ContentObj (6 + i*2)
  const objects: string[] = [];
  const pageIds: number[] = [];

  for (let i = 0; i < pagesLines.length; i++) {
    pageIds.push(5 + i * 2);
  }

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\nendobj\n`);
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');

  for (let i = 0; i < pagesLines.length; i++) {
    const pageObjId = 5 + i * 2;
    const contentObjId = 6 + i * 2;
    const pageContentLines = pagesLines[i];

    const streamOps: string[] = ['BT'];
    let currentY = topMargin;
    for (const line of pageContentLines) {
      const fontRef = line.bold ? '/F2' : '/F1';
      const fontSize = line.size ?? 10;
      streamOps.push(`${fontRef} ${fontSize} Tf`);
      streamOps.push(`1 0 0 1 48 ${currentY} Tm`);
      streamOps.push(`(${escapePdfText(line.text)}) Tj`);
      currentY -= lineHeight;
    }
    streamOps.push('ET');
    const streamBody = streamOps.join('\n');

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj\n`
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([toLatin1Buffer(pdf)], { type: 'application/pdf' });
}

export function buildClinicalHistoryPdfBlob(
  patient: Pet,
  records: readonly MedicalRecord[]
): Blob {
  const lines: PdfLine[] = [
    { text: 'CLINICA VETERINARIA HUELLAS DEL VALLE S.A.S.', bold: true, size: 13 },
    { text: 'REPORTE DE HISTORIA CLINICA VETERINARIA', bold: true, size: 11 },
    { text: '================================================================================', size: 9 },
    { text: `Paciente: ${patient.name}  |  Codigo Unico: ${patient.uniqueCode}`, bold: true, size: 10 },
    {
      text: `Especie: ${patient.species}  |  Raza: ${patient.breed}  |  Sexo: ${patient.gender}  |  Color: ${patient.color}`,
      size: 9
    },
    {
      text: `Propietario: ${patient.client?.fullName ?? 'N/A'}  |  Doc: ${patient.client?.identification ?? 'N/A'}  |  Tel: ${patient.client?.phone ?? 'N/A'}`,
      size: 9
    },
    { text: `Fecha de generacion: ${formatDate(new Date().toISOString())}`, size: 9 },
    { text: '================================================================================', size: 9 }
  ];

  if (records.length === 0) {
    lines.push({ text: 'No existen atenciones registradas para este paciente.', size: 10 });
  } else {
    for (const rec of records) {
      lines.push(...buildRecordLines(rec));
    }
  }

  return renderPdfDocument(lines);
}
