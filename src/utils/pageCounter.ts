import * as pdfjsLib from 'pdfjs-dist';
import * as ExcelJS from 'exceljs';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PageCount {
  fileName: string;
  pages: number;
  fileType: 'pdf' | 'excel' | 'csv' | 'image' | 'unknown';
}

/**
 * Count pages in a PDF file
 */
async function countPdfPages(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

/**
 * Count "pages" in Excel files (50 rows = 1 page, rounded down)
 */
async function countExcelPages(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  let totalRows = 0;
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row) => {
      const hasData = row.values && Array.isArray(row.values) && 
        row.values.some(val => val !== null && val !== undefined && val !== '');
      if (hasData) totalRows++;
    });
  });
  
  // 50 rows = 1 page, round down (120 rows = 2 pages)
  return Math.floor(totalRows / 50);
}

/**
 * Count "pages" in CSV files (50 rows = 1 page, rounded down)
 */
async function countCsvPages(file: File): Promise<number> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Subtract 1 for header row if exists
  const dataRows = lines.length > 1 ? lines.length - 1 : lines.length;
  
  // 50 rows = 1 page, round down
  return Math.floor(dataRows / 50);
}

/**
 * Count "pages" for image files (1 image = 1 page)
 */
function countImagePages(): number {
  return 1;
}

/**
 * Detect file type and count pages
 */
export async function countFilePages(file: File): Promise<PageCount> {
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileName.endsWith('.pdf')) {
      const pages = await countPdfPages(file);
      return { fileName: file.name, pages, fileType: 'pdf' };
    } 
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const pages = await countExcelPages(file);
      return { fileName: file.name, pages, fileType: 'excel' };
    }
    else if (fileName.endsWith('.csv')) {
      const pages = await countCsvPages(file);
      return { fileName: file.name, pages, fileType: 'csv' };
    }
    else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      const pages = countImagePages();
      return { fileName: file.name, pages, fileType: 'image' };
    }
    else {
      console.warn(`Unknown file type: ${fileName}`);
      return { fileName: file.name, pages: 0, fileType: 'unknown' };
    }
  } catch (error) {
    console.error(`Error counting pages for ${file.name}:`, error);
    throw new Error(`Failed to count pages in ${file.name}`);
  }
}

/**
 * Count total pages across multiple files
 */
export async function countTotalPages(files: File[]): Promise<{
  total: number;
  breakdown: PageCount[];
}> {
  const breakdown = await Promise.all(files.map(countFilePages));
  const total = breakdown.reduce((sum, item) => sum + item.pages, 0);
  
  return { total, breakdown };
}
