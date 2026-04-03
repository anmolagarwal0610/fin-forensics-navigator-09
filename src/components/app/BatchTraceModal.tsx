import { useCallback, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  X,
  Minimize2,
  ChevronRight,
  GitBranch,
  FileText,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TraceTreeNode from "./trace/TraceTreeNode";
import { useBatchTraceLayout, formatAmountShort } from "./trace/useBatchTraceLayout";
import type { BatchTraceResponse, BatchTraceSeed, BatchFileIndexEntry } from "@/types/traceTransaction";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";

interface BatchTraceModalProps {
  open: boolean;
  onClose: () => void;
  batchData: BatchTraceResponse;
  initialFile?: string;
}

const nodeTypes: NodeTypes = {
  traceNode: TraceTreeNode,
};

function SeedListItem({
  seed,
  isSelected,
  onClick,
}: {
  seed: BatchTraceSeed;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg border transition-all text-xs",
        isSelected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-transparent hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold truncate">{seed.seed_beneficiary}</span>
        <span className="font-mono text-[11px] shrink-0">
          {formatAmountShort(seed.seed_amount)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 text-muted-foreground">
        <span>{seed.seed_date}</span>
        <div className="flex items-center gap-1">
          {seed.seed_transaction_type && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {seed.seed_transaction_type}
            </Badge>
          )}
          {seed.has_inter_statement_trail ? (
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-accent/20 text-accent border-accent/30">
              Trail
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              No trail
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function BatchTraceCanvas({
  batchData,
  initialFile,
  onClose,
}: Omit<BatchTraceModalProps, "open">) {
  const { fitView } = useReactFlow();

  const fileEntries = useMemo(() => {
    return Object.entries(batchData.file_index).sort(
      ([, a], [, b]) => b.seeds_with_trails - a.seeds_with_trails,
    );
  }, [batchData.file_index]);

  const [selectedFile, setSelectedFile] = useState<string>(
    initialFile || fileEntries[0]?.[0] || "",
  );
  const [selectedSeed, setSelectedSeed] = useState<BatchTraceSeed | null>(null);

  const fileSeeds = useMemo(() => {
    const entry = batchData.file_index[selectedFile];
    if (!entry) return [];
    return batchData.seeds.filter((s) => entry.trace_ids.includes(s.trace_id));
  }, [batchData, selectedFile]);

  // Auto-select first seed with trail when file changes
  const handleFileSelect = useCallback(
    (fileName: string) => {
      setSelectedFile(fileName);
      const entry = batchData.file_index[fileName];
      if (entry) {
        const seeds = batchData.seeds.filter((s) => entry.trace_ids.includes(s.trace_id));
        const firstWithTrail = seeds.find((s) => s.has_inter_statement_trail);
        setSelectedSeed(firstWithTrail || seeds[0] || null);
      } else {
        setSelectedSeed(null);
      }
    },
    [batchData],
  );

  // Select first file on mount
  useMemo(() => {
    if (!selectedSeed && fileSeeds.length > 0) {
      const firstWithTrail = fileSeeds.find((s) => s.has_inter_statement_trail);
      setSelectedSeed(firstWithTrail || fileSeeds[0]);
    }
  }, [fileSeeds, selectedSeed]);

  const { nodes, edges, breadcrumb } = useBatchTraceLayout(selectedSeed);

  const handleExportPng = useCallback(async () => {
    const el = document.querySelector(".react-flow") as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: "white", quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `batch_trace_${selectedSeed?.seed_beneficiary?.replace(/\s+/g, "_") || "tree"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "PNG exported successfully" });
    } catch {
      toast({ title: "Failed to export PNG", variant: "destructive" });
    }
  }, [selectedSeed]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.2 });
  }, [fitView]);

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-[280px] border-r flex flex-col shrink-0 bg-card/50">
        {/* File List */}
        <div className="px-3 py-3 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Files ({fileEntries.length})
          </h3>
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-0.5">
              {fileEntries.map(([fileName, entry]) => (
                <button
                  key={fileName}
                  onClick={() => handleFileSelect(fileName)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors",
                    selectedFile === fileName
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/50 text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{entry.owner || fileName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-5.5 text-[10px] text-muted-foreground">
                    <span>{entry.total_seeds} seeds</span>
                    <span>·</span>
                    <span className="text-accent">{entry.seeds_with_trails} trails</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Seed List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transactions ({fileSeeds.length})
            </h3>
          </div>
          <ScrollArea className="flex-1 px-2 py-1">
            <div className="space-y-1">
              {fileSeeds.map((seed) => (
                <SeedListItem
                  key={seed.trace_id}
                  seed={seed}
                  isSelected={selectedSeed?.trace_id === seed.trace_id}
                  onClick={() => setSelectedSeed(seed)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card/80 backdrop-blur-sm gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden min-w-0">
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
              {breadcrumb.split(" → ").map((part, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span className={cn(i === 0 ? "font-semibold text-foreground" : "")}>
                    {part}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedSeed && (
              <Badge variant="secondary" className="text-[10px] hidden sm:flex">
                {selectedSeed.total_accounts_touched} accounts · Depth {selectedSeed.max_depth}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleFitView}>
              <Minimize2 className="h-3 w-3" />
              <span className="hidden sm:inline">Fit View</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportPng}>
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Export PNG</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          {selectedSeed && nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.1}
              maxZoom={2}
              defaultEdgeOptions={{ type: "smoothstep" }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} color="hsl(220, 13%, 91%)" />
              <Controls showInteractive={false} className="!bg-card !border-border !shadow-md" />
              <MiniMap
                nodeColor={(node) => {
                  const t = (node.data as unknown as { type: string })?.type;
                  if (t === "root") return "hsl(220, 31%, 8%)";
                  if (t === "account_node") return "hsl(220, 100%, 62%)";
                  if (t === "dead_end") return "hsl(2, 76%, 56%)";
                  if (t === "cycle") return "hsl(38, 100%, 56%)";
                  return "hsl(220, 100%, 75%)";
                }}
                maskColor="hsl(220, 31%, 8%, 0.08)"
                className="!bg-card !border-border"
              />
            </ReactFlow>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <GitBranch className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {selectedSeed ? "No trace tree available for this transaction" : "Select a transaction to view its trace tree"}
              </p>
              {selectedSeed && !selectedSeed.has_inter_statement_trail && (
                <p className="text-xs opacity-60">
                  This transaction has no inter-statement trail — the money went to an external party
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BatchTraceModal({
  open,
  onClose,
  batchData,
  initialFile,
}: BatchTraceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[98vw] h-[95vh] sm:max-w-[95vw] sm:max-h-[92vh] flex flex-col p-0 gap-0">
        <ReactFlowProvider>
          <BatchTraceCanvas
            batchData={batchData}
            initialFile={initialFile}
            onClose={onClose}
          />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}
