import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CellData } from "@/utils/excelParser";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import BeneficiaryTransactionsDialog, { TransactionRow } from "./BeneficiaryTransactionsDialog";

interface SummaryTableViewerProps {
  data: CellData[][] | undefined;
  fileName: string;
  rawTransactionsFileName?: string | null;
  onLoadRawData?: () => Promise<CellData[][] | null>;
}

type SortColumn = "transactions" | "credit" | "debit";
type SortDirection = "asc" | "desc";

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

export default function SummaryTableViewer({
  data,
  fileName,
  rawTransactionsFileName,
  onLoadRawData
}: SummaryTableViewerProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "transactions", direction: "desc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>("");
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRow[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [cachedRawData, setCachedRawData] = useState<CellData[][] | null>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

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

  // Find the beneficiary/alias column index
  const beneficiaryColumnIndex = useMemo(() => {
    if (!data || data.length === 0) return -1;

    const headerRow = data[0];
    for (let idx = 0; idx < headerRow.length; idx++) {
      const value = String(headerRow[idx]?.value || "").toLowerCase().trim();
      if (value === "alias" || value === "beneficiary") {
        return idx;
      }
    }
    return -1;
  }, [data]);

  // Find the alias/alias members column index
  const aliasColumnIndex = useMemo(() => {
    if (!data || data.length === 0) return -1;

    const headerRow = data[0];
    for (let idx = 0; idx < headerRow.length; idx++) {
      const value = String(headerRow[idx]?.value || "").toLowerCase().trim();
      if (value === "alias members") {
        return idx;
      }
    }
    return -1;
  }, [data]);

  // Parse numeric value from cell
  function parseNumericValue(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[₹$€£,\s]/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data || data.length <= 1) return data || [];

    const headerRow = data[0];
    let dataRows = data.slice(1);

    // Apply search filter
    if (searchQuery.trim() && beneficiaryColumnIndex !== -1) {
      const query = searchQuery.toLowerCase().trim();
      dataRows = dataRows.filter((row) => {
        const cellValue = String(row[beneficiaryColumnIndex]?.value || "").toLowerCase();
        return cellValue.includes(query);
      });
    }

    // Apply sorting
    const sortIdx = columnIndices[sortConfig.column];
    if (sortIdx !== -1) {
      dataRows = [...dataRows].sort((a, b) => {
        const aVal = parseNumericValue(a[sortIdx]?.value);
        const bVal = parseNumericValue(b[sortIdx]?.value);
        return sortConfig.direction === "desc" ? bVal - aVal : aVal - bVal;
      });
    }

    return [headerRow, ...dataRows];
  }, [data, searchQuery, sortConfig, columnIndices, beneficiaryColumnIndex]);

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  // Get sort icon for a column
  const getSortIcon = (column: SortColumn) => {
    if (sortConfig.column !== column) return null;
    return sortConfig.direction === "desc" ? (
      <ChevronDown className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ChevronUp className="h-3.5 w-3.5 ml-1" />
    );
  };

  // Check if column is sortable
  const isSortableColumn = (colIdx: number): SortColumn | null => {
    if (colIdx === columnIndices.transactions) return "transactions";
    if (colIdx === columnIndices.credit) return "credit";
    if (colIdx === columnIndices.debit) return "debit";
    return null;
  };

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
  const formatCellValue = (value: any, columnIndex?: number): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      try {
        const isTransactionsColumn = columnIndex !== undefined && columnIndex === columnIndices.transactions;
        
        if (isTransactionsColumn) {
          return new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
        }
        
        const isCreditColumn = columnIndex !== undefined && columnIndex === columnIndices.credit;
        const isDebitColumn = columnIndex !== undefined && columnIndex === columnIndices.debit;
        
        if (isCreditColumn || isDebitColumn || Math.abs(value) > 100) {
          return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(value);
        }
        
        return new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      } catch {
        return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    }
    return String(value).replace("\u200B", "").trim();
  };

  // Handle beneficiary click
  const handleBeneficiaryClick = useCallback(async (summaryRow: CellData[], beneficiaryName: string) => {
    if (!beneficiaryName || !rawTransactionsFileName) return;

    setSelectedBeneficiary(beneficiaryName);
    setDialogOpen(true);
    setIsLoadingTransactions(true);
    setFilteredTransactions([]);

    try {
      const searchNames = new Set<string>();
      searchNames.add(beneficiaryName.toLowerCase().trim());

      const aliasCell = summaryRow[aliasColumnIndex];
      if (aliasColumnIndex !== -1 && aliasCell?.value) {
        const aliasString = String(aliasCell.value).trim();
        if (aliasString.length > 0) {
          const aliases = aliasString
            .split(',')
            .map(a => a.trim().toLowerCase())
            .filter(a => a.length > 0);
          aliases.forEach(a => searchNames.add(a));
        }
      }

      let rawData = cachedRawData;
      if (!rawData && onLoadRawData) {
        rawData = await onLoadRawData();
        if (rawData) {
          setCachedRawData(rawData);
        }
      }

      if (!rawData || rawData.length <= 1) {
        setFilteredTransactions([]);
        return;
      }

      const headerRow = rawData[0];
      const columnMap: Record<string, number> = {};

      headerRow.forEach((cell, idx) => {
        const headerName = String(cell?.value || "").toLowerCase().trim();
        columnMap[headerName] = idx;
      });

      const rawBeneficiaryIdx = columnMap["beneficiary"];
      if (rawBeneficiaryIdx === undefined) {
        console.warn("Could not find 'beneficiary' column in raw data");
        setFilteredTransactions([]);
        return;
      }

      const matchingRows: TransactionRow[] = [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const rowBeneficiary = String(row[rawBeneficiaryIdx]?.value || "").toLowerCase().trim();

        if (searchNames.has(rowBeneficiary)) {
          const transaction: TransactionRow = {
            description: String(row[columnMap["description"]]?.value || ""),
            debit: row[columnMap["debit"]]?.value ?? 0,
            credit: row[columnMap["credit"]]?.value ?? 0,
            balance: row[columnMap["balance"]]?.value ?? 0,
            beneficiary: String(row[rawBeneficiaryIdx]?.value || ""),
            date: String(row[columnMap["date"]]?.value || ""),
          };
          matchingRows.push(transaction);
        }
      }

      setFilteredTransactions(matchingRows);
    } catch (error) {
      console.error("Error loading raw transactions:", error);
      setFilteredTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [cachedRawData, onLoadRawData, rawTransactionsFileName, aliasColumnIndex]);

  // Check if a cell is in the beneficiary column
  const isBeneficiaryCell = useCallback((colIdx: number) => {
    return beneficiaryColumnIndex !== -1 && colIdx === beneficiaryColumnIndex && rawTransactionsFileName && onLoadRawData;
  }, [beneficiaryColumnIndex, rawTransactionsFileName, onLoadRawData]);

  // Handle search close
  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  // Handle keyboard events
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCloseSearch();
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No summary data available for this file.
      </div>
    );
  }

  const headerRow = processedData[0];
  const dataRows = processedData.slice(1);

  return (
    <>
      <div className="w-full">
        <div className="overflow-auto h-[300px] sm:h-[400px] w-full rounded-md border">
          <table className="w-full text-xs sm:text-sm table-fixed">
            <thead className="sticky top-0 z-10 bg-muted/95">
              <tr>
                {headerRow?.map((cell, colIdx) => {
                  const sortableColumn = isSortableColumn(colIdx);
                  const isBeneficiaryHeader = colIdx === beneficiaryColumnIndex;
                  const headerValue = formatCellValue(cell?.value, colIdx);

                  return (
                    <th
                      key={colIdx}
                      className={cn(
                        "px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold bg-muted/80 border-b",
                        sortableColumn && "cursor-pointer hover:bg-muted transition-colors select-none"
                      )}
                      style={{
                        ...getCellStyle(cell),
                        minWidth: isBeneficiaryHeader && isSearchOpen ? "200px" : "80px",
                      }}
                      onClick={sortableColumn ? () => handleSort(sortableColumn) : undefined}
                    >
                      {isBeneficiaryHeader ? (
                        <div className="flex items-center gap-2">
                          {isSearchOpen ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <Input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search beneficiary..."
                                className="h-6 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/60"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseSearch();
                                }}
                                className="p-0.5 hover:bg-muted-foreground/20 rounded transition-colors"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="whitespace-nowrap">{headerValue}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsSearchOpen(true);
                                }}
                                className="p-1 hover:bg-muted-foreground/20 rounded transition-colors"
                                title="Search beneficiaries"
                              >
                                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center whitespace-nowrap">
                          {headerValue}
                          {sortableColumn && getSortIcon(sortableColumn)}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dataRows.length === 0 ? (
                <tr>
                  <td colSpan={headerRow?.length || 1} className="text-center py-8 text-muted-foreground">
                    No matching results found.
                  </td>
                </tr>
              ) : (
                dataRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors",
                      rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                    )}
                  >
                    {row.map((cell, colIdx) => {
                      const isClickable = isBeneficiaryCell(colIdx);
                      const cellValue = formatCellValue(cell?.value, colIdx);

                      const isCreditColumn = colIdx === columnIndices.credit;
                      const isDebitColumn = colIdx === columnIndices.debit;
                      
                      const colorClass = cn({
                        "text-green-600 dark:text-green-400 font-medium": isCreditColumn,
                        "text-red-600 dark:text-red-400 font-medium": isDebitColumn,
                        "text-left": isCreditColumn || isDebitColumn || colIdx === columnIndices.transactions
                      });

                      return (
                        <td
                          key={colIdx}
                          className={cn("px-2 sm:px-3 py-1.5 sm:py-2 break-words text-xs sm:text-sm", colorClass)} 
                          style={{
                            ...getCellStyle(cell),
                            minWidth: "80px",
                          }}
                        >
                          {isClickable && cellValue ? (
                            <button
                              onClick={() => handleBeneficiaryClick(row, cellValue)}
                              className={cn(
                                "text-left text-primary hover:text-primary/80",
                                "hover:underline underline-offset-2",
                                "cursor-pointer transition-colors duration-150",
                                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded-sm"
                              )}
                              title={`View transactions for ${cellValue}`}
                            >
                              <span className="line-clamp-2">{cellValue}</span>
                            </button>
                          ) : (
                            <span className="line-clamp-2">{cellValue}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BeneficiaryTransactionsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        beneficiaryName={selectedBeneficiary}
        transactions={filteredTransactions}
        isLoading={isLoadingTransactions}
      />
    </>
  );
}
