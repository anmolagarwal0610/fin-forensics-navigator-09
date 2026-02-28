import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REQUIRED_HEADERS,
  HEADER_LABELS,
  matchHeaderRowPartial,
  type RequiredHeader,
} from "@/utils/headerKeywords";
import type { HeaderStatus } from "@/workers/headerDetection.worker";

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
  // Manual mapping: colIndex -> RequiredHeader
  const [manualMapping, setManualMapping] = useState<Record<number, RequiredHeader>>({});

  // Max columns across all rows
  const maxCols = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.length), 0),
    [rows]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialMapping && initialHeaderRow != null) {
        setStep(2);
        setSelectedRow(initialHeaderRow);
        setAccountHolder(initialAccountHolder ?? "");
        // Reconstruct manualMapping from initialMapping
        const headerRow = rows[initialHeaderRow] ?? [];
        const partial = matchHeaderRowPartial(headerRow);
        const mapping: Record<number, RequiredHeader> = {};
        // For unmatched headers, find the column that was mapped
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
    }
  }, [open, fileName]);

  // Partial match info for step 2
  const partialMatch = useMemo(() => {
    if (selectedRow === null || !rows[selectedRow]) return null;
    return matchHeaderRowPartial(rows[selectedRow]);
  }, [selectedRow, rows]);

  // Which required headers are already assigned (auto or manual)
  const assignedHeaders = useMemo(() => {
    const set = new Set<RequiredHeader>();
    if (partialMatch) {
      for (const h of REQUIRED_HEADERS) {
        if (partialMatch.matched[h]) set.add(h);
      }
    }
    Object.values(manualMapping).forEach(h => set.add(h));
    return set;
  }, [partialMatch, manualMapping]);

  // Set of column indices that are auto-matched
  const autoMatchedCols = useMemo(() => {
    const set = new Set<number>();
    if (partialMatch) {
      for (const h of REQUIRED_HEADERS) {
        const m = partialMatch.matched[h];
        if (m) set.add(m.colIndex);
      }
    }
    return set;
  }, [partialMatch]);

  const allAssigned = assignedHeaders.size === REQUIRED_HEADERS.length;
  const canSave = allAssigned && selectedRow !== null;

  const handleSave = () => {
    if (!canSave || selectedRow === null || !partialMatch) return;
    // Build the full column mapping
    const headerRow = rows[selectedRow];
    const mapping: Record<string, string> = {};
    for (const h of REQUIRED_HEADERS) {
      const auto = partialMatch.matched[h];
      if (auto) {
        mapping[h] = headerRow[auto.colIndex];
      } else {
        // Find from manual
        const entry = Object.entries(manualMapping).find(([, v]) => v === h);
        if (entry) mapping[h] = headerRow[Number(entry[0])];
      }
    }
    onSave({
      headerRowIndex: selectedRow,
      columnMapping: mapping as Record<RequiredHeader, string>,
      accountHolderName: accountHolder.trim(),
    });
  };

  const handleNext = () => {
    if (selectedRow !== null) {
      setManualMapping({});
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
        // Remove this header from any other column first
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (v === value) delete next[Number(k)];
        }
        next[colIdx] = value as RequiredHeader;
        return next;
      });
    }
  };

  // Data rows for step 2 (rows after the header row, up to 25)
  const dataRows = useMemo(() => {
    if (selectedRow === null) return [];
    return rows.slice(selectedRow + 1, selectedRow + 26);
  }, [selectedRow, rows]);

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
              : "Map the highlighted columns to the required fields. Columns already matched are shown as-is."}
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
                    {Array.from({ length: maxCols }, (_, i) => (
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
                        {Array.from({ length: maxCols }, (_, colIdx) => (
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
            <div className="flex-1 min-h-0 overflow-auto border rounded-lg max-h-[55vh]">
              <table className="text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  {/* Column labels row */}
                  <tr className="bg-muted">
                    <th className="px-2 py-1.5 border border-border text-center w-10 font-medium text-muted-foreground">
                      #
                    </th>
                    {Array.from({ length: maxCols }, (_, i) => (
                      <th
                        key={i}
                        className="px-3 py-1.5 border border-border text-center font-medium text-muted-foreground whitespace-nowrap min-w-[120px]"
                      >
                        {colLabel(i)}
                      </th>
                    ))}
                  </tr>
                  {/* Header row with dropdowns for unmatched */}
                  {selectedRow !== null && rows[selectedRow] && (
                    <tr className="bg-primary/5 border-b-2 border-primary/30">
                      <td className="px-2 py-1.5 border border-border text-center text-muted-foreground font-mono font-bold">
                        {selectedRow + 1}
                      </td>
                      {Array.from({ length: maxCols }, (_, colIdx) => {
                        const cellValue = rows[selectedRow][colIdx] ?? "";
                        const isAutoMatched = autoMatchedCols.has(colIdx);
                        const manualValue = manualMapping[colIdx];

                        // If auto-matched, show value with checkmark
                        if (isAutoMatched) {
                          return (
                            <td
                              key={colIdx}
                              className="px-3 py-1.5 border border-border whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-medium">{cellValue}</span>
                              </div>
                            </td>
                          );
                        }

                        // Empty cell — no dropdown
                        if (!cellValue.trim()) {
                          return (
                            <td
                              key={colIdx}
                              className="px-3 py-1.5 border border-border"
                            />
                          );
                        }

                        // Unmatched — show dropdown
                        const availableHeaders = REQUIRED_HEADERS.filter(
                          h => !assignedHeaders.has(h) || manualMapping[colIdx] === h
                        );

                        return (
                          <td
                            key={colIdx}
                            className="px-1 py-1 border border-border"
                          >
                            <Select
                              value={manualValue ?? ""}
                              onValueChange={(val) => handleDropdownChange(colIdx, val)}
                            >
                              <SelectTrigger className="h-7 text-xs border-warning/50 bg-warning/5">
                                <SelectValue placeholder={cellValue} />
                              </SelectTrigger>
                              <SelectContent>
                                {manualValue && (
                                  <SelectItem value="__clear__" className="text-xs text-muted-foreground">
                                    — Clear —
                                  </SelectItem>
                                )}
                                {availableHeaders.map(h => (
                                  <SelectItem key={h} value={h} className="text-xs">
                                    {HEADER_LABELS[h]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </thead>
                <tbody>
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
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
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
