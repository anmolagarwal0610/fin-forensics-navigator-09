import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MergedRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface CellData {
  value: any;
  style?: {
    backgroundColor?: string;
    fontColor?: string;
    fontWeight?: string;
    border?: boolean;
  };
  merged?: MergedRange;
  isHidden?: boolean;
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
}

export default function ExcelViewer({ title, data, onDownload, maxRows = 25, fileUrl }: ExcelViewerProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [processedData, setProcessedData] = useState<CellData[][]>([]);

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
    // Convert "C1:D1" to coordinates
    const [start, end] = range.split(':');
    const parseCell = (cellAddress: string) => {
      const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
      if (!match) return { col: 0, row: 0 };
      const [, letters, numbers] = match;
      const col = letters.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const row = parseInt(numbers) - 1;
      return { col, row };
    };
    
    const startCoord = parseCell(start);
    const endCoord = parseCell(end);
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
      console.log('Applying merges from preview:', previewData.merges);
      
      previewData.merges.forEach(rangeStr => {
        const range = parseRange(rangeStr);
        console.log(`Processing merge range ${rangeStr}:`, range);
        
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

  // Load preview JSON if fileUrl is provided
  useEffect(() => {
    if (!fileUrl) return;

    const loadPreview = async () => {
      try {
        let previewUrl: string;
        
        // Check if fileUrl is already a JSON blob URL (from ZIP extraction)
        if (fileUrl.includes('blob:') && fileUrl.includes('application/json')) {
          previewUrl = fileUrl;
          console.log('🔍 Using extracted JSON blob URL directly');
        } 
        // For test files, use static path
        else if (fileUrl.includes('test-files')) {
          previewUrl = '/test-files/beneficiaries_by_file.preview.json';
        } 
        // For blob URLs of Excel files, we can't construct preview URL
        else if (fileUrl.includes('blob:')) {
          console.warn('⚠️ Cannot fetch preview JSON from Excel blob URL, colors will not be applied');
          setPreviewData(null);
          return;
        } 
        // For regular file URLs, try to construct preview URL
        else {
          previewUrl = fileUrl.replace(/\.xlsx$/i, '.preview.json');
        }
        
        console.log('🔍 Attempting to fetch preview JSON from:', previewUrl);
        const response = await fetch(previewUrl);
        
        if (response.status === 200) {
          // Check content type to avoid binary data
          const contentType = response.headers.get('content-type');
          console.log('📄 Response content-type:', contentType);
          
          if (contentType && !contentType.includes('application/json') && !contentType.includes('text/')) {
            console.error('❌ Invalid content type, expected JSON but got:', contentType);
            setPreviewData(null);
            return;
          }
          
          const responseText = await response.text();
          console.log('📄 Raw response text length:', responseText.length);
          
          // Check if response starts with binary markers
          if (responseText.startsWith('PK') || responseText.includes('\x00')) {
            console.error('❌ Binary content detected, skipping JSON parsing');
            setPreviewData(null);
            return;
          }
          
          try {
            const preview = JSON.parse(responseText);
            console.log('📋 Parsed preview data:', preview);
            
            // Validate schema
            if (preview.schema === "ffn.preview.v1") {
              console.log('✅ Preview schema validation passed');
              setPreviewData(preview);
              console.log('✅ Successfully loaded preview data with', Object.keys(preview.cell_bg || {}).length, 'cell background colors');
            } else {
              console.warn('❌ Invalid preview schema:', preview.schema, 'Expected: ffn.preview.v1');
              setPreviewData(null);
            }
          } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError);
            console.error('📄 Raw response text:', responseText.substring(0, 200));
            setPreviewData(null);
          }
        } else {
          console.log(`⚠️ Preview JSON not found (${response.status}), using Excel data only`);
          setPreviewData(null);
        }
      } catch (error) {
        console.error('❌ Network error loading preview JSON:', error);
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

  const getCellStyle = (cell: CellData, rowIndex: number, colIndex: number) => {
    const style: React.CSSProperties = {};
    const cellAddress = toA1(colIndex, rowIndex);
    
    // Check if we're in dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    
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

    // Apply background color and calculate contrast
    if (backgroundColor) {
      style.backgroundColor = backgroundColor;
      
      // Calculate contrast and set appropriate text color
      const luminance = getLuminance(backgroundColor);
      
      // In dark mode, prefer white text on colored backgrounds
      if (isDarkMode) {
        style.color = luminance > 0.8 ? '#000000' : '#ffffff';
      } else {
        style.color = luminance > 0.5 ? '#000000' : '#ffffff';
      }
    }
    
    // Excel font color logic - override black colors in dark mode
    if (cell.style?.fontColor) {
      const excelFontColor = cell.style.fontColor;
      
      // Always override black Excel font color in dark mode
      if (isDarkMode && excelFontColor === '#000000') {
        style.color = '#ffffff';
      } else if (!isDarkMode || excelFontColor !== '#000000') {
        style.color = excelFontColor;
      }
    }
    
    if (cell.style?.fontWeight) {
      style.fontWeight = cell.style.fontWeight;
    }
    
    if (cell.style?.border) {
      style.border = '1px solid hsl(var(--border))';
    }
    
    return style;
  };

  const getCellSpan = (cell: CellData) => {
    if (!cell.merged) return {};
    
    const colSpan = cell.merged.endCol - cell.merged.startCol + 1;
    const rowSpan = cell.merged.endRow - cell.merged.startRow + 1;
    
    return {
      colSpan: colSpan > 1 ? colSpan : undefined,
      rowSpan: rowSpan > 1 ? rowSpan : undefined,
    };
  };

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
        <p className="text-xs text-muted-foreground mb-4">
          Credit and Debit amounts are with respect to bank statements. Any amount appearing under Total Credit means that the bank account owner received that amount from the beneficiary. Any amount under Total Debit means the bank account owner paid that amount to the beneficiary.
        </p>
        <div className="relative">
          <ScrollArea className="h-[600px] w-full">
            <ScrollBar orientation="horizontal" />
            <div className="overflow-x-auto">
              <table className="border-collapse min-w-full">
                <tbody>
                  {displayData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                    {row
                      .map((cell, colIndex) => {
                        // Skip rendering cells that are part of a merged range but not the top-left cell
                        if (cell.isHidden) {
                          return null;
                        }

                        const span = getCellSpan(cell);
                        const style = getCellStyle(cell, rowIndex, colIndex);

                        return (
                          <td
                            key={colIndex}
                            {...span}
                            style={style}
                            className="p-2 text-sm border border-border align-top whitespace-nowrap min-w-[120px]"
                          >
                            {cell.value || ''}
                          </td>
                        );
                      })
                      .filter(Boolean)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </div>
        {processedData.length > maxRows && (
          <p className="mt-4 text-sm text-muted-foreground">
            Showing top {maxRows} rows of {Math.max(0, processedData.length - 3)} total rows
          </p>
        )}
      </CardContent>
    </Card>
  );
}