import * as ExcelJS from 'exceljs';

interface CellData {
  value: any;
  style?: {
    backgroundColor?: string;
    fontColor?: string;
    fontWeight?: string;
    border?: boolean;
  };
  merged?: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  isHidden?: boolean;
}

const parseExcelColor = (color: any): string | undefined => {
  if (!color) return undefined;
  
  if (color.argb) {
    // Convert ARGB to hex
    const argb = color.argb;
    if (argb.length === 8) {
      const hex = `#${argb.slice(2)}`;
      return hex;
    }
  }
  
  if (color.rgb) {
    return `#${color.rgb}`;
  }
  
  if (color.theme !== undefined) {
    // Excel theme colors - map to reasonable defaults
    const themeColors = [
      '#FFFFFF', '#000000', '#E7E6E6', '#44546A', 
      '#5B9BD5', '#ED7D31', '#A5A5A5', '#FFC000',
      '#4472C4', '#70AD47'
    ];
    return themeColors[color.theme] || '#000000';
  }
  
  return undefined;
};

const getColumnNumber = (columnLetter: string): number => {
  let result = 0;
  for (let i = 0; i < columnLetter.length; i++) {
    result = result * 26 + (columnLetter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result;
};

export const parseExcelFile = async (arrayBuffer: ArrayBuffer): Promise<CellData[][]> => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found');
    }

    const result: CellData[][] = [];
    const mergedCells = new Set<string>();
    
    // Get merged ranges
    const mergedRanges = worksheet.mergeCells || {};
    
    // Process merged ranges to mark hidden cells
    Object.keys(mergedRanges).forEach(range => {
      const mergedRange = worksheet.getCell(range);
      const address = mergedRange.address;
      
      // Parse the range (e.g., "A1:C3")
      const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        const [, startCol, startRow, endCol, endRow] = match;
        const startColNum = getColumnNumber(startCol);
        const endColNum = getColumnNumber(endCol);
        
        for (let row = parseInt(startRow); row <= parseInt(endRow); row++) {
          for (let col = startColNum; col <= endColNum; col++) {
            if (row !== parseInt(startRow) || col !== startColNum) {
              mergedCells.add(`${row}-${col}`);
            }
          }
        }
      }
    });

    // Get the actual used range
    const rowCount = worksheet.actualRowCount || 0;
    const colCount = worksheet.actualColumnCount || 0;

    for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
      const row: CellData[] = [];
      
      for (let colNum = 1; colNum <= colCount; colNum++) {
        const cell = worksheet.getCell(rowNum, colNum);
        const isHidden = mergedCells.has(`${rowNum}-${colNum}`);
        
        let merged: CellData['merged'] | undefined;
        
        // Check if this cell is the top-left of a merged range
        if (cell.isMerged && !isHidden) {
          const masterCell = cell.master || cell;
          if (masterCell.address === cell.address) {
            // This is the master cell of a merged range
            const range = Object.keys(mergedRanges).find(r => {
              const rangeCell = worksheet.getCell(r);
              return rangeCell.address === cell.address;
            });
            
            if (range) {
              const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
              if (match) {
                const [, startCol, startRow, endCol, endRow] = match;
                merged = {
                  startRow: parseInt(startRow),
                  endRow: parseInt(endRow),
                  startCol: getColumnNumber(startCol),
                  endCol: getColumnNumber(endCol),
                };
              }
            }
          }
        }

        const cellData: CellData = {
          value: cell.value,
          isHidden,
          merged,
          style: {
            backgroundColor: parseExcelColor((cell.fill as any)?.fgColor),
            fontColor: parseExcelColor(cell.font?.color),
            fontWeight: cell.font?.bold ? 'bold' : 'normal',
            border: !!(cell.border?.top || cell.border?.bottom || cell.border?.left || cell.border?.right),
          }
        };

        row.push(cellData);
      }
      
      result.push(row);
    }

    return result;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw error;
  }
};