import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export default function POITransactionsDialog({
  open,
  onClose,
  beneficiaryName,
  transactions,
  isLoading = false,
}: POITransactionsDialogProps) {
  
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  POI Transactions for "{beneficiaryName}"
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Suspicious transactions flagged across multiple source files
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-medium px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              <span className="ml-3 text-muted-foreground">Loading POI transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
              <p>No POI transactions found for this beneficiary.</p>
            </div>
          ) : (
            <ScrollArea className="h-[450px] rounded-md border">
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
                          <span 
                            className="text-xs leading-relaxed line-clamp-2" 
                            title={tx.description}
                          >
                            {tx.description || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span 
                            className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 line-clamp-2" 
                            title={tx.suspicious_reason}
                          >
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
                        <td className="px-3 py-2.5 text-xs" title={tx.beneficiary}>
                          <span className="line-clamp-1">{tx.beneficiary || "-"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground" title={tx.source_file}>
                          <span className="line-clamp-1">{tx.source_file || "-"}</span>
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
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
