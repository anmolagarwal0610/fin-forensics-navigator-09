import * as pdfjsLib from 'pdfjs-dist';

export interface PasswordVerificationResult {
  valid: boolean;
  pageCount?: number;
  error?: string;
}

/**
 * Verify PDF password without decrypting the file
 * Uses pdfjs-dist which supports AES-256 encryption
 */
export async function verifyPdfPassword(
  file: File,
  password: string
): Promise<PasswordVerificationResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Try to load PDF with password
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password
    });
    
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    
    console.log(`✅ Password verified for ${file.name} (${pageCount} pages)`);
    
    return {
      valid: true,
      pageCount: pageCount
    };
    
  } catch (error: any) {
    // Check if it's a password error
    if (error.name === 'PasswordException') {
      console.error(`❌ Incorrect password for ${file.name}`);
      return {
        valid: false,
        error: 'Incorrect password. Please try again.'
      };
    }
    
    // Other errors
    console.error(`❌ Failed to verify password for ${file.name}:`, error);
    return {
      valid: false,
      error: error.message || 'Failed to verify password'
    };
  }
}

