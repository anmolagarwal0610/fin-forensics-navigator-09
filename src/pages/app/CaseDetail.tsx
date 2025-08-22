
import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/app/StatusBadge";
import { useNavigate, useParams } from "react-router-dom";
import { getCaseById, getCaseEvents, getCaseFiles, type CaseFileRecord, type CaseRecord, type EventRecord } from "@/api/cases";
import { Button } from "@/components/ui/button";

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<CaseRecord | null>(null);
  const [files, setFiles] = useState<CaseFileRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([getCaseById(id), getCaseFiles(id), getCaseEvents(id)])
      .then(([c, f, ev]) => {
        setC(c);
        setFiles(f);
        setEvents(ev);
      })
      .catch(() => {});
  }, [id]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: c?.color_hex || "#3A86FF" }}
            aria-hidden
          />
          <h1 className="text-xl font-semibold">{c?.name ?? "Case"}</h1>
          {c && <StatusBadge status={c.status} />}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>Back to Dashboard</Button>
          <Button onClick={() => navigate(`/app/cases/${id}/upload`)}>Upload</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Files</CardTitle></CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-sm text-muted-foreground">No files uploaded yet.</div>
            ) : (
              <ul className="text-sm space-y-2">
                {files.map((f) => <li key={f.id}>{f.file_name}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="text-sm space-y-2">
              <li>Created</li>
              <li>Files Uploaded</li>
              <li>Submitted</li>
              <li className="text-muted-foreground">(placeholder) Ready</li>
            </ol>
            <div className="mt-4">
              {events.length > 0 ? (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {events.map((e) => (
                    <li key={e.id}>
                      {new Date(e.created_at).toLocaleString()} — {e.type}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No events logged yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Results</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Results will appear here once available.
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
