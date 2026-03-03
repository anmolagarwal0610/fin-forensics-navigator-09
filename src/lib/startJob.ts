import { supabase } from '@/integrations/supabase/client';
import type { JobTask, JobResp } from '@/types/job';
import { getBackendApiUrl } from './runtime-config';

/**
 * Start a job by creating it in Supabase first (source of truth),
 * then notify the backend via fire-and-forget.
 * 
 * This ensures jobs are never lost even if backend is offline.
 * The backend's replay_pending_jobs() will pick up pending jobs on restart.
 */
export async function startJob(
  task: JobTask,
  signedUrl: string,
  sessionId: string,
  userId: string
): Promise<JobResp> {
  const job_id = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  
  console.log(`📝 Creating job ${job_id} in Supabase first...`);
  
  // 0. PRE-FLIGHT: Check for existing active job on this session
  const { data: activeJobs, error: checkError } = await supabase
    .from('jobs')
    .select('id, status')
    .eq('session_id', sessionId)
    .in('status', ['PENDING', 'RUNNING', 'STARTED']);
  
  if (checkError) {
    console.warn('⚠️ Pre-flight check failed, proceeding anyway:', checkError);
  } else if (activeJobs && activeJobs.length > 0) {
    console.warn(`🚫 Active job already exists for session ${sessionId}:`, activeJobs[0]);
    throw new Error(`A job is already running for this case (${activeJobs[0].id.slice(0, 8)}...). Please wait for it to complete.`);
  }
  
  // 1. INSERT job into Supabase FIRST (source of truth)
  const { error: insertError } = await supabase
    .from('jobs')
    .insert({
      id: job_id,
      task,
      user_id: userId,
      session_id: sessionId,
      input_url: signedUrl,
      status: 'PENDING',
      idempotency_key: idempotencyKey,
    });
  
  if (insertError) {
    console.error('❌ Failed to create job in Supabase:', insertError);
    throw new Error(`Failed to create job: ${insertError.message}`);
  }
  
  console.log(`✅ Job ${job_id} created in Supabase with status PENDING`);
  
  // 2. Update case status to Processing
  const hitlStage = task === 'initial-parse' ? 'initial_parse' : 
                    task === 'final-analysis' ? 'final_analysis' : 
                    task === 'parse-statements' ? 'parse_statements' : null;
  
  const { error: caseError } = await supabase
    .from('cases')
    .update({ 
      status: 'Processing',
      hitl_stage: hitlStage
    })
    .eq('id', sessionId);
  
  if (caseError) {
    console.warn('⚠️ Failed to update case status:', caseError);
    // Don't throw - job is created, case update is secondary
  }
  
  // 3. Attempt to notify backend (fire-and-forget)
  // This runs in background - we don't await it
  notifyBackend(job_id, task, signedUrl, sessionId, userId, idempotencyKey);
  
  return { job_id, status: 'PENDING' };
}

/**
 * Fire-and-forget notification to backend.
 * If backend is offline, job remains PENDING and will be picked up
 * when backend restarts via replay_pending_jobs().
 */
async function notifyBackend(
  jobId: string,
  task: JobTask,
  zipUrl: string,
  sessionId: string,
  userId: string,
  idempotencyKey: string
): Promise<void> {
  try {
    const backendUrl = await getBackendApiUrl();
    console.log(`📤 Notifying backend at ${backendUrl}/jobs/pickup...`);
    
    const res = await fetch(`${backendUrl}/jobs/pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        job_id: jobId,
        task,
        zipUrl,
        sessionId,
        userId
      })
    });
    
    if (res.ok) {
      console.log(`✅ Backend notified successfully for job ${jobId}`);
    } else {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.warn(`⚠️ Backend notification failed (${res.status}): ${errorText}`);
      console.warn(`Job ${jobId} will be picked up when backend restarts`);
    }
  } catch (error) {
    // Don't throw - job is already in Supabase and will be processed later
    console.warn('⚠️ Backend unavailable, job will be picked up on restart:', error);
  }
}
