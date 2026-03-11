import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, X, Download, Users, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import TraceTransactionModal from "./TraceTransactionModal";
import type { SelectedTransaction, TraceTreeResponse } from "@/types/traceTransaction";

export interface POITransactionRow {
  description: string;
  suspicious_reason: string;
  debit: number | string;
  credit: number | string;
  balance: number | string;
  date: string;
  beneficiary: string;
  source_file: string;
}

interface POITransactionsDialogProps {
  open: boolean;
  onClose: () => void;
  beneficiaryName: string;
  transactions: POITransactionRow[];
  isLoading?: boolean;
  onEditGroupedNames?: () => void;
}

export default function POITransactionsDialog({
  open,
  onClose,
  beneficiaryName,
  transactions,
  isLoading = false,
  onEditGroupedNames,
}: POITransactionsDialogProps) {
  
  // Trace transaction state
  const [selectedTxIndex, setSelectedTxIndex] = useState<number | null>(null);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceData] = useState<TraceTreeResponse | null>(null);
  const [traceLoading] = useState(false);
  const [traceError] = useState<string | null>(null);

  const selectedTransaction: SelectedTransaction | null = useMemo(() => {
    if (selectedTxIndex === null || !transactions[selectedTxIndex]) return null;
    const tx = transactions[selectedTxIndex];
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
    };
  }, [selectedTxIndex, transactions, beneficiaryName]);

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
    const str = String(value).trim();
    
    // If it contains timestamp info (GMT, 00:00:00), extract just the date
    if (str.includes('GMT') || str.includes('00:00:00') || str.includes(':')) {
      try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          return `${day}/${month}/${year}`;
        }
      } catch {
        // Fall back to original string
      }
    }
    
    return str;
  };

  const downloadAsCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Description', 'Suspicious Reason', 'Debit', 'Credit', 'Balance', 'Date', 'Beneficiary', 'Source File'];
    const rows = transactions.map(tx => [
      tx.description || '',
      tx.suspicious_reason || '',
      tx.debit || '',
      tx.credit || '',
      tx.balance || '',
      tx.date || '',
      tx.beneficiary || '',
      tx.source_file || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `poi_transactions_${beneficiaryName.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "CSV downloaded successfully" });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                  POI Transactions for "{beneficiaryName}"
                </DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                  Suspicious transactions across multiple files
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTxIndex !== null && (
                <Button
                  size="sm"
                  variant="accent"
                  className="h-8 gap-1.5 text-xs shrink-0"
                  onClick={() => setShowTraceModal(true)}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Trace Transaction
                </Button>
              )}
              {onEditGroupedNames && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 shrink-0"
                  onClick={onEditGroupedNames}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">Edit Grouped Names</span>
                </Button>
              )}
              <Badge variant="secondary" className="text-xs font-medium px-2 sm:px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                {transactions.length} {transactions.length === 1 ? "tx" : "txs"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-3 sm:px-6 py-3 sm:py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 sm:h-48">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-amber-500"></div>
              <span className="ml-2 sm:ml-3 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-30" />
              <p className="text-sm">No POI transactions found.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] sm:h-[450px] rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-auto min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                    <tr className="border-b">
                      <th className="px-3 py-3 text-left font-semibold w-[20%]">Description</th>
                      <th className="px-3 py-3 text-left font-semibold w-[18%]">Suspicious Reason</th>
                      <th className="px-3 py-3 text-right font-semibold w-[10%]">Debit</th>
                      <th className="px-3 py-3 text-right font-semibold w-[10%]">Credit</th>
                      <th className="px-3 py-3 text-right font-semibold w-[10%]">Balance</th>
                      <th className="px-3 py-3 text-left font-semibold w-[8%]">Date</th>
                      <th className="px-3 py-3 text-left font-semibold w-[12%]">Beneficiary</th>
                      <th className="px-3 py-3 text-left font-semibold w-[12%]">Source File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => (
                      <tr
                        key={idx}
                        className={cn(
                          "border-b border-border/50 hover:bg-muted/30 transition-colors",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <span className="text-xs leading-relaxed whitespace-normal break-words">
                            {tx.description || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 whitespace-normal break-words">
                            {tx.suspicious_reason || "-"}
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
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className="whitespace-normal break-words">{tx.beneficiary || "-"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          <span className="whitespace-normal break-words">{tx.source_file || "-"}</span>
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
            disabled={transactions.length === 0}
            size="sm"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2 w-full sm:w-auto" size="sm">
            <X className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
