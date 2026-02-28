/**
 * Web Worker for header detection in Excel/CSV files.
 * Parses first 50 rows using SheetJS and runs keyword matching.
 */
import * as XLSX from 'xlsx';
import { matchHeaderRow, REQUIRED_HEADERS } from '@/utils/headerKeywords';

export interface HeaderDetectionRequest {
  buffer: ArrayBuffer;
  fileName: string;
}

export type HeaderStatus = 'ok' | 'anomaly' | 'no-headers' | 'single-column';

export interface HeaderDetectionResult {
  fileName: string;
  status: HeaderStatus;
  rows: string[][];
  detectedHeaderRow: number | null;
  detectedMapping: Record<string, string> | null;
}

/**
 * Check first 500 bytes for HTML tags to detect HTML-disguised Excel files
 */
function isHtmlDisguised(buffer: ArrayBuffer): boolean {
  const slice = new Uint8Array(buffer, 0, Math.min(500, buffer.byteLength));
  const text = new TextDecoder('utf-8', { fatal: false }).decode(slice).toLowerCase();
  return text.includes('<html') || text.includes('<table') || text.includes('<tr');
}

function processFile(data: HeaderDetectionRequest): HeaderDetectionResult {
  const { buffer, fileName } = data;

  try {
    // Format sniffer: detect HTML-disguised files
    const htmlMode = isHtmlDisguised(buffer);

    // Parse with SheetJS
    const workbook = XLSX.read(buffer, {
      type: 'array',
      sheetRows: 50, // Only first 50 rows
      ...(htmlMode ? {} : {}), // SheetJS auto-detects HTML tables
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) {
      return { fileName, status: 'no-headers', rows: [], detectedHeaderRow: null, detectedMapping: null };
    }

    // Convert to array of arrays
    const rawRows: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    // Convert all values to strings
    const rows: string[][] = rawRows.map(row =>
      (row as any[]).map(cell => (cell === null || cell === undefined ? '' : String(cell)))
    );

    // Check single-column case: max columns across all rows <= 1
    const maxCols = rows.reduce((max, row) => Math.max(max, row.filter(c => c.trim() !== '').length), 0);
    if (maxCols <= 1) {
      return { fileName, status: 'single-column', rows, detectedHeaderRow: null, detectedMapping: null };
    }

    // Check no-headers case: max columns < 5
    if (maxCols < REQUIRED_HEADERS.length) {
      return { fileName, status: 'no-headers', rows, detectedHeaderRow: null, detectedMapping: null };
    }

    // Try to auto-detect header row by matching keywords
    let detectedRow: number | null = null;
    let detectedMapping: Record<string, string> | null = null;
    let matchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const mapping = matchHeaderRow(rows[i]);
      if (mapping) {
        detectedRow = i;
        detectedMapping = mapping;
        matchCount++;
      }
    }

    // Exactly one row matches all 5 keywords = OK
    if (matchCount === 1) {
      return { fileName, status: 'ok', rows, detectedHeaderRow: detectedRow, detectedMapping };
    }

    // 0 or >1 matches = anomaly
    return { fileName, status: 'anomaly', rows, detectedHeaderRow: null, detectedMapping: null };
  } catch (error) {
    console.error(`[HeaderWorker] Failed to parse ${fileName}:`, error);
    return { fileName, status: 'anomaly', rows: [], detectedHeaderRow: null, detectedMapping: null };
  }
}

// Worker message handler
self.onmessage = (e: MessageEvent<HeaderDetectionRequest>) => {
  const result = processFile(e.data);
  self.postMessage(result);
};
