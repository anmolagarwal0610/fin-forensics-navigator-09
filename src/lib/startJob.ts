import type { JobTask, JobResp } from '@/types/job';
import { withBackendRetry } from './runtime-config';

/**
 * Start a job by calling FastAPI /jobs endpoint
 * Backend URL is fetched dynamically from Supabase runtime config
 */
export async function startJob(
  task: JobTask,
  signedUrl: string,
  sessionId: string,
  userId: string
): Promise<JobResp> {
  return withBackendRetry(async (backendApiUrl) => {
    console.log(`🚀 Starting ${task} job via ${backendApiUrl}`);
    
    const res = await fetch(`${backendApiUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({ 
        task, 
        zipUrl: signedUrl, 
        sessionId, 
        userId 
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to start job: ${res.status} ${errorText}`);
    }

    const result = await res.json() as JobResp;
    console.log(`✅ Job started successfully:`, result);
    return result;
  });
}
