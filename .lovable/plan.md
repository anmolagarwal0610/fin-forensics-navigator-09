

# Fix Color Coding Theme Match + Alternating Row Background

## Issues from Screenshot

1. **Green/Pink fallback colors don't match dark theme**: The hardcoded `#d4edda` (light green) and `#ffcccc` (pink) used as fallback beyond row 100 look garish in dark mode. The preview JSON uses darker, theme-appropriate greens/pinks for the first 100 rows.

2. **Beneficiary Name column (col 1) shows white background on alternating rows**: The sticky column uses `bg-background` which is white in light mode. For rows beyond the preview JSON coverage, there's no `cell_bg` entry, so the cell has no background — but the sticky column's `bg-background` class makes it solid white, breaking the visual pattern.

## Changes

### File: `src/components/app/ExcelViewer.tsx`

**1. Fix fallback currency column colors (lines 699-706)**

Replace the hardcoded green with theme-aware colors that match the preview JSON pattern:
- Credit column (value > 0): Light mode `#c6efce` / Dark mode `#1a3a2a` (subtle green)
- Debit column (value > 0): Light mode `#fce4ec` / Dark mode `#3a1a1a` (subtle pink/red)

This requires knowing which currency column is credit vs debit. Use `columnIndices.totalCreditIndex` and `columnIndices.totalDebitIndex` to differentiate:
- If `colIndex === totalCreditIndex` and value > 0 → green tint
- If `colIndex === totalDebitIndex` and value > 0 → pink tint
- Otherwise keep current single-color fallback

**2. Fix alternating row backgrounds for non-preview rows (lines 699-706)**

Add a fallback for ALL columns (not just currency) beyond the preview coverage: apply alternating row backgrounds using even/odd `rowIndex`:
- Even rows: transparent (inherits theme background)
- Odd rows: subtle muted band (`hsl(var(--muted))` equivalent — use `#f0f0f0` light / `#1a1f2e` dark)

This goes BEFORE the currency fallback check, so currency colors override the band.

**3. Fix sticky column background for rows beyond preview (lines 1030-1035)**

The `bg-background` on sticky columns is always applied, which is correct for scroll overlap. But when a cell has a `style.backgroundColor` from `getCellStyle`, the inline style should take precedence. The issue is that `bg-background` in the className overrides the inline style in some cases.

Fix: Instead of `bg-background` on sticky body cells, apply the background conditionally — if `getCellStyle` already set a backgroundColor, skip `bg-background`. Alternatively, ensure the inline style always wins by keeping `bg-background` as a fallback but making sure `getCellStyle` always sets a background for sticky columns (even if it's just the theme background or alternating band color).

The simplest fix: in `getCellStyle`, always set `backgroundColor` for rows beyond preview coverage. For non-currency cells, use the alternating band color. This way the inline `style` always has a value and overrides the Tailwind `bg-background`.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/app/ExcelViewer.tsx` | Theme-aware credit/debit fallback colors, alternating row bands for all rows, fix sticky col background |

