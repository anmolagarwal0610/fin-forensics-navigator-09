import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  // Helper function to convert 0-based row/col to A1 notation
  const toA1 = (col: number, row: number): string => {
    let columnName = '';
    let tempCol = col;
    while (tempCol >= 0) {
      columnName = String.fromCharCode(65 + (tempCol % 26)) + columnName;
      tempCol = Math.floor(tempCol / 26) - 1;
      if (tempCol < 0) break;
    }
    return columnName + (row + 1);
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
        const previewUrl = fileUrl.replace(/\.xlsx$/i, '.preview.json');
        console.log('Attempting to fetch preview JSON from:', previewUrl);
        const response = await fetch(previewUrl);
        
        if (response.status === 200) {
          const preview = await response.json();
          setPreviewData(preview);
          console.log('Successfully loaded preview data:', preview);
        } else {
          console.log(`Preview JSON not found (${response.status}), using Excel data only`);
          setPreviewData(null);
        }
      } catch (error) {
        console.log('Failed to load preview JSON:', error);
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
    
    // Helper function to calculate luminance for contrast
    const getLuminance = (hex: string) => {
      if (!hex || hex === 'transparent') return 0.5;
      const cleanHex = hex.replace('#', '');
      const rgb = parseInt(cleanHex, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    let backgroundColor = cell.style?.backgroundColor;
    
    // Check preview JSON for background color - this takes priority
    if (previewData?.cell_bg) {
      const cellAddress = toA1(colIndex, rowIndex);
      const previewBg = previewData.cell_bg[cellAddress];
      if (previewBg) {
        backgroundColor = previewBg;
        console.log(`Applying preview background for ${cellAddress}: ${previewBg}`);
      }
    }

    // Apply background color and calculate contrast
    if (backgroundColor) {
      style.backgroundColor = backgroundColor;
      
      // Calculate contrast and set appropriate text color
      const luminance = getLuminance(backgroundColor);
      style.color = luminance > 0.5 ? '#000000' : '#ffffff';
      console.log(`Cell ${toA1(colIndex, rowIndex)}: bg=${backgroundColor}, luminance=${luminance.toFixed(3)}, text=${style.color}`);
    }
    
    // Font color from Excel overrides calculated contrast (unless it's black with a colored background)
    if (cell.style?.fontColor && !(backgroundColor && cell.style.fontColor === '#000000')) {
      style.color = cell.style.fontColor;
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
                        const hasCustomStyle = style.backgroundColor || style.color;

                        return (
                          <td
                            key={colIndex}
                            {...span}
                            style={style}
                            className={`p-2 text-sm border border-border align-top whitespace-nowrap min-w-[120px] ${!hasCustomStyle ? 'text-foreground' : ''}`}
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