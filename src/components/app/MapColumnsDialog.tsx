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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REQUIRED_HEADERS,
  HEADER_LABELS,
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
  const [step, setStep] = useState<1 | 2>(initialMapping ? 2 : 1);
  const [selectedRow, setSelectedRow] = useState<number | null>(
    initialHeaderRow ?? null
  );
  const [mapping, setMapping] = useState<Partial<Record<RequiredHeader, string>>>(
    initialMapping ?? {}
  );
  const [accountHolder, setAccountHolder] = useState(initialAccountHolder ?? "");

  const isDisabled = headerStatus === "no-headers" || headerStatus === "single-column";

  // Reset state when dialog opens with new file
  useEffect(() => {
    if (open) {
      if (initialMapping) {
        setStep(2);
        setSelectedRow(initialHeaderRow ?? null);
        setMapping(initialMapping);
        setAccountHolder(initialAccountHolder ?? "");
      } else {
        setStep(1);
        setSelectedRow(null);
        setMapping({});
        setAccountHolder("");
      }
    }
  }, [open, fileName]);

  // Get column values from selected row for dropdowns
  const headerOptions = useMemo(() => {
    if (selectedRow === null || !rows[selectedRow]) return [];
    return rows[selectedRow]
      .map((val, idx) => ({ value: val, index: idx }))
      .filter((opt) => opt.value.trim() !== "");
  }, [selectedRow, rows]);

  const allMapped = REQUIRED_HEADERS.every(
    (h) => mapping[h] && mapping[h]!.trim() !== ""
  );
  const canSave = !isDisabled && allMapped && selectedRow !== null;

  const handleSave = () => {
    if (!canSave || selectedRow === null) return;
    onSave({
      headerRowIndex: selectedRow,
      columnMapping: mapping as Record<RequiredHeader, string>,
      accountHolderName: accountHolder.trim(),
    });
  };

  const handleNext = () => {
    if (selectedRow !== null) {
      // Pre-populate mapping with empty values
      if (Object.keys(mapping).length === 0) {
        const init: Partial<Record<RequiredHeader, string>> = {};
        REQUIRED_HEADERS.forEach((h) => (init[h] = ""));
        setMapping(init);
      }
      setStep(2);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 ? "Select Header Row" : "Map Header Columns"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Please select the row which best depicts the header row."
              : "Please select the header against the required header from the dropdown and Save the configuration."}
          </DialogDescription>
          <Badge variant="outline" className="w-fit text-xs mt-1">
            {fileName}
          </Badge>
        </DialogHeader>

        {step === 1 ? (
          /* ───── STEP 1: Select Header Row ───── */
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {isDisabled && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/40 bg-warning/10 text-warning-foreground text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {headerStatus === "single-column"
                    ? "All data appears to be in a single column. Headers cannot be mapped."
                    : "Fewer than 5 columns detected. Headers cannot be mapped."}
                </span>
              </div>
            )}
            <ScrollArea className="flex-1 border rounded-lg max-h-[50vh]">
              <div className="min-w-max">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium w-12">
                        Row
                      </th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const cellText = row.filter((c) => c.trim()).join(" | ");
                      if (!cellText.trim()) return null;
                      return (
                        <tr
                          key={idx}
                          onClick={() => !isDisabled && setSelectedRow(idx)}
                          className={cn(
                            "cursor-pointer transition-colors border-b",
                            isDisabled && "cursor-not-allowed opacity-60",
                            selectedRow === idx
                              ? "bg-primary/10 border-primary/30"
                              : "hover:bg-muted/60"
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                            {cellText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={selectedRow === null || isDisabled}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          /* ───── STEP 2: Map Header Columns ───── */
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {isDisabled && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/40 bg-warning/10 text-warning-foreground text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No Headers Detected
              </div>
            )}

            <div className="space-y-3">
              {REQUIRED_HEADERS.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-4"
                >
                  <Label className="w-32 text-sm font-medium shrink-0">
                    {HEADER_LABELS[header]}
                  </Label>
                  <Select
                    value={mapping[header] || ""}
                    onValueChange={(val) =>
                      setMapping((prev) => ({ ...prev, [header]: val }))
                    }
                    disabled={isDisabled || headerOptions.length === 0}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          isDisabled || headerOptions.length === 0
                            ? "No Headers Detected"
                            : "Select Header"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {headerOptions.map((opt) => (
                        <SelectItem key={opt.index} value={opt.value}>
                          {opt.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Account Holder Name */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <Label className="w-32 text-sm font-medium shrink-0">
                Account Holder's Name
              </Label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Optional"
                className="flex-1"
                disabled={isDisabled}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave}
                className="gap-2"
              >
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
