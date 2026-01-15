import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CellData } from '@/utils/excelParser';
import JSZip from 'jszip';
import { parseExcelFile } from '@/utils/excelParser';
import BeneficiaryTransactionsDialog, { TransactionRow } from './BeneficiaryTransactionsDialog';
import POITransactionsDialog, { POITransactionRow } from './POITransactionsDialog';
import { useTheme } from 'next-themes';

interface MergedRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface PreviewData {
  schema?: string;
  sheet?: string;
  cell_bg?: Record<string, string>;
  header_bands?: Array<{
    range: string;
    bg: string;
    label?: string;
  }>;
  merges?: string[];
}

interface ExcelViewerProps {
  title: string;
  data: CellData[][];
  onDownload?: () => void;
  maxRows?: number;
  fileUrl?: string;
  // New props for beneficiary drill-down
  enableBeneficiaryClick?: boolean;
  zipData?: JSZip | null;
  rawDataCache?: Map<string, CellData[][]>;
  poiDataCache?: Map<string, CellData[][]>;
  onCacheRawData?: (fileName: string, data: CellData[][]) => void;
  onCachePOIData?: (fileName: string, data: CellData[][]) => void;
}

export default function ExcelViewer({ 
  title, 
  data, 
  onDownload, 
  maxRows = 25, 
  fileUrl,
  enableBeneficiaryClick = false,
  zipData,
  rawDataCache,
  poiDataCache,
  onCacheRawData,
  onCachePOIData,
}: ExcelViewerProps) {
  const { resolvedTheme } = useTheme();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [processedData, setProcessedData] = useState<CellData[][]>([]);
  // State to store column indices that should be formatted as currency (INR)
  const [currencyColumnIndices, setCurrencyColumnIndices] = useState<number[]>([]);
  
  // Beneficiary drill-down state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poiDialogOpen, setPOIDialogOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>("");
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRow[]>([]);
  const [poiTransactions, setPOITransactions] = useState<POITransactionRow[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Find column indices from Row 2 (index 1) headers for beneficiary drill-down
  const columnIndices = useMemo(() => {
    if (!enableBeneficiaryClick || processedData.length < 2) return null;
    
    const headerRow = processedData[1]; // Row 2 is index 1
    const fileRow = processedData[0]; // Row 1 is index 0 (file names)
    
    let filesPresentIdx = -1;
    let similarNamesIdx = -1;
    const totalCreditDebitIndices: number[] = [];
    
    headerRow.forEach((cell, idx) => {
      const headerText = String(cell?.value || '').toLowerCase().trim();
      if (headerText === 'files present') {
        filesPresentIdx = idx;
      }
      if (headerText === 'similar names') {
        similarNamesIdx = idx;
      }
      if (headerText.includes('total credit') || headerText.includes('total debit')) {
        totalCreditDebitIndices.push(idx);
      }
    });
    
    return { filesPresentIdx, similarNamesIdx, totalCreditDebitIndices, fileRow };
  }, [enableBeneficiaryClick, processedData]);

  // Find source file for single-file beneficiary (Files Present = 1)
  const findSourceFile = useCallback((row: CellData[]): string | null => {
    if (!columnIndices) return null;
    
    const { totalCreditDebitIndices, fileRow } = columnIndices;
    
    for (const colIdx of totalCreditDebitIndices) {
      const cellValue = row[colIdx]?.value;
      const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue || '0').replace(/[₹$€£,\s]/g, ''));
      
      if (!isNaN(numValue) && numValue > 0) {
        // Found non-zero value, get source file name from row 1
        const sourceFileName = String(fileRow[colIdx]?.value || '');
        
        // Skip aggregate columns
        if (sourceFileName && 
            sourceFileName.toUpperCase() !== 'TOTAL' && 
            sourceFileName.toUpperCase() !== 'FEATURES') {
          // Remove extension (.pdf, .csv, .xlsx)
          return sourceFileName.replace(/\.(pdf|csv|xlsx?)$/i, '');
        }
      }
    }
    return null;
  }, [columnIndices]);

  // Handle beneficiary click
  const handleBeneficiaryClick = useCallback(async (rowIndex: number) => {
    if (!enableBeneficiaryClick || !zipData || !columnIndices || rowIndex < 2) return;
    
    const row = processedData[rowIndex];
    const beneficiaryName = String(row[0]?.value || '').trim();
    if (!beneficiaryName) return;
    
    setSelectedBeneficiary(beneficiaryName);
    setIsLoadingTransactions(true);
    
    const filesPresent = parseInt(String(row[columnIndices.filesPresentIdx]?.value || '0'));
    
    try {
      if (filesPresent > 1) {
        // Multi-file: Load POI file
        setPOIDialogOpen(true);
        
        // Mirror backend: re.sub(r'[^\w.-]+', '_', beneficiary.strip())
        // Replace all chars that are NOT word chars (\w), dots (.), or dashes (-) with underscore
        const sanitizeBeneficiaryName = (name: string): string => {
          return name.trim().replace(/[^\w.-]+/g, '_');
        };
        
        // Normalize for fuzzy fallback matching (remove all non-alphanumeric)
        const normalizeForMatch = (str: string): string => {
          return str.toLowerCase().replace(/[^a-z0-9]/g, '');
        };
        
        // Construct expected POI filename using backend-identical sanitization
        const safeBeneficiary = sanitizeBeneficiaryName(beneficiaryName);
        const expectedPoiFileName = `POI_${safeBeneficiary}.xlsx`;
        
        // First try exact match
        let poiFile = zipData.file(expectedPoiFileName);
        let matchedFileName = expectedPoiFileName;
        
        // If not found, use fuzzy normalized matching as fallback
        if (!poiFile) {
          const normalizedBeneficiary = normalizeForMatch(beneficiaryName);
          const allPoiFiles = Object.keys(zipData.files).filter(
            name => name.startsWith('POI_') && name.endsWith('.xlsx')
          );
          
          const foundFileName = allPoiFiles.find(fileName => {
            const namePart = fileName.replace(/^POI_/, '').replace(/\.xlsx$/, '');
            return normalizeForMatch(namePart) === normalizedBeneficiary;
          });
          
          if (foundFileName) {
            matchedFileName = foundFileName;
            poiFile = zipData.file(matchedFileName);
          }
        }
        
        let poiData: CellData[][] | null = null;
        
        // Check cache first (use matched filename for cache key)
        if (poiDataCache?.has(matchedFileName)) {
          poiData = poiDataCache.get(matchedFileName)!;
        } else if (poiFile) {
          // Load from ZIP
          const content = await poiFile.async("arraybuffer");
          poiData = await parseExcelFile(content);
          onCachePOIData?.(matchedFileName, poiData);
        }
        
        if (poiData && poiData.length > 1) {
          // Find column indices from POI file header (row 0)
          const poiHeader = poiData[0];
          const colMap: Record<string, number> = {};
          poiHeader.forEach((cell, idx) => {
            const header = String(cell?.value || '').toLowerCase().trim();
            colMap[header] = idx;
          });
          
          // Extract transactions (skip header row)
          const transactions: POITransactionRow[] = [];
          for (let i = 1; i < poiData.length; i++) {
            const txRow = poiData[i];
            transactions.push({
              description: String(txRow[colMap['description']]?.value || ''),
              suspicious_reason: String(txRow[colMap['suspicious_reason']]?.value || ''),
              debit: txRow[colMap['debit']]?.value ?? '',
              credit: txRow[colMap['credit']]?.value ?? '',
              balance: txRow[colMap['balance']]?.value ?? '',
              date: String(txRow[colMap['date']]?.value || ''),
              beneficiary: String(txRow[colMap['beneficiary']]?.value || ''),
              source_file: String(txRow[colMap['source_file']]?.value || ''),
            });
          }
          setPOITransactions(transactions);
        } else {
          setPOITransactions([]);
        }
      } else {
        // Single-file: Load from raw_transactions file
        setDialogOpen(true);
        
        const sourceFile = findSourceFile(row);
        if (!sourceFile) {
          setFilteredTransactions([]);
          setIsLoadingTransactions(false);
          return;
        }
        
        // Raw transactions filename: no underscore for spaces
        const rawFileName = `raw_transactions_${sourceFile}.xlsx`;
        
        let rawData: CellData[][] | null = null;
        
        // Check cache first
        if (rawDataCache?.has(rawFileName)) {
          rawData = rawDataCache.get(rawFileName)!;
        } else {
          // Load from ZIP
          const rawFile = zipData.file(rawFileName);
          if (rawFile) {
            const content = await rawFile.async("arraybuffer");
            rawData = await parseExcelFile(content);
            onCacheRawData?.(rawFileName, rawData);
          }
        }
        
        if (rawData && rawData.length > 1) {
          // Find column indices from raw file header (row 0)
          const rawHeader = rawData[0];
          const colMap: Record<string, number> = {};
          rawHeader.forEach((cell, idx) => {
            const header = String(cell?.value || '').toLowerCase().trim();
            colMap[header] = idx;
          });
          
          const beneficiaryColIdx = colMap['beneficiary'];
          if (beneficiaryColIdx === undefined) {
            setFilteredTransactions([]);
            setIsLoadingTransactions(false);
            return;
          }
          
          // Build search names set (beneficiary + similar names)
          const searchNames = new Set<string>();
          searchNames.add(beneficiaryName.toLowerCase().trim());
          
          // Get Similar Names from column
          const similarNamesValue = row[columnIndices.similarNamesIdx]?.value;
          if (similarNamesValue) {
            const aliases = String(similarNamesValue)
              .split(',')
              .map(a => a.trim().toLowerCase())
              .filter(a => a.length > 0);
            aliases.forEach(a => searchNames.add(a));
          }
          
          // Filter transactions matching any of the search names
          const transactions: TransactionRow[] = [];
          for (let i = 1; i < rawData.length; i++) {
            const txRow = rawData[i];
            const txBeneficiary = String(txRow[beneficiaryColIdx]?.value || '').toLowerCase().trim();
            
            if (searchNames.has(txBeneficiary)) {
              transactions.push({
                description: String(txRow[colMap['description']]?.value || ''),
                debit: txRow[colMap['debit']]?.value ?? '',
                credit: txRow[colMap['credit']]?.value ?? '',
                balance: txRow[colMap['balance']]?.value ?? '',
                beneficiary: String(txRow[beneficiaryColIdx]?.value || ''),
                date: String(txRow[colMap['date']]?.value || ''),
                transaction_type: String(txRow[colMap['transaction_type']]?.value || ''),
              });
            }
          }
          setFilteredTransactions(transactions);
        } else {
          setFilteredTransactions([]);
        }
      }
    } catch (error) {
      console.error('Failed to load beneficiary transactions:', error);
      setFilteredTransactions([]);
      setPOITransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [enableBeneficiaryClick, zipData, columnIndices, processedData, findSourceFile, rawDataCache, poiDataCache, onCacheRawData, onCachePOIData]);

  // Check if a cell should be clickable (beneficiary column)
  const isBeneficiaryCell = useCallback((rowIndex: number, colIndex: number): boolean => {
    if (!enableBeneficiaryClick || !zipData || rowIndex < 2) return false;
    // First column (index 0) contains beneficiary names, starting from row 2 (index 2)
    return colIndex === 0;
  }, [enableBeneficiaryClick, zipData]);

  // Helper function to convert 0-based array indices to 1-based A1 notation
  const toA1 = (col: number, row: number): string => {
    let s = "";
    let adjustedCol = col + 1; // Convert to 1-based
    while (adjustedCol > 0) {
      const m = (adjustedCol - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      adjustedCol = Math.floor((adjustedCol - 1) / 26);
    }
    return s + String(row + 1); // Convert to 1-based row
  };

  // Parse Excel range to get cell coordinates
  const parseRange = (range: string) => {
    // Convert "C1:D1" or "B1" to coordinates
    const [start, end] = range.split(':');
    const parseCell = (cellAddress: string) => {
      if (!cellAddress) return { col: 0, row: 0 };
      const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
      if (!match) return { col: 0, row: 0 };
      const [, letters, numbers] = match;
      const col = letters.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const row = parseInt(numbers) - 1;
      return { col, row };
    };
    
    const startCoord = parseCell(start);
    // If no end coordinate (single cell reference like "B1"), use start as end
    const endCoord = end ? parseCell(end) : startCoord;
    return {
      startRow: startCoord.row,
      endRow: endCoord.row,
      startCol: startCoord.col,
      endCol: endCoord.col
    };
  };

  // Process data with merges from JSON
  useEffect(() => {
    if (!data || data.length === 0) {
      setProcessedData([]);
      return;
    }

    const processed = data.map(row => row.map(cell => ({ ...cell })));

    // Apply merges from preview JSON if available
    if (previewData?.merges) {
      previewData.merges.forEach(rangeStr => {
        const range = parseRange(rangeStr);
        
        // Set merged range on the top-left cell
        if (processed[range.startRow] && processed[range.startRow][range.startCol]) {
          processed[range.startRow][range.startCol].merged = range;
        }
        
        // Hide other cells in the merged range
        for (let row = range.startRow; row <= range.endRow; row++) {
          for (let col = range.startCol; col <= range.endCol; col++) {
            if (row !== range.startRow || col !== range.startCol) {
              if (processed[row] && processed[row][col]) {
                processed[row][col].isHidden = true;
              }
            }
          }
        }
      });
    }

    setProcessedData(processed);
  }, [data, previewData]);
  
  // 🔥 FIXED useEffect to identify currency columns based on header text in ROW 2 (index 1)
  useEffect(() => {
    if (processedData.length < 2) { // Need at least 2 rows for header check
      setCurrencyColumnIndices([]);
      return;
    }
    
    // Check the second row (index 1) for currency headers.
    const headerRow = processedData[1]; 
    const currencyColumns: number[] = [];
    
    headerRow.forEach((cell, colIndex) => {
      // Use the raw cell value's content, if available, to check for keywords.
      const headerText = String(cell.value || '').toLowerCase();
      
      // Identify columns containing Credit, Debit, or Amount in their header
      if (headerText.includes('credit') || headerText.includes('debit') || headerText.includes('amount')) {
        currencyColumns.push(colIndex);
      }
    });
    setCurrencyColumnIndices(currencyColumns);
  }, [processedData]);

  // Load preview JSON if fileUrl is provided
  useEffect(() => {
    if (!fileUrl) return;

    const loadPreview = async () => {
      try {
        let previewUrl: string;
        
        // Check if fileUrl is already a JSON blob URL (from ZIP extraction)
        if (fileUrl.includes('blob:')) {
          previewUrl = fileUrl;
        }
        // For test files, use static path
        else if (fileUrl.includes('test-files')) {
          previewUrl = '/test-files/beneficiaries_by_file.preview.json';
        }
        // For regular file URLs, try to construct preview URL
        else {
          previewUrl = fileUrl.replace(/\.xlsx$/i, '.preview.json');
        }
        
        const response = await fetch(previewUrl);
        
        if (response.status === 200) {
          // Check content type to avoid binary data
          const contentType = response.headers.get('content-type');
          
          // For blob URLs, content-type might not be set correctly, so also check the actual content
          const responseText = await response.text();
          
          // Check if this looks like JSON content
          const looksLikeJson = responseText.trim().startsWith('{') && responseText.includes('"schema"');
          const hasValidContentType = contentType && (contentType.includes('application/json') || contentType.includes('text/'));
          
          if (!hasValidContentType && !looksLikeJson) {
            setPreviewData(null);
            return;
          }
          
          // Check if response starts with binary markers
          if (responseText.startsWith('PK') || responseText.includes('\x00')) {
            setPreviewData(null);
            return;
          }
          
          try {
            const preview = JSON.parse(responseText);
            
            // Validate schema
            if (preview.schema === "ffn.preview.v1") {
              setPreviewData(preview);
            } else {
              setPreviewData(null);
            }
          } catch (parseError) {
            setPreviewData(null);
          }
        } else {
          setPreviewData(null);
        }
      } catch (error) {
        setPreviewData(null);
      }
    };

    loadPreview();
  }, [fileUrl]);
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            {onDownload && (
              <Button onClick={onDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const displayData = processedData.slice(0, maxRows);

  const getCellStyle = useCallback((cell: CellData, rowIndex: number, colIndex: number) => {
    const style: React.CSSProperties = {};
    const cellAddress = toA1(colIndex, rowIndex);
    
    // Use reactive theme from useTheme hook
    const isDarkMode = resolvedTheme === 'dark';
    
    // Set smart default text color based on theme
    style.color = isDarkMode ? '#ffffff' : '#000000';
    
    // Helper function to calculate luminance for contrast
    const getLuminance = (hex: string) => {
      if (!hex || hex === 'transparent') return 0.5;
      const cleanHex = hex.replace('#', '');
      if (cleanHex.length !== 6) return 0.5;
      const rgb = parseInt(cleanHex, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff; 
      const b = (rgb >> 0) & 0xff;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    // Helper function to check contrast between two colors
    const hasGoodContrast = (textColor: string, bgColor: string) => {
      const textLum = getLuminance(textColor);
      const bgLum = getLuminance(bgColor);
      const contrast = (Math.max(textLum, bgLum) + 0.05) / (Math.min(textLum, bgLum) + 0.05);
      return contrast >= 4.5; // WCAG AA standard
    };

    let backgroundColor = cell.style?.backgroundColor;
    
    // 1. Check for header bands first (highest priority for header rows)
    if (previewData?.header_bands && rowIndex <= 1) {
      for (const band of previewData.header_bands) {
        const range = parseRange(band.range);
        if (rowIndex >= range.startRow && rowIndex <= range.endRow && 
            colIndex >= range.startCol && colIndex <= range.endCol) {
          backgroundColor = band.bg;
          break;
        }
      }
    }
    
    // 2. Check preview JSON cell_bg (overrides header bands if both apply)
    if (previewData?.cell_bg) {
      const previewBg = previewData.cell_bg[cellAddress];
      if (previewBg) {
        backgroundColor = previewBg;
      }
    }

    // Calculate optimal contrast-based text color first
    let optimalTextColor = isDarkMode ? '#ffffff' : '#000000';
    
    if (backgroundColor) {
      style.backgroundColor = backgroundColor;
      
      // Calculate contrast and set appropriate text color
      const luminance = getLuminance(backgroundColor);
      
      // In dark mode, be more aggressive about using black text for visibility
      if (isDarkMode) {
        // Lower threshold and add special handling for near-white colors
        if (luminance > 0.5 || backgroundColor.toLowerCase().includes('#f') || 
            backgroundColor.toLowerCase().includes('white') || backgroundColor.toLowerCase().includes('fff')) {
          optimalTextColor = '#000000';
        } else {
          optimalTextColor = '#ffffff';
        }
      } else {
        optimalTextColor = luminance > 0.5 ? '#000000' : '#ffffff';
      }
      
      // Set the optimal color first
      style.color = optimalTextColor;
    }
    
    // Apply Excel font color with contrast validation
    if (cell.style?.fontColor) {
      const excelFontColor = cell.style.fontColor;
      
      // Determine effective background color (cell background or theme background)
      const effectiveBackground = backgroundColor || (isDarkMode ? '#000000' : '#ffffff');
      
      // Check if Excel font color provides good contrast with effective background
      if (hasGoodContrast(excelFontColor, effectiveBackground)) {
        style.color = excelFontColor;
      } else {
        // Excel color doesn't provide good contrast, use theme-appropriate color
        style.color = isDarkMode ? '#ffffff' : '#000000';
      }
    } else if (!backgroundColor) {
      // No Excel font color and no background - use theme default
      style.color = isDarkMode ? '#ffffff' : '#000000';
    }
    
    if (cell.style?.fontWeight) {
      style.fontWeight = cell.style.fontWeight;
    }
    
    if (cell.style?.border) {
      style.border = '1px solid hsl(var(--border))';
    }
    
    return style;
  }, [resolvedTheme, previewData, processedData]);

  const getCellSpan = (cell: CellData) => {
    if (!cell.merged) return {};
    
    const colSpan = cell.merged.endCol - cell.merged.startCol + 1;
    const rowSpan = cell.merged.endRow - cell.merged.startRow + 1;
    
    return {
      colSpan: colSpan > 1 ? colSpan : undefined,
      rowSpan: rowSpan > 1 ? rowSpan : undefined,
    };
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (!text || text.length <= maxLength) return { text, truncated: false };
    return {
      text: text.substring(0, maxLength) + '...',
      truncated: true,
      original: text
    };
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <span className="text-base sm:text-lg">{title}</span>
          {onDownload && (
            <Button onClick={onDownload} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
        <p className="text-xs text-muted-foreground mb-3 sm:mb-4">
          Credit and Debit amounts are with respect to bank statements. Any amount appearing under Total Credit means that the bank account owner received that amount from the beneficiary. Any amount under Total Debit means the bank account owner paid that amount to the beneficiary.
        </p>
        <div className="relative overflow-auto h-[400px] sm:h-[600px] w-full border rounded-md">
          <TooltipProvider>
                <table className="border-collapse min-w-full">
                  {/* Sticky header for first 2 rows */}
                  <thead className="sticky top-0 z-20">
                    {displayData.slice(0, 2).map((row, rowIndex) => (
                      <tr key={rowIndex} className="bg-background">
                        {row
                          .map((cell, colIndex) => {
                            if (cell.isHidden) return null;

                            const span = getCellSpan(cell);
                            const style = getCellStyle(cell, rowIndex, colIndex);
                            const rawValue = cell.value;
                            let displayValue = String(rawValue || '');

                            const isCurrencyColumn = currencyColumnIndices.includes(colIndex);
                            if (typeof rawValue === 'number' && isCurrencyColumn) {
                              try {
                                displayValue = new Intl.NumberFormat('en-IN', {
                                  style: 'currency',
                                  currency: 'INR',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(rawValue);
                              } catch {
                                displayValue = `₹${rawValue.toFixed(2)}`;
                              }
                            } else if (typeof rawValue === 'number') {
                              displayValue = new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(rawValue);
                            } else if (typeof rawValue === 'string') {
                              displayValue = rawValue.replace('\u200B', '').trim();
                            }

                            const cellContent = truncateText(displayValue);

                            // Determine sticky column classes
                            const stickyClass = colIndex === 0 
                              ? 'sticky left-0 z-30 bg-background w-10 min-w-[40px] max-w-[60px]' 
                              : colIndex === 1 
                                ? 'sticky left-[40px] z-30 bg-background shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]' 
                                : '';

                            return (
                              <th
                                key={colIndex}
                                {...span}
                                style={{ ...style, backgroundColor: style.backgroundColor || 'hsl(var(--background))' }}
                                className={`p-1.5 sm:p-2 text-xs sm:text-sm border border-border align-top overflow-hidden ${colIndex === 0 ? 'w-10 min-w-[40px] max-w-[60px]' : 'min-w-[80px] sm:min-w-[120px] max-w-[300px] sm:max-w-[400px]'} text-left font-semibold ${stickyClass}`}
                              >
                                {cellContent.truncated ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block truncate overflow-hidden text-ellipsis">
                                        {cellContent.text}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[600px] max-h-[300px] overflow-auto">
                                      <p className="whitespace-pre-wrap break-words text-xs">
                                        {cellContent.original}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="block truncate overflow-hidden text-ellipsis">
                                    {cellContent.text}
                                  </span>
                                )}
                              </th>
                            );
                          })
                          .filter(Boolean)}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {displayData.slice(2).map((row, idx) => {
                      const rowIndex = idx + 2; // Adjust for actual row index
                      return (
                        <tr key={rowIndex}>
                          {row
                            .map((cell, colIndex) => {
                              if (cell.isHidden) return null;

                              const span = getCellSpan(cell);
                              const style = getCellStyle(cell, rowIndex, colIndex);
                              const rawValue = cell.value;
                              let displayValue = String(rawValue || '');

                              const isCurrencyColumn = currencyColumnIndices.includes(colIndex);
                              if (typeof rawValue === 'number' && isCurrencyColumn) {
                                try {
                                  displayValue = new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }).format(rawValue);
                                } catch {
                                  displayValue = `₹${rawValue.toFixed(2)}`;
                                }
                              } else if (typeof rawValue === 'number') {
                                displayValue = new Intl.NumberFormat('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(rawValue);
                              } else if (typeof rawValue === 'string') {
                                displayValue = rawValue.replace('\u200B', '').trim();
                              }

                              const cellContent = truncateText(displayValue);
                              const isClickable = isBeneficiaryCell(rowIndex, colIndex);

                              // Determine sticky column classes for body cells
                              const bodyStickyClass = colIndex === 0 
                                ? 'sticky left-0 z-10 bg-background w-10 min-w-[40px] max-w-[60px]' 
                                : colIndex === 1 
                                  ? 'sticky left-[40px] z-10 bg-background shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]' 
                                  : '';

                              return (
                                <td
                                  key={colIndex}
                                  {...span}
                                  style={style}
                                  className={`p-1.5 sm:p-2 text-xs sm:text-sm border border-border align-top overflow-hidden ${colIndex === 0 ? 'w-10 min-w-[40px] max-w-[60px]' : 'min-w-[80px] sm:min-w-[120px] max-w-[300px] sm:max-w-[400px]'} text-left ${bodyStickyClass}`}
                                >
                                  {isClickable ? (
                                    <button
                                      type="button"
                                      onClick={() => handleBeneficiaryClick(rowIndex)}
                                      className="hover:underline cursor-pointer font-medium text-left w-full transition-colors"
                                      style={{ color: style.color || 'inherit' }}
                                      title={`View transactions for ${displayValue}`}
                                    >
                                      {cellContent.truncated ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="block truncate overflow-hidden text-ellipsis">
                                              {cellContent.text}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-[600px] max-h-[300px] overflow-auto">
                                            <p className="whitespace-pre-wrap break-words text-xs">
                                              {cellContent.original}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <span className="block truncate overflow-hidden text-ellipsis">
                                          {cellContent.text}
                                        </span>
                                      )}
                                    </button>
                                  ) : cellContent.truncated ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help block truncate overflow-hidden text-ellipsis">
                                          {cellContent.text}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[600px] max-h-[300px] overflow-auto">
                                        <p className="whitespace-pre-wrap break-words text-xs">
                                          {cellContent.original}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="block truncate overflow-hidden text-ellipsis">
                                      {cellContent.text}
                                    </span>
                                  )}
                                </td>
                              );
                            })
                            .filter(Boolean)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
          </TooltipProvider>
        </div>
        {processedData.length > maxRows && (
          <p className="mt-4 text-sm text-muted-foreground">
            Showing top {Math.max(0, maxRows - 2)} rows of {Math.max(0, processedData.length - 2)} total rows
          </p>
        )}
      </CardContent>
      
      {/* Dialogs for beneficiary drill-down */}
      <BeneficiaryTransactionsDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setFilteredTransactions([]);
        }}
        beneficiaryName={selectedBeneficiary}
        transactions={filteredTransactions}
        isLoading={isLoadingTransactions}
      />
      
      <POITransactionsDialog
        open={poiDialogOpen}
        onClose={() => {
          setPOIDialogOpen(false);
          setPOITransactions([]);
        }}
        beneficiaryName={selectedBeneficiary}
        transactions={poiTransactions}
        isLoading={isLoadingTransactions}
      />
    </Card>
  );
}
