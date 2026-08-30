// ============================================================
// Household Finance App — CSV import parsing (Checkpoint 6.3)
// ============================================================
// A deliberately simple importer: expects a CSV with a header row and
// columns named date, label, amount, and (optionally) direction — in any
// order, matched by header name. No column-mapping UI, no duplicate
// detection; those can be added later if needed. See PROGRESS.md.
// ============================================================

export type CsvTargetField = 'date' | 'label' | 'amount' | 'direction';
export type CsvColumnMapping = Record<CsvTargetField, string | null>;

export type ParsedCsvRow = {
  rowNumber: number; // 1-based, counting the header as row 1
  date: string;
  label: string;
  amount: number;
  direction: 'in' | 'out' | 'saving';
  error?: string;
  isPossibleDuplicate?: boolean;
  rawValues?: Record<string, string>;
};

export type CsvParseResult = {
  rows: ParsedCsvRow[];
  validRows: ParsedCsvRow[];
  invalidRows: ParsedCsvRow[];
  headers: string[];
  detectedMapping: CsvColumnMapping;
  headerError?: string;
};

const REQUIRED_COLUMNS = ['date', 'label', 'amount'];
export const CSV_TARGET_FIELDS: CsvTargetField[] = ['date', 'label', 'amount', 'direction'];

export function normalizeCsvHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function guessCsvColumnMapping(headers: string[]): CsvColumnMapping {
  const map: CsvColumnMapping = { date: null, label: null, amount: null, direction: null };
  const normalized = headers.map((h) => normalizeCsvHeader(h));
  normalized.forEach((header, index) => {
    if (map.date === null && ['date', 'posted date', 'transaction date', 'date paid'].includes(header)) map.date = headers[index];
    if (map.label === null && ['label', 'description', 'memo', 'details', 'payee', 'name', 'merchant', 'vendor'].includes(header)) map.label = headers[index];
    if (map.amount === null && ['amount', 'total', 'debit', 'credit', 'value', 'net'].includes(header)) map.amount = headers[index];
    if (map.direction === null && ['direction', 'type', 'inout', 'flow'].includes(header)) map.direction = headers[index];
  });
  return map;
}

function buildRowFromMapping(rawRow: string[], headers: string[], mapping: CsvColumnMapping): { date: string; label: string; amount: number; direction: 'in' | 'out' | 'saving'; error?: string } {
  const getValue = (field: CsvTargetField) => {
    const mappedHeader = mapping[field];
    if (!mappedHeader) return '';
    const idx = headers.findIndex((header) => normalizeCsvHeader(header) === normalizeCsvHeader(mappedHeader));
    return idx >= 0 ? (rawRow[idx] || '') : '';
  };

  const rawDate = getValue('date');
  const rawLabel = getValue('label');
  const rawAmount = getValue('amount');
  const rawDirection = getValue('direction');

  const date = normalizeDate(rawDate);
  const amount = parseFloat((rawAmount || '').replace(/[^0-9.\-]/g, ''));
  const direction = normalizeDirection(rawDirection);

  let error: string | undefined;
  if (!date) error = 'Unrecognized date — use YYYY-MM-DD or MM/DD/YYYY.';
  else if (!rawLabel.trim()) error = 'Missing a label.';
  else if (isNaN(amount) || amount <= 0) error = 'Amount must be a number greater than 0.';
  else if (!direction) error = `Unrecognized direction "${rawDirection}" — use in, out, or saving.`;

  return {
    date: date || rawDate,
    label: rawLabel,
    amount: isNaN(amount) ? 0 : amount,
    direction: direction || 'out',
    error,
  };
}

export function applyCsvMapping(
  parsed: CsvParseResult,
  mapping: CsvColumnMapping
): { rows: ParsedCsvRow[]; validRows: ParsedCsvRow[]; invalidRows: ParsedCsvRow[] } {
  const rows: ParsedCsvRow[] = [];
  parsed.rows.forEach((row) => {
    const rawRow = row.rawValues ? Object.values(row.rawValues) : [];
    const mapped = buildRowFromMapping(rawRow, parsed.headers, mapping);
    rows.push({
      ...row,
      date: mapped.date,
      label: mapped.label,
      amount: mapped.amount,
      direction: mapped.direction,
      error: mapped.error,
      rawValues: row.rawValues,
    });
  });
  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => !!r.error);
  return { rows, validRows, invalidRows };
}

// Splits one CSV line into fields, handling double-quoted fields (including
// embedded commas and escaped "" quotes inside them). Good enough for
// typical bank/spreadsheet exports without pulling in a library.
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function normalizeDirection(raw: string): 'in' | 'out' | 'saving' | null {
  const v = raw.trim().toLowerCase();
  if (v === '') return 'out'; // most CSV exports (bank statements etc.) are expenses
  if (v === 'in' || v === 'income' || v === 'deposit') return 'in';
  if (v === 'out' || v === 'expense' || v === 'withdrawal') return 'out';
  if (v === 'saving' || v === 'savings') return 'saving';
  return null;
}

function normalizeDate(raw: string): string | null {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // Accept MM/DD/YYYY too, a common spreadsheet export format.
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = m[1].padStart(2, '0');
    const day = m[2].padStart(2, '0');
    return `${m[3]}-${month}-${day}`;
  }
  return null;
}

export function parseTransactionsCsv(text: string): CsvParseResult {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      rows: [],
      validRows: [],
      invalidRows: [],
      headers: [],
      detectedMapping: { date: null, label: null, amount: null, direction: null },
      headerError: 'The file is empty.',
    };
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const headerFields = rawHeaders.map((h) => normalizeCsvHeader(h));
  const colIndex: Record<string, number> = {};
  headerFields.forEach((h, i) => {
    colIndex[h] = i;
  });

  const missing = REQUIRED_COLUMNS.filter((c) => !(c in colIndex));
  if (missing.length > 0) {
    return {
      rows: [],
      validRows: [],
      invalidRows: [],
      headers: rawHeaders,
      detectedMapping: guessCsvColumnMapping(rawHeaders),
      headerError: `The first row needs a column for each of: date, label, amount (direction is optional). Missing: ${missing.join(', ')}.`,
    };
  }

  const directionIdx = 'direction' in colIndex ? colIndex.direction : -1;
  const detectedMapping = guessCsvColumnMapping(rawHeaders);

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const rowNumber = i + 1;
    const rawDate = fields[colIndex.date] || '';
    const rawLabel = fields[colIndex.label] || '';
    const rawAmount = fields[colIndex.amount] || '';
    const rawDirection = directionIdx >= 0 ? fields[directionIdx] || '' : '';

    const date = normalizeDate(rawDate);
    const amount = parseFloat(rawAmount.replace(/[^0-9.\-]/g, ''));
    const direction = normalizeDirection(rawDirection);

    let error: string | undefined;
    if (!date) error = 'Unrecognized date — use YYYY-MM-DD or MM/DD/YYYY.';
    else if (!rawLabel.trim()) error = 'Missing a label.';
    else if (isNaN(amount) || amount <= 0) error = 'Amount must be a number greater than 0.';
    else if (!direction) error = `Unrecognized direction "${rawDirection}" — use in, out, or saving.`;

    rows.push({
      rowNumber,
      date: date || rawDate,
      label: rawLabel,
      amount: isNaN(amount) ? 0 : amount,
      direction: direction || 'out',
      error,
      rawValues: Object.fromEntries(rawHeaders.map((header, idx) => [normalizeCsvHeader(header), fields[idx] || ''])),
    });
  }

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => !!r.error);

  return { rows, validRows, invalidRows, headers: rawHeaders, detectedMapping };
}

export function looksLikeDuplicateTransaction(
  candidate: { date: string; label: string; amount: number },
  existing: { date: string; label: string; amount: number }
): boolean {
  if (candidate.date !== existing.date) return false;
  if (Math.abs(candidate.amount - existing.amount) > 0.01) return false;
  const a = candidate.label.trim().toLowerCase().replace(/\s+/g, ' ');
  const b = existing.label.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function flagDuplicateRows(
  rows: ParsedCsvRow[],
  existingTransactions: Array<{ date: string; label: string; amount: number }>
): ParsedCsvRow[] {
  return rows.map((row) => ({
    ...row,
    isPossibleDuplicate: existingTransactions.some((transaction) =>
      looksLikeDuplicateTransaction(
        { date: row.date, label: row.label, amount: row.amount },
        transaction
      )
    ),
  }));
}
