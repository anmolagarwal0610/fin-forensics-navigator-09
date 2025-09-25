import React from 'react';
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

interface ExcelViewerProps {
  title: string;
  data: CellData[][];
  onDownload?: () => void;
  maxRows?: number;
}

export default function ExcelViewer({ title, data, onDownload, maxRows = 25 }: ExcelViewerProps) {
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

  const getCellStyle = (cell: CellData) => {
    const style: React.CSSProperties = {};
    
    // Helper function to calculate luminance for contrast
    const getLuminance = (hex: string) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    
    if (cell.style?.backgroundColor) {
      style.backgroundColor = cell.style.backgroundColor;
      console.log('Cell background color:', cell.style.backgroundColor, 'for value:', cell.value);
      
      // Calculate contrast and set appropriate text color
      const luminance = getLuminance(cell.style.backgroundColor);
      style.color = luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    // Font color from Excel overrides calculated contrast
    if (cell.style?.fontColor) {
      style.color = cell.style.fontColor;
      console.log('Cell font color:', cell.style.fontColor, 'for value:', cell.value);
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
                      const style = getCellStyle(cell);

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