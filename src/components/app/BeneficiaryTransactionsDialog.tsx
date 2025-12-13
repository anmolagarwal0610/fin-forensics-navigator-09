import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CreditCard, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export interface TransactionRow {
  description: string;
  debit: number | string;
  credit: number | string;
  balance: number | string;
  beneficiary: string;
  date: string;
}

interface BeneficiaryTransactionsDialogProps {
  open: boolean;
  onClose: () => void;
  beneficiaryName: string;
  transactions: TransactionRow[];
  isLoading?: boolean;
}

export default function BeneficiaryTransactionsDialog({
  open,
  onClose,
  beneficiaryName,
  transactions,
  isLoading = false,
}: BeneficiaryTransactionsDialogProps) {
  
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

  const downloadAsCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Description', 'Debit', 'Credit', 'Balance', 'Beneficiary', 'Date'];
    const rows = transactions.map(tx => [
      tx.description || '',
      tx.debit || '',
      tx.credit || '',
      tx.balance || '',
      tx.beneficiary || '',
      tx.date || ''
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
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
            <Badge variant="secondary" className="text-xs font-medium px-2 sm:px-3 py-1 shrink-0">
              {transactions.length} {transactions.length === 1 ? "tx" : "txs"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-3 sm:px-6 py-3 sm:py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 sm:h-48">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
              <span className="ml-2 sm:ml-3 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-muted-foreground">
              <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-30" />
              <p className="text-sm">No transactions found.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] sm:h-[400px] rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-auto min-w-[700px]">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold w-[35%]">Description</th>
                    <th className="px-3 py-3 text-right font-semibold w-[12%]">Debit</th>
                    <th className="px-3 py-3 text-right font-semibold w-[12%]">Credit</th>
                    <th className="px-3 py-3 text-right font-semibold w-[13%]">Balance</th>
                    <th className="px-3 py-3 text-left font-semibold w-[15%]">Beneficiary</th>
                    <th className="px-3 py-3 text-left font-semibold w-[13%]">Date</th>
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
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" /> {/* Add the horizontal scroll bar */}
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
