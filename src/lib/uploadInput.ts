import { supabase } from '@/integrations/supabase/client';

/**
 * Upload file to Supabase Storage and return signed URL
 */
export async function uploadInput(
  file: File, 
  userId: string, 
  caseId: string
): Promise<{ objectPath: string; signedUrl: string }> {
  const bucket = 'case-files';
  const objectPath = `${userId}/${caseId}/${Date.now()}-${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 3600); // 1 hour expiry

  if (signedError || !signedData) throw new Error("Failed to generate signed URL");

  return { objectPath, signedUrl: signedData.signedUrl };
}
