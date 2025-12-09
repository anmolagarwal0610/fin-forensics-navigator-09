import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CellData } from "@/utils/excelParser";
import { cn } from "@/lib/utils";

interface SummaryTableViewerProps {
  data: CellData[][] | undefined;
  fileName: string;
}

type SortColumn = "transactions" | "credit" | "debit";

export default function SummaryTableViewer({ data, fileName }: SummaryTableViewerProps) {
  const [activeTab, setActiveTab] = useState<SortColumn>("transactions");

  // Find column indices for sorting
  const columnIndices = useMemo(() => {
    if (!data || data.length === 0) return { transactions: -1, credit: -1, debit: -1 };
    
    const headerRow = data[0];
    let transactionsIdx = -1;
    let creditIdx = -1;
    let debitIdx = -1;

    headerRow.forEach((cell, idx) => {
      const value = String(cell?.value || "").toLowerCase().trim();
      if (value.includes("total transactions") || value === "total transactions") {
        transactionsIdx = idx;
      } else if (value.includes("total credit") || value === "total credit") {
        creditIdx = idx;
      } else if (value.includes("total debit") || value === "total debit") {
        debitIdx = idx;
      }
    });

    return { transactions: transactionsIdx, credit: creditIdx, debit: debitIdx };
  }, [data]);

  // Sort data based on active tab
  const sortedData = useMemo(() => {
    if (!data || data.length <= 1) return data || [];

    const headerRow = data[0];
    const dataRows = data.slice(1);
    const sortIdx = columnIndices[activeTab];

    if (sortIdx === -1) return data;

    const sorted = [...dataRows].sort((a, b) => {
      const aVal = parseNumericValue(a[sortIdx]?.value);
      const bVal = parseNumericValue(b[sortIdx]?.value);
      return bVal - aVal; // Descending order
    });

    return [headerRow, ...sorted];
  }, [data, activeTab, columnIndices]);

  // Parse numeric value from cell
  function parseNumericValue(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[₹$€£,\s]/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  // Get cell style
  const getCellStyle = (cell: CellData | undefined) => {
    if (!cell) return {};
    const style: React.CSSProperties = {};
    if (cell.style?.backgroundColor && cell.style.backgroundColor !== "#FFFFFF" && cell.style.backgroundColor !== "#ffffff") {
      style.backgroundColor = cell.style.backgroundColor;
    }
    if (cell.style?.fontColor && cell.style.fontColor !== "#000000") {
      style.color = cell.style.fontColor;
    }
    if (cell.style?.fontWeight === "bold") {
      style.fontWeight = "bold";
    }
    return style;
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      try {
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    }
    return String(value).replace("\u200B", "").trim();
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No summary data available for this file.
      </div>
    );
  }

  const hasTransactions = columnIndices.transactions !== -1;
  const hasCredit = columnIndices.credit !== -1;
  const hasDebit = columnIndices.debit !== -1;

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SortColumn)} className="w-full">
        {/* Chrome-style tabs */}
        <TabsList className="h-auto p-0 bg-transparent gap-0.5 border-b border-border rounded-none justify-start">
          {hasTransactions && (
            <TabsTrigger
              value="transactions"
              className={cn(
                "relative rounded-t-lg rounded-b-none border border-b-0 px-4 py-2 text-sm font-medium",
                "data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:shadow-sm",
                "data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground",
                "data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[1px] data-[state=active]:after:bg-background",
                "transition-all duration-150"
              )}
            >
              No. of Transactions (High to Low)
            </TabsTrigger>
          )}
          {hasCredit && (
            <TabsTrigger
              value="credit"
              className={cn(
                "relative rounded-t-lg rounded-b-none border border-b-0 px-4 py-2 text-sm font-medium",
                "data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:shadow-sm",
                "data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground",
                "data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[1px] data-[state=active]:after:bg-background",
                "transition-all duration-150"
              )}
            >
              Total Credit (High to Low)
            </TabsTrigger>
          )}
          {hasDebit && (
            <TabsTrigger
              value="debit"
              className={cn(
                "relative rounded-t-lg rounded-b-none border border-b-0 px-4 py-2 text-sm font-medium",
                "data-[state=active]:bg-background data-[state=active]:border-border data-[state=active]:shadow-sm",
                "data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground",
                "data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[1px] data-[state=active]:after:bg-background",
                "transition-all duration-150"
              )}
            >
              Total Debit (High to Low)
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0 pt-4">
          <ScrollArea className="w-full h-[400px] rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {sortedData[0]?.map((cell, colIdx) => (
                      <th
                        key={colIdx}
                        className="px-3 py-2 text-left font-semibold bg-muted/80 border-b whitespace-nowrap"
                        style={{
                          ...getCellStyle(cell),
                          minWidth: "120px",
                        }}
                      >
                        {formatCellValue(cell?.value)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.slice(1).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={cn(
                        "border-b border-border/50 hover:bg-muted/30 transition-colors",
                        rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                    >
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-3 py-2 break-words"
                          style={{
                            ...getCellStyle(cell),
                            minWidth: "120px",
                          }}
                        >
                          <span className="line-clamp-2">
                            {formatCellValue(cell?.value)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
