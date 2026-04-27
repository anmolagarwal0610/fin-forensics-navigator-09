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

import {
  Download,
  X,
  Minimize2,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TraceTreeNode from "./trace/TraceTreeNode";
import { useTraceLayout, formatAmountShort } from "./trace/useTraceLayout";
import type { TraceTreeResponse, SelectedTransaction, DebitTraceResponse, CreditTraceResponse } from "@/types/traceTransaction";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import TraceLoader from "./trace/TraceLoader";

export type TraceModalData = TraceTreeResponse | DebitTraceResponse | CreditTraceResponse | null;

interface TraceTransactionModalProps {
  open: boolean;
  onClose: () => void;
  selectedTransaction: SelectedTransaction | null;
  traceData: TraceModalData;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

const nodeTypes: NodeTypes = {
  traceNode: TraceTreeNode,
};

function TraceFlowCanvas({
  traceData,
  selectedTransaction,
  isLoading,
  error,
  onRetry,
  onClose,
}: Omit<TraceTransactionModalProps, "open">) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const { nodes, edges, breadcrumb } = useTraceLayout(traceData);

  const handleExportPng = useCallback(async () => {
    const el = document.querySelector(".react-flow") as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "white",
        quality: 1,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `trace_${selectedTransaction?.beneficiary?.replace(/\s+/g, "_") || "transaction"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "PNG exported successfully" });
    } catch {
      toast({ title: "Failed to export PNG", variant: "destructive" });
    }
  }, [selectedTransaction]);

  const handleCollapseAll = useCallback(() => {
    fitView({ duration: 400, padding: 0.2 });
  }, [fitView]);

  // Date validation
  const hasNoDate = selectedTransaction && !selectedTransaction.date;

  if (hasNoDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <AlertTriangle className="h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">Cannot Trace — Missing Date</p>
        <p className="text-sm opacity-70">
          The selected transaction has no date, so a 5-day window cannot be computed.
        </p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <TraceLoader />;
  }

  if (error) {
    console.error("[TraceTransaction] Error:", error);
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <AlertTriangle className="h-12 w-12 opacity-40 text-destructive" />
        <p className="text-lg font-medium">Found an error. Please try again later.</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!traceData || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <GitBranch className="h-12 w-12 opacity-30" />
        <p className="text-sm">No trace data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card/80 backdrop-blur-sm gap-2 shrink-0">
        {/* Breadcrumb */}
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

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {traceData.metadata && (
            <Badge variant="secondary" className="text-[10px] hidden sm:flex">
              {"total_nodes" in traceData.metadata
                ? `${(traceData.metadata as any).total_nodes} nodes · ${(traceData.metadata as any).max_depth} levels`
                : "trace" in traceData
                  ? `${(traceData as any).trace?.total_accounts_touched || "?"} nodes · ${(traceData as any).trace?.max_depth || "?"} levels`
                  : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCollapseAll}>
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

      {/* React Flow Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "smoothstep",
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="hsl(220, 13%, 91%)" />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!fill-foreground [&>button]:!border-border"
          />
          <MiniMap
            nodeColor={(node) => {
              const t = (node.data as unknown as { type: string })?.type;
              if (t === "root") return "hsl(220, 31%, 8%)";
              if (t === "untraced") return "hsl(220, 8%, 70%)";
              if (t === "dead_end") return "hsl(2, 76%, 56%)";
              if (t === "cycle") return "hsl(38, 100%, 56%)";
              return "hsl(220, 100%, 62%)";
            }}
            maskColor="hsl(220, 31%, 8%, 0.08)"
            className="!bg-muted/50 !border-border !rounded-md"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function TraceTransactionModal({
  open,
  onClose,
  selectedTransaction,
  traceData,
  isLoading,
  error,
  onRetry,
}: TraceTransactionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[98vw] h-[95vh] sm:max-w-[95vw] sm:max-h-[92vh] flex flex-col p-0 gap-0">
        <ReactFlowProvider>
          <TraceFlowCanvas
            selectedTransaction={selectedTransaction}
            traceData={traceData}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            onClose={onClose}
          />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}
