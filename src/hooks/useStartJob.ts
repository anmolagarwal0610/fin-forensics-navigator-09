import { uploadInput } from '@/lib/uploadInput';
import { startJob } from '@/lib/startJob';
import { subscribeJob } from '@/lib/subscribeJob';
import type { JobTask, JobRow } from '@/types/job';

/**
 * Main controller for starting a job and listening to updates
 */
export async function startJobFlow(
  files: File[],
  task: JobTask,
  sessionId: string,
  userId: string,
  setJob: (j: Partial<JobRow>) => void,
  onDone?: (row: JobRow) => void
) {
  // 1. Upload files, create ZIP, and get signed ZIP URL
  const { signedUrl: zipUrl } = await uploadInput(files, userId, sessionId);
  
  // 2. Start job via FastAPI with ZIP URL
  const { job_id, status } = await startJob(task, zipUrl, sessionId, userId);
  
  // 3. Set initial job state
  setJob({ 
    id: job_id, 
    task, 
    status, 
    url: null, 
    error: null,
    session_id: sessionId 
  } as Partial<JobRow>);

  // 4. Subscribe to Realtime updates
  const unsubscribe = subscribeJob(job_id, (row) => {
    setJob(row);
    
    if (row.status === 'SUCCEEDED' || row.status === 'FAILED') {
      unsubscribe();
      onDone?.(row);
    }
  });

  return { job_id, unsubscribe };
}
