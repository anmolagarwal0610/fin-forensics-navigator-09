import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { addFiles } from '@/api/cases';

export interface PasswordEntry {
  filename: string;
  password: string;
}

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
  skipFileInsertion: boolean = false,
  passwords?: PasswordEntry[]
): Promise<{ zipPath: string; signedUrl: string }> {
  const bucket = 'case-files';
  
  console.log(`📦 Starting upload for ${files.length} files`);
  
  try {
    // STEP 1: Read all file buffers ONCE upfront (critical fix for hanging issue)
    console.log('📖 Reading file buffers...');
    const fileBuffers = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await file.arrayBuffer();
          console.log(`✓ Read buffer for ${file.name} (${Math.round(buffer.byteLength / 1024)} KB)`);
          return {
            file,
            buffer,
            name: file.name
          };
        } catch (error) {
          console.error(`❌ Failed to read ${file.name}:`, error);
          throw new Error(`Failed to read file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      })
    );
    console.log(`✓ All ${fileBuffers.length} file buffers read successfully`);
    
    // STEP 2: Upload all individual files to storage with sanitized names
    console.log('☁️ Uploading files to storage...');
    const uploadPromises = files.map(async (file) => {
      try {
        const sanitizedName = sanitizeFilename(file.name);
        const objectPath = `${userId}/${caseId}/${sanitizedName}`;
        const { error } = await supabase.storage
          .from(bucket)
          .upload(objectPath, file, { upsert: true });
        
        if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        console.log(`✓ Uploaded ${file.name} to ${objectPath}`);
        return { name: file.name, path: objectPath };
      } catch (error) {
        console.error(`❌ Upload failed for ${file.name}:`, error);
        throw error;
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    console.log(`✓ Uploaded ${files.length} files to storage`);
    
    // STEP 3: Add file records to case_files table with SANITIZED names (unless skipped)
    if (!skipFileInsertion) {
      try {
        const fileRecords = uploadedFiles.map((f, index) => ({
          name: sanitizeFilename(files[index].name),  // Store SANITIZED name for storage access
          url: f.path
        }));

        console.log(`💾 Inserting ${fileRecords.length} file records into database...`);
        await addFiles(caseId, fileRecords);
        console.log(`✓ File records inserted`);
      } catch (error) {
        console.error(`❌ Failed to insert file records:`, error);
        throw new Error(`Failed to insert file records: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log(`⏭️ Skipping file insertion for ${uploadedFiles.length} files (skipFileInsertion=true)`);
    }

    // STEP 4: Create ZIP file locally using PRE-READ buffers
    console.log('🗜️ Creating ZIP file...');
    try {
      const zip = new JSZip();
      
      // Use the pre-read buffers instead of reading file.arrayBuffer() again
      for (const { name, buffer } of fileBuffers) {
        zip.file(name, buffer);
        console.log(`✓ Added ${name} to ZIP`);
      }
      
      // Add password.txt if there are protected files
      if (passwords && passwords.length > 0) {
        const passwordData = {
          version: "1.0",
          protected_files: passwords
        };
        const passwordJson = JSON.stringify(passwordData, null, 2);
        zip.file('password.txt', passwordJson);
        console.log(`📝 Added password.txt with ${passwords.length} password(s) to ZIP`);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      console.log(`✓ Created ZIP file, size: ${Math.round(zipBlob.size / 1024)} KB`);

      // STEP 5: Upload ZIP to storage
      console.log('☁️ Uploading ZIP to storage...');
      const zipFileName = `case_${caseId}_${Date.now()}.zip`;
      const zipPath = `${userId}/zips/${zipFileName}`;
      
      const { error: zipError } = await supabase.storage
        .from(bucket)
        .upload(zipPath, zipBlob, { 
          contentType: 'application/zip',
          upsert: true 
        });

      if (zipError) throw new Error(`Failed to upload ZIP: ${zipError.message}`);
      console.log(`✓ ZIP uploaded to ${zipPath}`);

      // STEP 6: Create signed URL for ZIP (8 hours expiry)
      console.log('🔗 Generating signed URL...');
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(zipPath, 60 * 60 * 8);

      if (signedError || !signedData) throw new Error("Failed to generate signed URL for ZIP");
      console.log(`✓ Signed URL generated`);

      // STEP 7: Save input_zip_url (storage path) to cases table for admin access
      console.log('💾 Saving ZIP path to database...');
      const { error: updateError } = await supabase
        .from('cases')
        .update({ input_zip_url: zipPath })
        .eq('id', caseId);

      if (updateError) {
        console.error('⚠️ Failed to save input_zip_url:', updateError);
        // Don't throw - this is non-critical for the upload flow
      } else {
        console.log(`✓ ZIP URL saved to database`);
      }

      console.log('✅ Upload flow completed successfully');
      return { zipPath, signedUrl: signedData.signedUrl };
      
    } catch (error) {
      console.error('❌ ZIP creation or upload failed:', error);
      throw new Error(`ZIP creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Upload flow failed:', error);
    throw error;
  }
}
