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
    const mergedRangeMap = new Map<string, any>();
    
    // Get merged ranges - correct API usage
    const mergedRanges = [];
    if (worksheet.mergeCells) {
      // Extract merged ranges from worksheet
      for (const range in worksheet.mergeCells) {
        mergedRanges.push(range);
      }
    }
    
    // Process merged ranges to mark hidden cells and store range info
    mergedRanges.forEach((range: string) => {
      // Parse the range (e.g., "A1:C3")
      const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        const [, startCol, startRow, endCol, endRow] = match;
        const startColNum = getColumnNumber(startCol);
        const endColNum = getColumnNumber(endCol);
        const startRowNum = parseInt(startRow);
        const endRowNum = parseInt(endRow);
        
        // Store the range info for the master cell
        const masterKey = `${startRowNum}-${startColNum}`;
        mergedRangeMap.set(masterKey, {
          startRow: startRowNum,
          endRow: endRowNum,
          startCol: startColNum,
          endCol: endColNum,
        });
        
        // Mark all cells except the master as hidden
        for (let row = startRowNum; row <= endRowNum; row++) {
          for (let col = startColNum; col <= endColNum; col++) {
            if (row !== startRowNum || col !== startColNum) {
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
        const cellKey = `${rowNum}-${colNum}`;
        const isHidden = mergedCells.has(cellKey);
        
        let merged: CellData['merged'] | undefined;
        
        // Check if this cell is the master of a merged range
        if (mergedRangeMap.has(cellKey)) {
          merged = mergedRangeMap.get(cellKey);
        }

        // Get cell value, handling formula results
        let cellValue = cell.value;
        if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) {
          cellValue = cell.result;
        }

        const cellData: CellData = {
          value: cellValue,
          isHidden,
          merged,
          style: {
            backgroundColor: parseExcelColor((cell.fill as any)?.fgColor || (cell.fill as any)?.bgColor),
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