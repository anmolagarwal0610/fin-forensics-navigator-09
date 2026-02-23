import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, GitMerge, GitBranch, FileText, Loader2 } from "lucide-react";
import type { PendingClusterState } from "./EditGroupedNamesDialog";

export interface GroupingOverridesState {
  cross_file: Record<string, PendingClusterState>;
  individual: Record<string, Record<string, PendingClusterState>>;
}

interface ChangeEntry {
  id: string;
  context: "cross_file" | "individual";
  fileName?: string;
  targetCluster: string;
  action: "demerge" | "merge_into";
  names: string[];
}

interface ApplyChangesDialogProps {
  open: boolean;
  onClose: () => void;
  overrides: GroupingOverridesState;
  onRemoveChange: (entry: ChangeEntry) => void;
  onApply: () => void;
  isApplying?: boolean;
}

export default function ApplyChangesDialog({
  open,
  onClose,
  overrides,
  onRemoveChange,
  onApply,
  isApplying = false,
}: ApplyChangesDialogProps) {
  const changes = useMemo(() => {
    const entries: ChangeEntry[] = [];
    let idx = 0;

    // Cross-file changes
    for (const [cluster, state] of Object.entries(overrides.cross_file)) {
      if (state.demerged.length > 0) {
        entries.push({
          id: `cf-d-${idx++}`,
          context: "cross_file",
          targetCluster: cluster,
          action: "demerge",
          names: state.demerged,
        });
      }
      if (state.merged.length > 0) {
        entries.push({
          id: `cf-m-${idx++}`,
          context: "cross_file",
          targetCluster: cluster,
          action: "merge_into",
          names: state.merged,
        });
      }
    }

    // Individual file changes
    for (const [fileName, clusters] of Object.entries(overrides.individual)) {
      for (const [cluster, state] of Object.entries(clusters)) {
        if (state.demerged.length > 0) {
          entries.push({
            id: `ind-d-${idx++}`,
            context: "individual",
            fileName,
            targetCluster: cluster,
            action: "demerge",
            names: state.demerged,
          });
        }
        if (state.merged.length > 0) {
          entries.push({
            id: `ind-m-${idx++}`,
            context: "individual",
            fileName,
            targetCluster: cluster,
            action: "merge_into",
            names: state.merged,
          });
        }
      }
    }

    return entries;
  }, [overrides]);

  const crossFileChanges = changes.filter(c => c.context === "cross_file");
  const individualChanges = changes.filter(c => c.context === "individual");

  // Group individual changes by fileName
  const individualByFile = useMemo(() => {
    const map = new Map<string, ChangeEntry[]>();
    for (const c of individualChanges) {
      const key = c.fileName || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [individualChanges]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            Review Changes
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            The following name grouping changes will be applied and re-analysis will be triggered.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-3 sm:py-4 max-h-[55vh]">
          <div className="space-y-5">
            {/* Cross-file changes */}
            {crossFileChanges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Cross-File Changes
                  <Badge variant="secondary" className="text-xs">{crossFileChanges.length}</Badge>
                </h3>
                <div className="space-y-2">
                  {crossFileChanges.map((entry, idx) => (
                    <ChangeRow
                      key={entry.id}
                      index={idx + 1}
                      entry={entry}
                      onRemove={() => onRemoveChange(entry)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Individual file changes */}
            {individualByFile.size > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Individual File Changes
                </h3>
                {Array.from(individualByFile.entries()).map(([fileName, entries]) => (
                  <div key={fileName} className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 font-mono">{fileName}</p>
                    <div className="space-y-2">
                      {entries.map((entry, idx) => (
                        <ChangeRow
                          key={entry.id}
                          index={idx + 1}
                          entry={entry}
                          onRemove={() => onRemoveChange(entry)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {changes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No pending changes
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30">
          <Button
            onClick={onApply}
            disabled={changes.length === 0 || isApplying}
            className="w-full gap-2"
            size="default"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying Changes...
              </>
            ) : (
              <>Apply Changes & Re-analyze</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRow({ index, entry, onRemove }: { index: number; entry: ChangeEntry; onRemove: () => void }) {
  const isMerge = entry.action === "merge_into";
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md border bg-card text-sm">
      <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0 pt-0.5">
        {index}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isMerge ? (
            <GitMerge className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <GitBranch className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
          )}
          <span className={isMerge ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {isMerge ? "Merged" : "Separated"}
          </span>
          <span className="font-medium break-words">
            "{entry.names.join('", "')}"
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isMerge ? "into" : "from"} group "<span className="font-medium">{entry.targetCluster}</span>"
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
        title="Remove this change"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}
