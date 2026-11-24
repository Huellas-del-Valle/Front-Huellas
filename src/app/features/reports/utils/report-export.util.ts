import { ReportFilters, ReportsDashboardData } from '../models/reports.model';

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

function formatCop(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

export function buildGerencialReportPdfBlob(
  data: ReportsDashboardData,
  filters: ReportFilters
): Blob {
  const lines: PdfLine[] = [
    { text: 'CLINICA VETERINARIA HUELLAS DEL VALLE S.A.S.', bold: true, size: 13 },
    { text: 'REPORTE GERENCIAL DE INGRESOS Y CONSULTAS', bold: true, size: 11 },
    {
      text: `Filtros: Rango ${filters.startDate || 'Inicio'} a ${filters.endDate || 'Hoy'} | Vet: ${filters.veterinarianId || 'Todos'} | Servicio: ${filters.serviceType || 'Todos'} | Caja: ${filters.cashStatus || 'Todas'}`,
      size: 8
    },
    { text: '================================================================================', size: 9 },
    {
      text: `Ingresos Totales: ${formatCop(data.totalRevenue)}   |   Consultas: ${data.totalConsultations}   |   Ticket Promedio: ${formatCop(data.averageTicket)}`,
      bold: true,
      size: 10
    },
    { text: `Cajas Cerradas en Periodo: ${data.cashClosedCount}`, size: 9 },
    { text: '--------------------------------------------------------------------------------', size: 9 },
    { text: '1. INGRESOS MENSUALES', bold: true, size: 10 }
  ];

  for (const m of data.monthlyRevenue) {
    lines.push({
      text: `   ${m.month} (${m.label})  ->  Ingresos: ${formatCop(m.revenue)}  |  Consultas: ${m.consultations}`,
      size: 9
    });
  }

  lines.push({ text: '--------------------------------------------------------------------------------', size: 9 });
  lines.push({ text: '2. VOLUMEN DE CONSULTAS POR PROFESIONAL', bold: true, size: 10 });

  for (const v of data.consultationsByVet) {
    lines.push({
      text: `   ${v.veterinarianName} (${v.specialty})  ->  ${v.consultationsCount} consultas  |  ${formatCop(v.revenueGenerated)}`,
      size: 9
    });
  }

  const pageHeight = 792;
  const topMargin = 745;
  const lineHeight = 15;

  const streamOps: string[] = ['BT'];
  let y = topMargin;
  for (const line of lines) {
    streamOps.push(`${line.bold ? '/F2' : '/F1'} ${line.size ?? 10} Tf`);
    streamOps.push(`1 0 0 1 48 ${y} Tm`);
    streamOps.push(`(${escapePdfText(line.text)}) Tj`);
    y -= lineHeight;
  }
  streamOps.push('ET');
  const streamBody = streamOps.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    `6 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj\n`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([toLatin1Buffer(pdf)], { type: 'application/pdf' });
}

// ============================================================================
// Generador OOXML (.xlsx) válido sin dependencias externas (ZIP STORE + XML)
// ============================================================================

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnLetters(colIndex: number): string {
  let letters = '';
  let n = colIndex + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildWorksheetXml(rows: readonly (readonly (string | number)[])[]): string {
  const rowXml = rows
    .map((row, rowIdx) => {
      const rNum = rowIdx + 1;
      const cells = row
        .map((cell, colIdx) => {
          const ref = `${columnLetters(colIdx)}${rNum}`;
          if (typeof cell === 'number') {
            return `<c r="${ref}"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
        })
        .join('');
      return `<row r="${rNum}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipArchive(entries: readonly { name: string; content: string }[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const checksum = crc32(dataBytes);

    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(localHeader);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(localHeader, 30).set(nameBytes);

    localParts.push(new Uint8Array(localHeader), dataBytes);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(centralHeader);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(centralHeader, 46).set(nameBytes);

    centralParts.push(new Uint8Array(centralHeader));
    offset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + 22;
  const result = new ArrayBuffer(totalSize);
  const out = new Uint8Array(result);
  let cursor = 0;
  for (const part of localParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  out.set(new Uint8Array(eocd), cursor);
  return result;
}

export function buildGerencialReportXlsxBlob(
  data: ReportsDashboardData,
  filters: ReportFilters
): Blob {
  const rows: (string | number)[][] = [
    ['Clínica Veterinaria Huellas del Valle S.A.S.', 'Reporte Gerencial'],
    [
      'Filtros aplicados',
      `Desde: ${filters.startDate || 'Inicio'} | Hasta: ${filters.endDate || 'Hoy'} | Vet: ${filters.veterinarianId || 'Todos'} | Servicio: ${filters.serviceType || 'Todos'} | Caja: ${filters.cashStatus || 'Todas'}`
    ],
    [],
    ['KPI', 'Valor'],
    ['Ingresos Totales (COP)', data.totalRevenue],
    ['Consultas Realizadas', data.totalConsultations],
    ['Ticket Promedio (COP)', data.averageTicket],
    ['Cajas Cerradas', data.cashClosedCount],
    [],
    ['Ingresos Mensuales', 'Mes', 'Ingresos (COP)', 'Consultas'],
    ...data.monthlyRevenue.map((m) => [m.month, m.label, m.revenue, m.consultations]),
    [],
    ['Profesional', 'Especialidad', 'Consultas', 'Ingresos Generados (COP)'],
    ...data.consultationsByVet.map((v) => [
      v.veterinarianName,
      v.specialty,
      v.consultationsCount,
      v.revenueGenerated
    ])
  ];

  const zipBuffer = createZipArchive([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Reporte Gerencial" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: buildWorksheetXml(rows)
    }
  ]);

  return new Blob([zipBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
