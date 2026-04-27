import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  fromIsoDate,
  isValidIsoDate,
  isValidRange,
  toIsoDate,
  type TimelineRange,
} from "@/utils/timelineConfig";

interface DateRangePickerProps {
  value: TimelineRange | null;
  onSave: (range: TimelineRange | null) => void;
  trigger: React.ReactNode;
  align?: "start" | "end" | "center";
  /** Optional bounds shown in the year dropdowns. */
  fromYear?: number;
  toYear?: number;
}

export default function DateRangePicker({
  value,
  onSave,
  trigger,
  align = "end",
  fromYear = 2000,
  toYear = new Date().getFullYear() + 1,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [startStr, setStartStr] = useState<string>(value?.start_date ?? "");
  const [endStr, setEndStr] = useState<string>(value?.end_date ?? "");

  // Sync local state whenever the popover opens or the controlled value changes.
  useEffect(() => {
    if (open) {
      setStartStr(value?.start_date ?? "");
      setEndStr(value?.end_date ?? "");
    }
  }, [open, value]);

  const startDate = useMemo(() => fromIsoDate(startStr), [startStr]);
  const endDate = useMemo(() => fromIsoDate(endStr), [endStr]);

  const rangeInvalid =
    isValidIsoDate(startStr) && isValidIsoDate(endStr) && startStr > endStr;
  const canSave =
    isValidIsoDate(startStr) && isValidIsoDate(endStr) && !rangeInvalid;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ start_date: startStr, end_date: endStr });
    setOpen(false);
  };

  const handleClear = () => {
    setStartStr("");
    setEndStr("");
    onSave(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto max-w-[95vw] p-0"
        sideOffset={6}
      >
        <div className="flex flex-col">
          <div className="px-4 pt-3 pb-2 border-b bg-muted/30">
            <p className="text-sm font-semibold">Select date range</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick a start and end date for the analysis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 p-4">
            {/* Start */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Start date
              </Label>
              <Input
                type="date"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                max={isValidIsoDate(endStr) ? endStr : undefined}
                className="h-9 text-sm w-[180px]"
              />
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  const iso = toIsoDate(d ?? null);
                  if (iso) setStartStr(iso);
                }}
                captionLayout="dropdown-buttons"
                fromYear={fromYear}
                toYear={toYear}
                defaultMonth={startDate ?? endDate ?? new Date()}
                className={cn("p-2 pointer-events-auto rounded-md border")}
              />
            </div>

            {/* End */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                End date
              </Label>
              <Input
                type="date"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                min={isValidIsoDate(startStr) ? startStr : undefined}
                className={cn(
                  "h-9 text-sm w-[180px]",
                  rangeInvalid && "border-destructive focus-visible:ring-destructive",
                )}
              />
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => {
                  const iso = toIsoDate(d ?? null);
                  if (iso) setEndStr(iso);
                }}
                disabled={(d) => {
                  if (!isValidIsoDate(startStr)) return false;
                  const s = fromIsoDate(startStr)!;
                  return d < s;
                }}
                captionLayout="dropdown-buttons"
                fromYear={fromYear}
                toYear={toYear}
                defaultMonth={endDate ?? startDate ?? new Date()}
                className={cn("p-2 pointer-events-auto rounded-md border")}
              />
            </div>
          </div>

          {rangeInvalid && (
            <p className="px-4 pb-2 text-xs text-destructive">
              End date must be on or after start date.
            </p>
          )}

          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!isValidRange(value) && !startStr && !endStr}
            >
              Clear
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}