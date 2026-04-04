import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { CreditCard, X, Download, Filter, CalendarIcon, Users, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { format, parse, isValid, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import TraceTransactionModal from "./TraceTransactionModal";
import type { SelectedTransaction, TraceTreeResponse, BatchTraceResponse, DebitTraceResponse, CreditTraceResponse } from "@/types/traceTransaction";
import { checkBatchCache, checkOnDemandCacheZip, getFromMemoryCache, requestOnDemandTrace } from "@/lib/traceTransaction";
import type JSZip from "jszip";

export interface TransactionRow {
  description: string;
  debit: number | string;
  credit: number | string;
  balance: number | string;
  beneficiary: string;
  date: string;
  transaction_type: string;
  source_file?: string;
}

interface BeneficiaryTransactionsDialogProps {
  open: boolean;
  onClose: () => void;
  beneficiaryName: string;
  transactions: TransactionRow[];
  isLoading?: boolean;
  onEditGroupedNames?: () => void;
  fundTracesData?: BatchTraceResponse | null;
  zipData?: JSZip | null;
  caseId?: string;
}

export default function BeneficiaryTransactionsDialog({
  open,
  onClose,
  beneficiaryName,
  transactions,
  isLoading = false,
  onEditGroupedNames,
  fundTracesData,
  zipData,
  caseId,
}: BeneficiaryTransactionsDialogProps) {
  
  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Trace transaction state
  const [selectedTxIndices, setSelectedTxIndices] = useState<Set<number>>(new Set());
  const [showTraceModal, setShowTraceModal] = useState(false);

  const [traceData, setTraceData] = useState<DebitTraceResponse | CreditTraceResponse | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  
  // Parse transaction date
  const parseTransactionDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const str = dateStr.trim();
    
    // Try common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM/YY
    const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'dd/MM/yy', 'dd-MM-yy'];
    for (const fmt of formats) {
      try {
        const parsed = parse(str, fmt, new Date());
        if (isValid(parsed)) return parsed;
      } catch {
        continue;
      }
    }
    
    // Try native Date parsing as fallback
    const nativeDate = new Date(str);
    return isValid(nativeDate) ? nativeDate : null;
  };

  // Extract unique transaction types
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    transactions.forEach(tx => {
      if (tx.transaction_type && tx.transaction_type.trim()) {
        types.add(tx.transaction_type.trim().toUpperCase());
      }
    });
    return Array.from(types).sort();
  }, [transactions]);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Transaction type filter
      if (selectedTypes.length > 0) {
        const txType = (tx.transaction_type || '').trim().toUpperCase();
        if (!selectedTypes.includes(txType)) return false;
      }
      
      // Date range filter
      if (dateRange?.from || dateRange?.to) {
        const txDate = parseTransactionDate(tx.date);
        if (!txDate) return true; // Keep if date can't be parsed
        
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(txDate, { 
            start: startOfDay(dateRange.from), 
            end: endOfDay(dateRange.to) 
          })) {
            return false;
          }
        } else if (dateRange.from && txDate < startOfDay(dateRange.from)) {
          return false;
        } else if (dateRange.to && txDate > endOfDay(dateRange.to)) {
          return false;
        }
      }
      
      return true;
    });
  }, [transactions, selectedTypes, dateRange]);

  const hasActiveFilters = selectedTypes.length > 0 || dateRange?.from || dateRange?.to;

  // Build selected transactions for trace — use original index in transactions array
  const selectedTransactions: SelectedTransaction[] = useMemo(() => {
    return Array.from(selectedTxIndices).map((filteredIdx) => {
      const tx = filteredTransactions[filteredIdx];
      if (!tx) return null;
      // Find original index in unfiltered transactions for correct cache lookup
      const originalIdx = transactions.indexOf(tx);
      const debitNum = typeof tx.debit === 'string' ? parseFloat(tx.debit.replace(/[₹$€£,\s]/g, '')) : (tx.debit as number);
      const creditNum = typeof tx.credit === 'string' ? parseFloat(tx.credit.replace(/[₹$€£,\s]/g, '')) : (tx.credit as number);
      return {
        beneficiary: tx.beneficiary || beneficiaryName,
        amount: debitNum || creditNum || 0,
        date: tx.date || '',
        source_file: tx.source_file || '',
        description: tx.description,
        debit: tx.debit,
        credit: tx.credit,
        row_index: originalIdx >= 0 ? originalIdx : filteredIdx,
      };
    }).filter(Boolean) as SelectedTransaction[];
  }, [selectedTxIndices, filteredTransactions, transactions, beneficiaryName]);

  // Current trace index for sequential tracing
  const [currentTraceIdx, setCurrentTraceIdx] = useState(0);
  const selectedTransaction = selectedTransactions[currentTraceIdx] || null;

  // Trace fetch logic: batch cache → ZIP cache → memory cache → API
  const fetchTraceForTransaction = useCallback(async (tx: SelectedTransaction) => {
    const fileName = tx.source_file;
    const rowIndex = tx.row_index;

    // 1. Batch cache
    if (fundTracesData) {
      const batchHit = checkBatchCache(fundTracesData, fileName, rowIndex);
      if (batchHit && batchHit.tree) {
        // Convert BatchTraceSeed to DebitTraceResponse-like
        return {
          metadata: { request: { file_name: fileName, row_index: rowIndex, amount: tx.amount, type: "debit" as const }, window_days: fundTracesData.metadata.window_days, min_confidence: fundTracesData.metadata.min_confidence, generated_at: fundTracesData.metadata.generated_at },
          trace: batchHit,
        } as any;
      }
    }

    // 2. ZIP on-demand cache
    const zipHit = await checkOnDemandCacheZip(zipData, fileName, rowIndex);
    if (zipHit) return zipHit;

    // 3. In-memory LRU cache
    const memHit = getFromMemoryCache(fileName, rowIndex);
    if (memHit) return memHit;

    // 4. API call
    if (!caseId) throw new Error("Case ID not available for trace request");
    const debitNum = typeof tx.debit === 'string' ? parseFloat(tx.debit.replace(/[₹$€£,\s]/g, '')) : (tx.debit as number);
    const creditNum = typeof tx.credit === 'string' ? parseFloat(tx.credit.replace(/[₹$€£,\s]/g, '')) : (tx.credit as number);
    const txType: "debit" | "credit" = (debitNum && debitNum > 0) ? "debit" : "credit";
    
    const results = await requestOnDemandTrace({
      window_days: 5,
      transactions: [{ file_name: fileName, row_index: rowIndex, amount: tx.amount, type: txType }],
    }, caseId);

    return results[0] || null;
  }, [fundTracesData, zipData, caseId]);

  const handleTraceClick = useCallback(async () => {
    if (selectedTransactions.length === 0) return;
    setCurrentTraceIdx(0);
    setTraceError(null);
    setTraceLoading(true);
    setShowTraceModal(true);

    try {
      const result = await fetchTraceForTransaction(selectedTransactions[0]);
      setTraceData(result);
    } catch (err: any) {
      setTraceError(err?.message || "Failed to fetch trace data");
    } finally {
      setTraceLoading(false);
    }
  }, [selectedTransactions, fetchTraceForTransaction]);

  const handleTraceNext = useCallback(async () => {
    const nextIdx = currentTraceIdx + 1;
    if (nextIdx >= selectedTransactions.length) {
      setShowTraceModal(false);
      setCurrentTraceIdx(0);
      setTraceData(null);
      return;
    }
    setCurrentTraceIdx(nextIdx);
    setTraceLoading(true);
    setTraceError(null);
    try {
      const result = await fetchTraceForTransaction(selectedTransactions[nextIdx]);
      setTraceData(result);
    } catch (err: any) {
      setTraceError(err?.message || "Failed to fetch trace data");
    } finally {
      setTraceLoading(false);
    }
  }, [currentTraceIdx, selectedTransactions, fetchTraceForTransaction]);
  
  const formatAmount = (value: number | string): string => {
    if (value === null || value === undefined || value === "" || value === 0) return "-";
    const num = typeof value === "string" ? parseFloat(value.replace(/[₹$€£,\s]/g, "")) : value;
    if (isNaN(num) || num === 0) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (value: string): string => {
    if (!value) return "-";
    return String(value).trim();
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setDateRange(undefined);
  };

  const downloadAsCSV = () => {
    const dataToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    if (dataToExport.length === 0) return;
    
    const headers = ['Description', 'Debit', 'Credit', 'Balance', 'Beneficiary', 'Date', 'Transaction Type', 'Source File'];
    const rows = dataToExport.map(tx => [
      tx.description || '',
      tx.debit || '',
      tx.credit || '',
      tx.balance || '',
      tx.beneficiary || '',
      tx.date || '',
      tx.transaction_type || '',
      tx.source_file || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${beneficiaryName.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "CSV downloaded successfully" });
  };

  const getTransactionTypeBadgeClass = (type: string): string => {
    const upperType = type?.toUpperCase() || '';
    switch (upperType) {
      case 'UPI':
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800";
      case 'NEFT':
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      case 'RTGS':
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case 'IMPS':
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800";
      case 'CASH':
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
      case 'CHEQUE':
      case 'CHQ':
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                  Transactions for "{beneficiaryName}"
                </DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                  Detailed transaction history from the raw file
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTxIndices.size > 0 && (
                <Button
                  size="sm"
                  variant="accent"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleTraceClick}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Trace {selectedTxIndices.size > 1 ? `${selectedTxIndices.size} Transactions` : "Transaction"}
                </Button>
              )}
              <Badge variant="secondary" className="text-xs font-medium px-2 sm:px-3 py-1 shrink-0">
                {hasActiveFilters 
                  ? `${filteredTransactions.length} of ${transactions.length}` 
                  : transactions.length} {transactions.length === 1 ? "tx" : "txs"}
              </Badge>
            </div>
          </div>

          {/* Filters Row */}
          {transactions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Edit Grouped Names CTA */}
              {onEditGroupedNames && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={onEditGroupedNames}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">Edit Grouped Names</span>
                </Button>
              )}
              {uniqueTypes.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-8 gap-1.5",
                        selectedTypes.length > 0 && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span className="text-xs">
                        Type {selectedTypes.length > 0 && `(${selectedTypes.length})`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-3 bg-popover z-50" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Transaction Type</Label>
                        {selectedTypes.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => setSelectedTypes([])}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {uniqueTypes.map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`type-${type}`}
                              checked={selectedTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                setSelectedTypes(prev => 
                                  checked 
                                    ? [...prev, type]
                                    : prev.filter(t => t !== type)
                                );
                              }}
                            />
                            <Label 
                              htmlFor={`type-${type}`} 
                              className="text-xs cursor-pointer flex items-center gap-2"
                            >
                              <Badge 
                                variant="outline" 
                                className={cn("text-[10px] px-1.5 py-0", getTransactionTypeBadgeClass(type))}
                              >
                                {type}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Date Range Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-8 gap-1.5",
                      (dateRange?.from || dateRange?.to) && "border-primary/50 bg-primary/5"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      {dateRange?.from || dateRange?.to 
                        ? `${dateRange.from ? format(dateRange.from, 'dd/MM') : '...'} - ${dateRange.to ? format(dateRange.to, 'dd/MM') : '...'}`
                        : 'Date Range'
                      }
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-popover z-50" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Select Date Range</Label>
                      {(dateRange?.from || dateRange?.to) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => setDateRange(undefined)}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear All Filters */}
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-3 sm:px-6 py-3 sm:py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 sm:h-48">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
              <span className="ml-2 sm:ml-3 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-muted-foreground">
              <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-30" />
              <p className="text-sm">
                {hasActiveFilters 
                  ? "No transactions match the selected filters." 
                  : "No transactions found."}
              </p>
              {hasActiveFilters && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-2 text-xs"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[300px] sm:h-[400px] rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-auto min-w-[1100px]">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold w-[22%]">Description</th>
                    <th className="px-3 py-3 text-right font-semibold w-[8%]">Debit</th>
                    <th className="px-3 py-3 text-right font-semibold w-[8%]">Credit</th>
                    <th className="px-3 py-3 text-right font-semibold w-[9%]">Balance</th>
                    <th className="px-3 py-3 text-left font-semibold w-[11%]">Beneficiary</th>
                    <th className="px-3 py-3 text-left font-semibold w-[9%]">Date</th>
                    <th className="px-3 py-3 text-left font-semibold w-[11%]">Transaction Type</th>
                    <th className="px-3 py-3 text-left font-semibold w-[12%]">Source File</th>
                    <th className="px-3 py-3 text-center font-semibold w-[10%]">Select Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/30 transition-colors",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <span 
                          className="text-xs leading-relaxed whitespace-normal" 
                          title={tx.description}
                        >
                          {tx.description || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        <span className={cn(
                          tx.debit && tx.debit !== 0 && tx.debit !== "0" 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-muted-foreground"
                        )}>
                          {formatAmount(tx.debit)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        <span className={cn(
                          tx.credit && tx.credit !== 0 && tx.credit !== "0"
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        )}>
                          {formatAmount(tx.credit)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-medium">
                        {formatAmount(tx.balance)}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-normal" title={tx.beneficiary}>
                        {tx.beneficiary || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {tx.transaction_type ? (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-normal",
                              getTransactionTypeBadgeClass(tx.transaction_type)
                            )}
                          >
                            {tx.transaction_type}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[150px]" title={tx.source_file || '-'}>
                        {tx.source_file || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Checkbox
                          checked={selectedTxIndices.has(idx)}
                          onCheckedChange={(checked) => {
                            setSelectedTxIndices((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(idx);
                              else next.delete(idx);
                              return next;
                            });
                          }}
                          className="mx-auto"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-3 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
          <Button 
            variant="outline" 
            onClick={downloadAsCSV} 
            className="gap-2 w-full sm:w-auto"
            disabled={filteredTransactions.length === 0}
            size="sm"
          >
            <Download className="h-4 w-4" />
            Download CSV {hasActiveFilters && `(${filteredTransactions.length})`}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2 w-full sm:w-auto" size="sm">
            <X className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>

        {/* Trace Transaction Modal */}
        <TraceTransactionModal
          open={showTraceModal}
          onClose={handleTraceNext}
          selectedTransaction={selectedTransaction}
          traceData={traceData}
          isLoading={traceLoading}
          error={traceError}
        />
      </DialogContent>
    </Dialog>
  );
}
