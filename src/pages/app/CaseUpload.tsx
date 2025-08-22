
import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { addEvent, addFiles, getCaseById, updateCaseStatus } from "@/api/cases";
import { toast } from "@/hooks/use-toast";

export default function CaseUpload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [caseName, setCaseName] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    getCaseById(id)
      .then((c) => setCaseName(c?.name ?? "Case"))
      .catch(() => {});
  }, [id]);

  const onDrop = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const accepted = Array.from(newFiles).filter((f) => {
      const ext = f.name.toLowerCase();
      const okType = ext.endsWith(".pdf") || ext.endsWith(".zip");
      const okSize = f.size <= 250 * 1024 * 1024;
      return okType && okSize;
    });
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removeAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const startAnalysis = async () => {
    if (!id) return;
    if (files.length === 0) {
      toast({ title: "Please add at least one file" });
      return;
    }
    setSubmitting(true);
    addFiles(id, files.map((f) => ({ name: f.name })))
      .then(() => addEvent(id, "analysis_submitted", { files: files.map((f) => f.name) }))
      .then(() => updateCaseStatus(id, "Active"))
      .then(() => {
        toast({ title: "Submitted. ETA ~24 hours." });
        navigate("/app/dashboard");
      })
      .catch((e) => {
        console.error(e);
        toast({ title: "Submission failed" });
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Upload Files — {caseName}</h1>
        <Button variant="ghost" onClick={() => navigate("/app/dashboard")}>Back to Dashboard</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Uploader</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 cursor-pointer"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer.files); }}
            onClick={() => document.getElementById("file-input")?.click()}
            role="button"
            aria-label="Upload files"
            tabIndex={0}
          >
            <p className="text-sm text-muted-foreground">
              Drag & drop .pdf or .zip files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">Max per file: 250MB</p>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.zip"
              multiple
              className="hidden"
              onChange={(e) => onDrop(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Files</div>
              <ul className="space-y-2">
                {files.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm">
                    <span>{f.name}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeAt(idx)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <Button onClick={startAnalysis} disabled={submitting}>
              {submitting ? "Submitting…" : "Start Analysis"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
