import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { addFiles } from '@/api/cases';

/**
 * Sanitize filename for Supabase Storage compatibility
 * Removes invalid characters while preserving extension
 */
function sanitizeFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  
  // Remove invalid characters: [ ] { } ^ % ` > < ~ # | and spaces
  const sanitized = name
    .replace(/[\[\]\{\}\^%`><~#\|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // Truncate if too long (max 255 chars)
  const maxLength = 255 - ext.length;
  const truncated = sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
  
  return truncated + ext;
}

/**
 * Upload files to Supabase Storage, create ZIP, and return ZIP signed URL
 */
export async function uploadInput(
  files: File[],
  userId: string,
  caseId: string,
  skipFileInsertion: boolean = false
): Promise<{ zipPath: string; signedUrl: string }> {
  const bucket = 'case-files';
  
  // First, upload all individual files to storage with sanitized names
  const uploadPromises = files.map(async (file) => {
    const sanitizedName = sanitizeFilename(file.name);
    const objectPath = `${userId}/${caseId}/${sanitizedName}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, { upsert: true });
    
    if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    return { name: file.name, path: objectPath };
  });

  const uploadedFiles = await Promise.all(uploadPromises);
  console.log(`Uploaded ${files.length} files to storage`);
  
  // 3. Add file records to case_files table with SANITIZED names (unless skipped)
  if (!skipFileInsertion) {
    const fileRecords = uploadedFiles.map((f, index) => ({
      name: sanitizeFilename(files[index].name),  // Store SANITIZED name for storage access
      url: f.path
    }));

    console.log(`Inserting ${fileRecords.length} file records:`, fileRecords);
    await addFiles(caseId, fileRecords);
  } else {
    console.log(`Skipping file insertion for ${uploadedFiles.length} files (skipFileInsertion=true)`);
  }

  // Create ZIP file locally
  const zip = new JSZip();
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    zip.file(file.name, arrayBuffer);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  console.log(`Created ZIP file, size: ${Math.round(zipBlob.size / 1024)} KB`);

  // Upload ZIP to storage
  const zipFileName = `case_${caseId}_${Date.now()}.zip`;
  const zipPath = `${userId}/zips/${zipFileName}`;
  
  const { error: zipError } = await supabase.storage
    .from(bucket)
    .upload(zipPath, zipBlob, { 
      contentType: 'application/zip',
      upsert: true 
    });

  if (zipError) throw new Error(`Failed to upload ZIP: ${zipError.message}`);

  // Create signed URL for ZIP (8 hours expiry)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(zipPath, 60 * 60 * 8);

  if (signedError || !signedData) throw new Error("Failed to generate signed URL for ZIP");

  console.log('ZIP file uploaded and signed URL generated');
  return { zipPath, signedUrl: signedData.signedUrl };
}
