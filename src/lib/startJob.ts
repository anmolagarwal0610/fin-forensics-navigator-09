import type { JobTask, JobResp } from '@/types/job';

/**
 * Start a job by calling FastAPI /jobs endpoint
 */
export async function startJob(
  task: JobTask,
  signedUrl: string,
  sessionId: string,
  userId: string
): Promise<JobResp> {
  // Get backend API URL from environment or use the secret value
  const backendApiUrl = import.meta.env.VITE_API_BASE;
  if (!backendApiUrl) throw new Error("VITE_API_BASE not configured");

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

  return res.json() as Promise<JobResp>;
}
