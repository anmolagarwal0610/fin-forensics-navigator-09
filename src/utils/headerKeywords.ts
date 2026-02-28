/**
 * Header keyword constants and matching logic for Excel/CSV file header detection.
 * Used by the header detection Web Worker and MapColumnsDialog.
 */

export const REQUIRED_HEADERS = ['date', 'description', 'debit', 'credit', 'balance'] as const;
export type RequiredHeader = typeof REQUIRED_HEADERS[number];

export const HEADER_KEYWORDS: Record<RequiredHeader, string[]> = {
  date: [
    'date', 'transaction_date', 'txn_date', 'txn_dt', 'post_date',
    'posting_date', 'pstd_dt', 'entry_date', 'book_date', 'value_date',
  ],
  description: [
    'narration', 'description', 'descriptions', 'particulars', 'details',
    'transaction_particulars', 'remarks', 'trans_desc', 'memo',
  ],
  debit: [
    'debit', 'debits', 'debit_amount', 'debit_amt', 'withdrawal_amt',
    'withdrawal_amount', 'dr', 'dr_amount', 'withdrawals', 'money_out', 'paid_out',
  ],
  credit: [
    'credit', 'credits', 'credit_amount', 'credit_amt', 'deposit_amt',
    'deposit_amount', 'cr', 'cr_amount', 'deposits', 'money_in', 'paid_in',
  ],
  balance: [
    'balance', 'closing_balance', 'running_balance', 'available_balance',
    'line_balance', 'bal', 'bal_amt',
  ],
};

/**
 * Normalize a cell value for keyword matching:
 * lowercase, trim, replace spaces with underscores, remove non-alphanumeric (except _)
 */
export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Try to match a single row against all required header keywords.
 * Returns a mapping { requiredHeader: originalColumnValue } if ALL 5 match uniquely,
 * or null if any header has 0 matches or multiple headers match the same column.
 */
export function matchHeaderRow(
  row: string[]
): Record<RequiredHeader, string> | null {
  const normalized = row.map(normalizeHeader);
  const mapping: Partial<Record<RequiredHeader, string>> = {};
  const usedIndices = new Set<number>();

  for (const header of REQUIRED_HEADERS) {
    const keywords = HEADER_KEYWORDS[header];
    let matchIndex = -1;
    let matchCount = 0;

    for (let i = 0; i < normalized.length; i++) {
      if (usedIndices.has(i)) continue;
      if (keywords.includes(normalized[i])) {
        matchIndex = i;
        matchCount++;
      }
    }

    // Exactly one match required per header
    if (matchCount !== 1) return null;

    usedIndices.add(matchIndex);
    mapping[header] = row[matchIndex];
  }

  return mapping as Record<RequiredHeader, string>;
}

export const HEADER_LABELS: Record<RequiredHeader, string> = {
  date: 'Date',
  description: 'Description',
  debit: 'Debit',
  credit: 'Credit',
  balance: 'Balance',
};
