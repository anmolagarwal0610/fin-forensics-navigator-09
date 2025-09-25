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
    backgroundColor: string;
  }>;
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

  // Load preview JSON if fileUrl is provided
  useEffect(() => {
    if (!fileUrl) return;

    const loadPreview = async () => {
      try {
        const previewUrl = fileUrl.replace(/\.xlsx$/i, '.preview.json');
        const response = await fetch(previewUrl);
        
        if (response.status === 200) {
          const preview = await response.json();
          setPreviewData(preview);
          console.log('Loaded preview data:', preview);
        } else {
          console.log('No preview JSON found, using Excel data only');
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

  const displayData = data.slice(0, maxRows);

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
    
    // Check preview JSON for background color
    if (previewData?.cell_bg) {
      const cellAddress = toA1(colIndex, rowIndex);
      const previewBg = previewData.cell_bg[cellAddress];
      if (previewBg) {
        backgroundColor = previewBg;
        console.log(`Using preview background for ${cellAddress}:`, previewBg);
      }
    }

    // Apply background color
    if (backgroundColor) {
      style.backgroundColor = backgroundColor;
      
      // Calculate contrast and set appropriate text color
      const luminance = getLuminance(backgroundColor);
      style.color = luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    // Font color from Excel overrides calculated contrast (unless it's black and we have a background)
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
        <ScrollArea className="h-[600px] w-full overflow-auto">
          <div className="min-w-max">
            <table className="border-collapse">
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
                          className={`p-2 text-sm border border-border align-top whitespace-nowrap min-w-[120px] ${!cell.style?.backgroundColor && !cell.style?.fontColor ? 'text-foreground' : ''}`}
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
        {data.length > maxRows && (
          <p className="mt-4 text-sm text-muted-foreground">
            Showing top {maxRows} rows of {Math.max(0, data.length - 3)} total rows
          </p>
        )}
      </CardContent>
    </Card>
  );
}