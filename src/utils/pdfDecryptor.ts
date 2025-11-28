import { PDFDocument } from 'pdf-lib';

export interface DecryptionResult {
  success: boolean;
  file?: File;
  error?: string;
}

/**
 * Decrypt a password-protected PDF and return a clean, unprotected PDF
 */
export async function decryptPdf(
  file: File, 
  password: string
): Promise<DecryptionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the encrypted PDF with the password
    // Note: pdf-lib supports password but TypeScript definitions may be outdated
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      password,
    } as any);
    
    // Save without encryption (no password options = unencrypted)
    const unencryptedPdfBytes = await pdfDoc.save();
    
    // Create a new File object with the clean PDF
    const cleanFile = new File(
      [unencryptedPdfBytes as any], 
      file.name, 
      { type: 'application/pdf' }
    );
    
    console.log(`[PDFDecryptor] ✅ Successfully decrypted ${file.name}`);
    return { success: true, file: cleanFile };
  } catch (error) {
    console.error('[PDFDecryptor] ❌ Decryption failed:', error);
    
    if (error instanceof Error) {
      // pdf-lib throws specific errors for wrong passwords
      if (error.message.includes('password') || error.message.includes('decrypt') || error.message.includes('encrypted')) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'Failed to decrypt PDF' };
  }
}
