import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Download, Search, X, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CellData } from '@/utils/excelParser';
import JSZip from 'jszip';
import { parseExcelFile } from '@/utils/excelParser';
import { useVirtualizer } from '@tanstack/react-virtual';
import BeneficiaryTransactionsDialog, { TransactionRow } from './BeneficiaryTransactionsDialog';
import POITransactionsDialog, { POITransactionRow } from './POITransactionsDialog';
import EditGroupedNamesDialog, { BeneficiaryEntry, GroupingOverrideResult, PendingClusterState } from './EditGroupedNamesDialog';
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
  // Grouping overrides
  onSaveGroupingOverride?: (context: "cross_file" | "individual", targetCluster: string, overrides: GroupingOverrideResult, fileName?: string) => void;
  pendingOverrides?: Record<string, PendingClusterState>;
  // Trace transaction props
  fundTracesData?: import("@/types/traceTransaction").BatchTraceResponse | null;
  caseId?: string;
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
  onSaveGroupingOverride,
  pendingOverrides,
  fundTracesData,
  caseId,
}: ExcelViewerProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [processedData, setProcessedData] = useState<CellData[][]>([]);
  // State to store column indices that should be formatted as currency (INR)
  const [currencyColumnIndices, setCurrencyColumnIndices] = useState<number[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Sort state for Total Credit / Total Debit columns
  const [sortConfig, setSortConfig] = useState<{ column: 'credit' | 'debit' | null; direction: 'desc' | 'asc' | null }>({ column: null, direction: null });
  
  // Debounced search query for full-dataset search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Scroll container ref for virtualizer
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Beneficiary drill-down state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poiDialogOpen, setPOIDialogOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>("");
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRow[]>([]);
  const [poiTransactions, setPOITransactions] = useState<POITransactionRow[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Edit Grouped Names state
  const [editGroupedOpen, setEditGroupedOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<CellData[] | null>(null);
  
  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);
  
  // Find alias/similar names column index in Row 2 for search
  const aliasSearchColumnIndex = useMemo(() => {
    if (processedData.length < 2) return -1;
    const headerRow = processedData[1];
    let lastAliasIdx = -1;
    headerRow.forEach((cell, idx) => {
      const val = String(cell?.value || '').toLowerCase().trim();
      if (val.includes('alias') || val.includes('similar names')) {
        lastAliasIdx = idx;
      }
    });
    return lastAliasIdx;
  }, [processedData]);

  // Find column indices from Row 2 (index 1) headers for beneficiary drill-down
  const columnIndices = useMemo(() => {
    if (!enableBeneficiaryClick || processedData.length < 2) return null;
    
    const headerRow = processedData[1]; // Row 2 is index 1
    const fileRow = processedData[0]; // Row 1 is index 0 (file names)
    
    let filesPresentIdx = -1;
    let similarNamesIdx = -1;
    let totalCreditIdx = -1;
    let totalDebitIdx = -1;
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
      if (headerText === 'total credit') totalCreditIdx = idx;
      if (headerText === 'total debit') totalDebitIdx = idx;
    });
    
    return { filesPresentIdx, similarNamesIdx, totalCreditDebitIndices, totalCreditIdx, totalDebitIdx, fileRow };
  }, [enableBeneficiaryClick, processedData]);

  // Build allBeneficiaries list for EditGroupedNamesDialog search
  const allBeneficiaries = useMemo((): BeneficiaryEntry[] => {
    if (!enableBeneficiaryClick || processedData.length < 3 || !columnIndices) return [];
    const { similarNamesIdx } = columnIndices;
    return processedData.slice(2).map(row => {
      const name = String(row[1]?.value || '').trim();
      const aliasStr = similarNamesIdx !== -1 ? String(row[similarNamesIdx]?.value || '') : '';
      const aliases = aliasStr
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0 && a.toLowerCase() !== name.toLowerCase());
      return { name, aliases };
    }).filter(e => e.name.length > 0);
  }, [enableBeneficiaryClick, processedData, columnIndices]);

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
  const handleBeneficiaryClick = useCallback(async (row: CellData[]) => {
    if (!enableBeneficiaryClick || !zipData || !columnIndices) return;
    const beneficiaryName = String(row[1]?.value || '').trim();
    if (!beneficiaryName) return;
    
    setSelectedBeneficiary(beneficiaryName);
    setSelectedRowData(row);
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
                source_file: String(txRow[colMap['source_file']]?.value || ''),
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
  }, [enableBeneficiaryClick, zipData, columnIndices, findSourceFile, rawDataCache, poiDataCache, onCacheRawData, onCachePOIData]);

  // Check if a cell should be clickable (beneficiary column)
  const isBeneficiaryCell = useCallback((rowIndex: number, colIndex: number): boolean => {
    if (!enableBeneficiaryClick || !zipData || rowIndex < 2) return false;
    // Second column (index 1) contains beneficiary names, starting from row 2 (index 2)
    return colIndex === 1;
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
  
  // Debounce search query for full-dataset search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Pre-computed search index: array of { idx, text } for all data rows
  const searchIndex = useMemo(() => {
    if (!enableBeneficiaryClick || processedData.length < 3) return null;
    const entries: Array<{ idx: number; text: string }> = [];
    for (let i = 2; i < processedData.length; i++) {
      const row = processedData[i];
      const name = String(row[1]?.value || '').toLowerCase();
      const alias = aliasSearchColumnIndex !== -1 ? String(row[aliasSearchColumnIndex]?.value || '').toLowerCase() : '';
      entries.push({ idx: i, text: `${name}\t${alias}` });
    }
    return entries;
  }, [processedData, enableBeneficiaryClick, aliasSearchColumnIndex]);

  // Parse numeric value from a cell (for sorting)
  const parseNumericValue = useCallback((cell: CellData | undefined): number => {
    if (!cell) return 0;
    const val = cell.value;
    if (typeof val === 'number') return val;
    const parsed = parseFloat(String(val || '0').replace(/[₹$€£,\s]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Handle sort toggle (3-state: default → desc → asc → default)
  const handleSortToggle = useCallback((column: 'credit' | 'debit') => {
    setSortConfig(prev => {
      if (prev.column !== column) return { column, direction: 'desc' };
      if (prev.direction === 'desc') return { column, direction: 'asc' };
      return { column: null, direction: null };
    });
  }, []);

  // Filtered + sorted display data (split into headerRows + dataRows)
  const filteredDisplayData = useMemo(() => {
    const headerRows = processedData.slice(0, 2);
    const query = debouncedQuery.toLowerCase().trim();
    
    let dataRows: CellData[][];
    
    if (query && enableBeneficiaryClick && searchIndex) {
      // Search across ALL data (not limited by maxRows)
      const matchedIndices = searchIndex
        .filter(entry => entry.text.includes(query))
        .map(entry => entry.idx);
      dataRows = matchedIndices.map(idx => processedData[idx]);
    } else {
      // Default: show first (maxRows - 2) data rows
      dataRows = processedData.slice(2, maxRows);
    }
    
    // Apply sorting
    if (sortConfig.column && sortConfig.direction && columnIndices) {
      const colIdx = sortConfig.column === 'credit' ? columnIndices.totalCreditIdx : columnIndices.totalDebitIdx;
      if (colIdx !== -1) {
        const dir = sortConfig.direction === 'desc' ? -1 : 1;
        dataRows = [...dataRows].sort((a, b) => {
          return dir * (parseNumericValue(a[colIdx]) - parseNumericValue(b[colIdx]));
        });
      }
    }
    
    return { headerRows, dataRows };
  }, [processedData, maxRows, debouncedQuery, enableBeneficiaryClick, searchIndex, sortConfig, columnIndices, parseNumericValue]);

  // Virtualizer for data rows
  const rowVirtualizer = useVirtualizer({
    count: filteredDisplayData.dataRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 36,
    overscan: 15,
  });

  // Handle search close
  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleCloseSearch();
  };

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

  // Dynamic S.No column width based on row count
  const totalDataRows = filteredDisplayData.dataRows.length;
  const col0WidthClass = totalDataRows >= 1000 ? 'w-16 min-w-[64px] max-w-[80px]' : totalDataRows >= 100 ? 'w-[50px] min-w-[50px] max-w-[64px]' : 'w-10 min-w-[40px] max-w-[60px]';
  const col1LeftClass = totalDataRows >= 1000 ? 'left-[64px]' : totalDataRows >= 100 ? 'left-[50px]' : 'left-[40px]';

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
          This table provides a ranked analysis of all beneficiaries identified in the statement. Total Credit represents the aggregate amount received by the account owner from the beneficiary, while Total Debit represents the aggregate amount paid to the beneficiary.
        </p>
        <div ref={scrollContainerRef} className="relative overflow-auto h-[400px] sm:h-[600px] w-full border rounded-md">
          <TooltipProvider>
                <table className="border-collapse min-w-full">
                  {/* Sticky header for first 2 rows */}
                  <thead className="sticky top-0 z-20">
                    {filteredDisplayData.headerRows.map((row, rowIndex) => (
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
                              ? `sticky left-0 z-30 bg-background ${col0WidthClass}` 
                              : colIndex === 1 
                                ? `sticky ${col1LeftClass} z-30 bg-background shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]` 
                                : '';

                            // Check if this header is a sortable column
                            const sortableCol = enableBeneficiaryClick && rowIndex === 1 && columnIndices
                              ? (colIndex === columnIndices.totalCreditIdx ? 'credit' as const
                                : colIndex === columnIndices.totalDebitIdx ? 'debit' as const
                                : null)
                              : null;

                            return (
                              <th
                                key={colIndex}
                                {...span}
                                style={{ ...style, backgroundColor: style.backgroundColor || 'hsl(var(--background))' }}
                                className={`p-1.5 sm:p-2 text-xs sm:text-sm border border-border align-top overflow-hidden ${colIndex === 0 ? col0WidthClass : 'min-w-[80px] sm:min-w-[120px] max-w-[300px] sm:max-w-[400px]'} text-left font-semibold ${stickyClass}`}
                              >
                                {/* Sort toggle for Total Credit / Total Debit */}
                                {sortableCol ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSortToggle(sortableCol); }}
                                    className="flex items-center gap-1 w-full text-left font-semibold group"
                                  >
                                    <span className="block truncate">{cellContent.text}</span>
                                    <ArrowUpDown className={`h-3 w-3 flex-shrink-0 transition-colors ${
                                      sortConfig.column === sortableCol 
                                        ? 'text-primary' 
                                        : 'text-muted-foreground/50 group-hover:text-muted-foreground'
                                    }`} />
                                    {sortConfig.column === sortableCol && (
                                      <span className="text-[10px] text-primary flex-shrink-0">
                                        {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                      </span>
                                    )}
                                  </button>
                                ) : enableBeneficiaryClick && rowIndex === 1 && colIndex === 1 ? (
                                  <div className="flex items-center gap-1">
                                    {isSearchOpen ? (
                                      <div className="flex items-center gap-1 flex-1">
                                        <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <Input
                                          ref={searchInputRef}
                                          type="text"
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          onKeyDown={handleSearchKeyDown}
                                          placeholder={t('analysis.searchBeneficiary')}
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
                                        <span className="block truncate overflow-hidden text-ellipsis">
                                          {cellContent.text}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsSearchOpen(true);
                                          }}
                                          className="p-1 hover:bg-muted-foreground/20 rounded transition-colors flex-shrink-0"
                                          title="Search beneficiaries"
                                        >
                                          <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : cellContent.truncated ? (
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
                    {(() => {
                      const virtualItems = rowVirtualizer.getVirtualItems();
                      const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
                      const paddingBottom = virtualItems.length > 0 
                        ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end 
                        : 0;
                      return (
                        <>
                          {paddingTop > 0 && (
                            <tr><td colSpan={9999} style={{ height: paddingTop, padding: 0, border: 'none' }} /></tr>
                          )}
                          {virtualItems.map(virtualRow => {
                            const row = filteredDisplayData.dataRows[virtualRow.index];
                            const rowIndex = virtualRow.index + 2;
                            return (
                              <tr key={virtualRow.index} ref={rowVirtualizer.measureElement} data-index={virtualRow.index}>
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
                      // Column 0 (S.No): show as integer
                      if (colIndex === 0) {
                        displayValue = Math.round(rawValue).toString();
                      } else {
                        displayValue = new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(rawValue);
                      }
                    } else if (typeof rawValue === 'string') {
                      displayValue = rawValue.replace('\u200B', '').trim();
                    }

                    const cellContent = truncateText(displayValue);
                    const isClickable = isBeneficiaryCell(rowIndex, colIndex);
                    const isAliasColumn = colIndex === aliasSearchColumnIndex && aliasSearchColumnIndex !== -1;
                                    const showTooltip = cellContent.truncated || (isAliasColumn && displayValue.length > 0);

                                    // Determine sticky column classes for body cells
                                    // Only use bg-background if no inline backgroundColor is set
                                    const hasBgFromStyle = !!style.backgroundColor;
                                    const stickyBg = hasBgFromStyle ? '' : 'bg-background';
                                    const bodyStickyClass = colIndex === 0 
                                      ? `sticky left-0 z-10 ${stickyBg} ${col0WidthClass}` 
                                      : colIndex === 1 
                                        ? `sticky ${col1LeftClass} z-10 ${stickyBg} shadow-[4px_0_6px_-2px_rgba(0,0,0,0.1)]` 
                                        : '';

                                    return (
                                      <td
                                        key={colIndex}
                                        {...span}
                                        style={style}
                                        className={`p-1.5 sm:p-2 text-xs sm:text-sm border border-border align-top overflow-hidden ${colIndex === 0 ? col0WidthClass : 'min-w-[80px] sm:min-w-[120px] max-w-[300px] sm:max-w-[400px]'} text-left ${bodyStickyClass}`}
                                      >
                                        {isClickable ? (
                                          <button
                                            type="button"
                                            onClick={() => handleBeneficiaryClick(row)}
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
                                        ) : showTooltip ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="cursor-help block truncate overflow-hidden text-ellipsis">
                                                {cellContent.truncated ? cellContent.text : displayValue}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[600px] max-h-[300px] overflow-auto">
                                              <p className="whitespace-pre-wrap break-words text-xs">
                                                {cellContent.truncated ? cellContent.original : displayValue}
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
                          {paddingBottom > 0 && (
                            <tr><td colSpan={9999} style={{ height: paddingBottom, padding: 0, border: 'none' }} /></tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
          </TooltipProvider>
        </div>
        {(() => {
          const totalDataRows = Math.max(0, processedData.length - 2);
          const displayedCount = filteredDisplayData.dataRows.length;
          const isSearching = debouncedQuery.trim().length > 0;
          if (isSearching) {
            return (
              <p className="mt-4 text-sm text-muted-foreground">
                Found {displayedCount} matches out of {totalDataRows} total beneficiaries
              </p>
            );
          }
          if (totalDataRows > displayedCount) {
            return (
              <p className="mt-4 text-sm text-muted-foreground">
                Showing top {displayedCount} of {totalDataRows} total beneficiaries
              </p>
            );
          }
          return null;
        })()}
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
        onEditGroupedNames={onSaveGroupingOverride ? () => {
          setEditGroupedOpen(true);
        } : undefined}
        fundTracesData={fundTracesData}
        zipData={zipData}
        caseId={caseId}
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
        onEditGroupedNames={onSaveGroupingOverride ? () => {
          setEditGroupedOpen(true);
        } : undefined}
        fundTracesData={fundTracesData}
        zipData={zipData}
        caseId={caseId}
      />

      {/* Edit Grouped Names Dialog */}
      {onSaveGroupingOverride && (
        <EditGroupedNamesDialog
          open={editGroupedOpen}
          onClose={() => setEditGroupedOpen(false)}
          targetCluster={selectedBeneficiary}
          currentMembers={
            selectedRowData && columnIndices?.similarNamesIdx !== undefined && columnIndices.similarNamesIdx !== -1
              ? String(selectedRowData[columnIndices.similarNamesIdx]?.value || '')
                  .split(',')
                  .map(s => s.trim())
                  .filter(s => s.length > 0)
              : []
          }
          allBeneficiaries={allBeneficiaries}
          context="cross_file"
          existingOverrides={pendingOverrides?.[selectedBeneficiary.toLowerCase()]}
          onSave={(overrides) => {
            onSaveGroupingOverride("cross_file", selectedBeneficiary, overrides);
          }}
        />
      )}
    </Card>
  );
}
