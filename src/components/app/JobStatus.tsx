import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { subscribeJob } from '@/lib/subscribeJob';
import type { JobRow } from '@/types/job';

interface JobStatusProps {
  jobId: string;
  onComplete?: (job: JobRow) => void;
}

export function JobStatus({ jobId, onComplete }: JobStatusProps) {
  const [job, setJob] = useState<JobRow | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeJob(jobId, (row) => {
      setJob(row);
      if (row.status === 'SUCCEEDED' || row.status === 'FAILED') {
        onComplete?.(row);
      }
    });

    return () => unsubscribe();
  }, [jobId, onComplete]);

  if (!job) return <div>Loading job...</div>;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {job.status === 'STARTED' && <Loader2 className="h-5 w-5 animate-spin" />}
          {job.status === 'SUCCEEDED' && <CheckCircle className="h-5 w-5 text-green-600" />}
          {job.status === 'FAILED' && <XCircle className="h-5 w-5 text-red-600" />}
          
          <div className="flex-1">
            <div className="font-medium">Task: {job.task}</div>
            <Badge variant={
              job.status === 'STARTED' ? 'secondary' :
              job.status === 'SUCCEEDED' ? 'success' : 'error'
            }>
              {job.status}
            </Badge>
          </div>

          {job.status === 'SUCCEEDED' && job.url && (
            <Button asChild>
              <a href={job.url} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </a>
            </Button>
          )}

          {job.status === 'FAILED' && job.error && (
            <div className="text-sm text-red-600">Error: {job.error}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
