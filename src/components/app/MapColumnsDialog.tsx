import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REQUIRED_HEADERS,
  HEADER_LABELS,
  matchHeaderRowPartial,
  type RequiredHeader,
} from "@/utils/headerKeywords";
import type { HeaderStatus } from "@/workers/headerDetection.worker";

export interface DummyColumnsInfo {
  balance?: { header: string; defaultValue: string };
  date?: { header: string; defaultValue: string };
}

interface MapColumnsDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  rows: string[][];
  headerStatus: HeaderStatus;
  initialHeaderRow?: number | null;
  initialMapping?: Record<RequiredHeader, string> | null;
  initialAccountHolder?: string;
  onSave: (data: {
    headerRowIndex: number;
    columnMapping: Record<RequiredHeader, string>;
    accountHolderName: string;
    dummyColumns?: DummyColumnsInfo;
  }) => void;
}

/** Generate Excel-style column label: A, B, ... Z, AA, AB ... */
function colLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function getTodayFormatted(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function MapColumnsDialog({
  open,
  onClose,
  fileName,
  rows,
  headerStatus,
  initialHeaderRow,
  initialMapping,
  initialAccountHolder,
  onSave,
}: MapColumnsDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [accountHolder, setAccountHolder] = useState("");
  const [manualMapping, setManualMapping] = useState<Record<number, RequiredHeader>>({});
  const [dummyCols, setDummyCols] = useState<{ balance: boolean; date: boolean }>({ balance: false, date: false });
  const [showHint, setShowHint] = useState(true);
  const step2TableRef = useRef<HTMLDivElement>(null);

  // Build working rows with dummy columns appended (only for rows with data)
  const workingRows = useMemo(() => {
    if (!dummyCols.balance && !dummyCols.date) return rows;
    const today = getTodayFormatted();
    return rows.map((row, idx) => {
      const hasData = row.some(cell => cell && cell.trim() !== "");
      const isHeader = idx === selectedRow;
      if (!hasData && !isHeader) return [...row]; // don't append to empty rows
      const newRow = [...row];
      if (dummyCols.date) {
        newRow.push(isHeader ? "Transaction Date" : today);
      }
      if (dummyCols.balance) {
        newRow.push(isHeader ? "Balance" : "0");
      }
      return newRow;
    });
  }, [rows, dummyCols, selectedRow]);

  // Max columns across all working rows
  const maxCols = useMemo(
    () => workingRows.reduce((max, row) => Math.max(max, row.length), 0),
    [workingRows]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialMapping && initialHeaderRow != null) {
        setStep(2);
        setSelectedRow(initialHeaderRow);
        setAccountHolder(initialAccountHolder ?? "");
        const headerRow = rows[initialHeaderRow] ?? [];
        const partial = matchHeaderRowPartial(headerRow);
        const mapping: Record<number, RequiredHeader> = {};
        for (const header of partial.unmatched) {
          const mappedValue = initialMapping[header];
          if (mappedValue) {
            const colIdx = headerRow.findIndex(c => c === mappedValue);
            if (colIdx >= 0) mapping[colIdx] = header;
          }
        }
        setManualMapping(mapping);
      } else {
        setStep(1);
        setSelectedRow(null);
        setManualMapping({});
        setAccountHolder("");
      }
      setDummyCols({ balance: false, date: false });
      setShowHint(true);
    }
  }, [open, fileName]);

  // Auto-dismiss hint after 25s or when row selected
  useEffect(() => {
    if (!open || step !== 1) return;
    if (selectedRow !== null) {
      setShowHint(false);
      return;
    }
    const timer = setTimeout(() => setShowHint(false), 25000);
    return () => clearTimeout(timer);
  }, [open, step, selectedRow]);

  // Partial match info for step 2 (using working rows)
  const partialMatch = useMemo(() => {
    if (selectedRow === null || !workingRows[selectedRow]) return null;
    return matchHeaderRowPartial(workingRows[selectedRow]);
  }, [selectedRow, workingRows]);

  // Combined mapping: merge auto-matched + manual into a single record keyed by colIndex
  const combinedMapping = useMemo(() => {
    const map: Record<number, RequiredHeader> = {};
    if (partialMatch) {
      for (const h of REQUIRED_HEADERS) {
        const m = partialMatch.matched[h];
        if (m) map[m.colIndex] = h;
      }
    }
    // Manual overrides
    for (const [colIdx, h] of Object.entries(manualMapping)) {
      // Remove any previous auto-match for this header
      for (const [k, v] of Object.entries(map)) {
        if (v === h && k !== colIdx) delete map[Number(k)];
      }
      map[Number(colIdx)] = h;
    }
    return map;
  }, [partialMatch, manualMapping]);

  const assignedHeaders = useMemo(() => {
    return new Set<RequiredHeader>(Object.values(combinedMapping));
  }, [combinedMapping]);

  // Which headers are unmatched (for CTA visibility)
  const unmatchedHeaders = useMemo(() => {
    return REQUIRED_HEADERS.filter(h => !assignedHeaders.has(h));
  }, [assignedHeaders]);

  const allAssigned = assignedHeaders.size === REQUIRED_HEADERS.length;
  const canSave = allAssigned && selectedRow !== null;

  const handleSave = () => {
    if (!canSave || selectedRow === null) return;
    const headerRow = workingRows[selectedRow];
    const mapping: Record<string, string> = {};
    for (const h of REQUIRED_HEADERS) {
      const colIdx = Object.entries(combinedMapping).find(([, v]) => v === h)?.[0];
      if (colIdx !== undefined) {
        mapping[h] = headerRow[Number(colIdx)];
      }
    }

    const dummyColumnsInfo: DummyColumnsInfo = {};
    if (dummyCols.date) {
      dummyColumnsInfo.date = { header: "Transaction Date", defaultValue: getTodayFormatted() };
    }
    if (dummyCols.balance) {
      dummyColumnsInfo.balance = { header: "Balance", defaultValue: "0" };
    }

    onSave({
      headerRowIndex: selectedRow,
      columnMapping: mapping as Record<RequiredHeader, string>,
      accountHolderName: accountHolder.trim(),
      dummyColumns: Object.keys(dummyColumnsInfo).length > 0 ? dummyColumnsInfo : undefined,
    });
  };

  const handleNext = () => {
    if (selectedRow !== null) {
      setManualMapping({});
      setDummyCols({ balance: false, date: false });
      setStep(2);
    }
  };

  const handleCheckbox = (rowIdx: number) => {
    setSelectedRow(prev => (prev === rowIdx ? null : rowIdx));
  };

  const handleDropdownChange = (colIdx: number, value: string) => {
    if (value === "__clear__") {
      setManualMapping(prev => {
        const next = { ...prev };
        delete next[colIdx];
        return next;
      });
    } else {
      setManualMapping(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (v === value) delete next[Number(k)];
        }
        next[colIdx] = value as RequiredHeader;
        return next;
      });
    }
  };

  const addDummyColumn = (type: 'balance' | 'date') => {
    setDummyCols(prev => ({ ...prev, [type]: true }));
    // Auto-scroll to the right after render
    setTimeout(() => {
      if (step2TableRef.current) {
        step2TableRef.current.scrollLeft = step2TableRef.current.scrollWidth;
      }
    }, 100);
  };

  const removeDummyColumn = (type: 'balance' | 'date') => {
    setDummyCols(prev => ({ ...prev, [type]: false }));
    // Remove any manual mapping pointing to this header
    setManualMapping(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v === type) delete next[Number(k)];
      }
      return next;
    });
  };

  // Data rows for step 2 (rows after the header row, up to 25)
  const dataRows = useMemo(() => {
    if (selectedRow === null) return [];
    return workingRows.slice(selectedRow + 1, selectedRow + 26);
  }, [selectedRow, workingRows]);

  // Determine which dummy columns are at which indices
  const dummyColIndices = useMemo(() => {
    const originalMaxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const indices: Record<string, number> = {};
    let offset = originalMaxCols;
    if (dummyCols.date) {
      indices.date = offset;
      offset++;
    }
    if (dummyCols.balance) {
      indices.balance = offset;
    }
    return indices;
  }, [rows, dummyCols]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 space-y-3">
          <DialogTitle>
            {step === 1 ? "Select Header Row" : "Map Header Columns"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Select the row that contains your column headers."
              : "Map columns to the required fields using the dropdowns in the first row."}
          </DialogDescription>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-xs shrink-0">
              {fileName}
            </Badge>
            <Input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Account Name (Optional)"
              className="h-8 w-64 text-sm"
            />
          </div>
        </DialogHeader>

        {step === 1 ? (
          /* ───── STEP 1: Select Header Row ───── */
          <div className="flex-1 min-h-0 flex flex-col px-6 pb-6 gap-4">
            {/* Hint tooltip above the table */}
            {showHint && selectedRow === null && (
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border shadow-md text-xs text-foreground animate-in fade-in slide-in-from-top-1 duration-300">
                  Please select the header row.
                  <span className="absolute -bottom-1.5 left-4 w-3 h-3 bg-muted border-b border-r border-border rotate-45" />
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto border rounded-lg max-h-[55vh]">
              <table className="text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 border border-border text-center w-10 font-medium text-muted-foreground sticky left-0 bg-muted z-20">
                      ✓
                    </th>
                    <th className="px-2 py-1.5 border border-border text-center w-10 font-medium text-muted-foreground">
                      #
                    </th>
                    {Array.from({ length: rows.reduce((max, row) => Math.max(max, row.length), 0) }, (_, i) => (
                      <th
                        key={i}
                        className="px-3 py-1.5 border border-border text-center font-medium text-muted-foreground whitespace-nowrap min-w-[100px]"
                      >
                        {colLabel(i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isSelected = selectedRow === idx;
                    return (
                      <tr
                        key={idx}
                        className={cn(
                          "transition-colors",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <td className="px-2 py-1 border border-border text-center sticky left-0 z-10 bg-inherit">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleCheckbox(idx)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-2 py-1 border border-border text-center text-muted-foreground font-mono">
                          {idx + 1}
                        </td>
                        {Array.from({ length: rows.reduce((max, r) => Math.max(max, r.length), 0) }, (_, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-3 py-1 border border-border whitespace-nowrap"
                          >
                            {row[colIdx] ?? ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={selectedRow === null}>
                Next
              </Button>
            </div>
          </div>
        ) : (
          /* ───── STEP 2: Map Header Columns ───── */
          <div className="flex-1 min-h-0 flex flex-col px-6 pb-6 gap-4">
            {/* Warning for unmatched headers */}
            {partialMatch && unmatchedHeaders.length > 0 && (
              <Alert className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  {(() => {
                    const names = unmatchedHeaders.map(h => HEADER_LABELS[h]);
                    const formatted = names.length === 1
                      ? <strong>{names[0]}</strong>
                      : names.length === 2
                        ? <><strong>{names[0]}</strong> &amp; <strong>{names[1]}</strong></>
                        : <>{names.slice(0, -1).map((n, i) => <span key={i}><strong>{n}</strong>{i < names.length - 2 ? ', ' : ''}</span>)} &amp; <strong>{names[names.length - 1]}</strong></>;
                    const fieldWord = names.length === 1 ? 'field' : 'fields';
                    return <>Could not detect {formatted} header. Please map {names.length === 1 ? 'this' : 'these'} {fieldWord} from the dropdown or add a dummy column.</>;
                  })()}
                </AlertDescription>
              </Alert>
            )}

            {/* Dummy column CTAs */}
            {(() => {
              const showDateCta = unmatchedHeaders.includes('date') || dummyCols.date;
              const showBalanceCta = unmatchedHeaders.includes('balance') || dummyCols.balance;
              if (!showDateCta && !showBalanceCta) return null;
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  {showDateCta && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dummyCols.date}
                      onClick={() => addDummyColumn('date')}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Date Column
                    </Button>
                  )}
                  {showBalanceCta && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dummyCols.balance}
                      onClick={() => addDummyColumn('balance')}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Balance Column
                    </Button>
                  )}
                </div>
              );
            })()}

            <div ref={step2TableRef} className="flex-1 min-h-0 overflow-auto border rounded-lg max-h-[55vh]">
              <table className="text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  {/* Row 1: Column labels (# A B C ...) */}
                  <tr className="bg-muted">
                    <th className="px-2 py-1.5 border border-border text-center w-10 font-medium text-muted-foreground">
                      #
                    </th>
                    {Array.from({ length: maxCols }, (_, i) => {
                      const isDummy = dummyColIndices.date === i || dummyColIndices.balance === i;
                      return (
                        <th
                          key={i}
                          className={cn(
                            "px-3 py-1.5 border border-border text-center font-medium text-muted-foreground whitespace-nowrap min-w-[120px]",
                            isDummy && "bg-primary/5"
                          )}
                        >
                          {colLabel(i)}
                        </th>
                      );
                    })}
                  </tr>
                  {/* Row 2: Mapping dropdowns row (below # A B, above selected header) */}
                  <tr className="bg-background border-b-2 border-primary/20">
                    <th className="px-2 py-1.5 border border-border text-center w-10 font-medium text-muted-foreground bg-background">
                      Map
                    </th>
                    {Array.from({ length: maxCols }, (_, colIdx) => {
                      const headerRow = selectedRow !== null ? workingRows[selectedRow] : [];
                      const cellValue = headerRow?.[colIdx] ?? "";
                      const currentMapping = combinedMapping[colIdx];
                      const isAutoMatched = partialMatch?.matched[currentMapping as RequiredHeader]?.colIndex === colIdx && !manualMapping[colIdx];
                      const isDummyDate = dummyColIndices.date === colIdx;
                      const isDummyBalance = dummyColIndices.balance === colIdx;
                      const isDummy = isDummyDate || isDummyBalance;

                      // Empty cell — no dropdown
                      if (!cellValue.trim() && !isDummy) {
                        return (
                          <th key={colIdx} className="px-3 py-1.5 border border-border bg-background min-w-[120px]" />
                        );
                      }

                      const availableHeaders = REQUIRED_HEADERS.filter(
                        h => !assignedHeaders.has(h) || combinedMapping[colIdx] === h
                      );

                      return (
                        <th key={colIdx} className="px-1 py-1 border border-border bg-background min-w-[120px]">
                          <div className="flex items-center gap-1">
                            {currentMapping && isAutoMatched && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                            <Select
                              value={currentMapping ?? ""}
                              onValueChange={(val) => handleDropdownChange(colIdx, val)}
                            >
                              <SelectTrigger className={cn(
                                "h-7 text-xs",
                                currentMapping
                                  ? "border-emerald-500/50 bg-emerald-500/5"
                                  : "border-muted-foreground/30"
                              )}>
                                <SelectValue placeholder="Select Header" />
                              </SelectTrigger>
                              <SelectContent>
                                {currentMapping && (
                                  <SelectItem value="__clear__" className="text-xs text-muted-foreground">
                                    — Clear —
                                  </SelectItem>
                                )}
                                {availableHeaders.map(h => (
                                  <SelectItem key={h} value={h} className="text-xs">
                                    {HEADER_LABELS[h]}
                                  </SelectItem>
                                ))}
                                {currentMapping && !availableHeaders.includes(currentMapping) && (
                                  <SelectItem key={currentMapping} value={currentMapping} className="text-xs">
                                    {HEADER_LABELS[currentMapping]}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {isDummyDate && (
                              <button
                                onClick={() => removeDummyColumn('date')}
                                className="rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            {isDummyBalance && (
                              <button
                                onClick={() => removeDummyColumn('balance')}
                                className="rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Selected header row — plain text, grey background */}
                  {selectedRow !== null && workingRows[selectedRow] && (
                    <tr className="bg-muted/30">
                      <td className="px-2 py-1.5 border border-border text-center text-muted-foreground font-mono font-bold">
                        {selectedRow + 1}
                      </td>
                      {Array.from({ length: maxCols }, (_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-3 py-1.5 border border-border whitespace-nowrap font-medium"
                        >
                          {workingRows[selectedRow][colIdx] ?? ""}
                        </td>
                      ))}
                    </tr>
                  )}
                  {/* Data rows */}
                  {dataRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1 border border-border text-center text-muted-foreground font-mono">
                        {(selectedRow ?? 0) + 2 + idx}
                      </td>
                      {Array.from({ length: maxCols }, (_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-3 py-1 border border-border whitespace-nowrap"
                        >
                          {row[colIdx] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep(1); setDummyCols({ balance: false, date: false }); }} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={!canSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
