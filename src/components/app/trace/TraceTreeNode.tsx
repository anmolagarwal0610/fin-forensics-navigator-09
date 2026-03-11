import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CornerDownRight, HelpCircle, Layers, RotateCcw } from "lucide-react";
import type { TraceNodeDisplayData } from "@/types/traceTransaction";
import { formatAmountShort } from "./useTraceLayout";

function TraceTreeNode({ data }: NodeProps) {
  const nodeData = data as unknown as TraceNodeDisplayData;
  const { type, beneficiary, amount, date, source_file } = nodeData;

  const formatAmount = (val: number): string => {
    if (!val || val === 0) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (d: string): string => {
    if (!d) return "—";
    return d;
  };

  const nodeStyles: Record<string, string> = {
    root: "bg-primary text-primary-foreground border-primary shadow-lg",
    child: "bg-card text-card-foreground border-accent/40 hover:border-accent shadow-md",
    untraced: "bg-muted/50 text-muted-foreground border-dashed border-muted-foreground/30",
    dead_end: "bg-card text-muted-foreground border-dashed border-error/40",
    cycle: "bg-warning/10 text-warning-foreground border-dashed border-warning/50",
    collapsed_group: "bg-muted/30 text-muted-foreground border-dashed border-border cursor-pointer",
  };

  const iconMap: Record<string, React.ReactNode> = {
    dead_end: <AlertTriangle className="h-3.5 w-3.5 text-error" />,
    cycle: <RotateCcw className="h-3.5 w-3.5 text-warning" />,
    collapsed_group: <Layers className="h-3.5 w-3.5" />,
    untraced: <HelpCircle className="h-3.5 w-3.5" />,
  };

  // Render special node types
  if (type === "dead_end") {
    return (
      <div className={cn("rounded-lg border-2 px-4 py-3 w-[240px] text-center", nodeStyles.dead_end)}>
        <Handle type="target" position={Position.Top} className="!bg-error/40 !w-2 !h-2" />
        <div className="flex items-center justify-center gap-2">
          {iconMap.dead_end}
          <span className="text-xs font-medium">Dead End</span>
        </div>
        <p className="text-[10px] mt-1 opacity-70">No further trace found</p>
      </div>
    );
  }

  if (type === "untraced") {
    return (
      <div className={cn("rounded-lg border-2 px-4 py-3 w-[240px] text-center", nodeStyles.untraced)}>
        <Handle type="target" position={Position.Top} className="!bg-muted-foreground/30 !w-2 !h-2" />
        <div className="flex items-center justify-center gap-2">
          {iconMap.untraced}
          <span className="text-xs font-medium">Untraced</span>
        </div>
        <p className="text-sm font-semibold mt-1">{formatAmount(nodeData.untraced_amount || amount)}</p>
        <p className="text-[10px] mt-0.5 opacity-70">Amount not traced within window</p>
      </div>
    );
  }

  if (type === "cycle") {
    return (
      <div className={cn("rounded-lg border-2 px-4 py-3 w-[240px] text-center", nodeStyles.cycle)}>
        <Handle type="target" position={Position.Top} className="!bg-warning/50 !w-2 !h-2" />
        <div className="flex items-center justify-center gap-2">
          {iconMap.cycle}
          <span className="text-xs font-medium">Return Flow</span>
        </div>
        <p className="text-sm font-semibold mt-1">{formatAmount(amount)}</p>
        <p className="text-[10px] mt-0.5 opacity-70">
          Money returns to {nodeData.returns_to_file || "source"}
        </p>
      </div>
    );
  }

  if (type === "collapsed_group") {
    return (
      <div className={cn("rounded-lg border-2 px-4 py-3 w-[240px] text-center", nodeStyles.collapsed_group)}>
        <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />
        <div className="flex items-center justify-center gap-2">
          {iconMap.collapsed_group}
          <span className="text-xs font-medium">{beneficiary}</span>
        </div>
        <p className="text-sm font-semibold mt-1">{formatAmountShort(amount)}</p>
        <p className="text-[10px] mt-0.5 opacity-70">Click to expand</p>
      </div>
    );
  }

  // Root and child nodes
  const isRoot = type === "root";

  const tooltipContent = (
    <div className="space-y-1.5 max-w-xs">
      <p className="font-semibold text-sm">{beneficiary}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Amount:</span>
        <span className="font-mono">{formatAmount(amount)}</span>
        <span className="text-muted-foreground">Date:</span>
        <span>{formatDate(date)}</span>
        <span className="text-muted-foreground">Source File:</span>
        <span className="truncate">{source_file || "—"}</span>
        {nodeData.transaction_type && (
          <>
            <span className="text-muted-foreground">Type:</span>
            <span>{nodeData.transaction_type}</span>
          </>
        )}
        {nodeData.total_inflow != null && (
          <>
            <span className="text-muted-foreground">Total Inflow:</span>
            <span className="font-mono text-green-600 dark:text-green-400">{formatAmount(nodeData.total_inflow)}</span>
          </>
        )}
        {nodeData.total_outflow != null && (
          <>
            <span className="text-muted-foreground">Total Outflow:</span>
            <span className="font-mono text-red-600 dark:text-red-400">{formatAmount(nodeData.total_outflow)}</span>
          </>
        )}
        {nodeData.is_poi && (
          <>
            <span className="text-muted-foreground">POI:</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">Yes</span>
          </>
        )}
        {nodeData.statement_count != null && (
          <>
            <span className="text-muted-foreground">Statements:</span>
            <span>Present in {nodeData.statement_count}</span>
          </>
        )}
      </div>
      {nodeData.has_linked_statement && (
        <div className="flex items-center gap-1.5 text-xs text-accent mt-1 pt-1 border-t border-border">
          <CornerDownRight className="h-3 w-3" />
          <span>Linked: {nodeData.linked_statement_file}</span>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "rounded-xl border-2 px-4 py-3 w-[240px] transition-all duration-200",
              nodeStyles[type] || nodeStyles.child,
              !isRoot && "hover:scale-[1.02]"
            )}
          >
            {!isRoot && (
              <Handle type="target" position={Position.Top} className="!bg-accent !w-2.5 !h-2.5" />
            )}
            <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2.5 !h-2.5" />

            {/* Beneficiary name */}
            <p className={cn(
              "font-semibold truncate",
              isRoot ? "text-sm" : "text-xs"
            )}>
              {beneficiary}
            </p>

            {/* Amount */}
            <p className={cn(
              "font-mono font-bold mt-1",
              isRoot ? "text-base" : "text-sm"
            )}>
              {formatAmount(amount)}
            </p>

            {/* Date + Source */}
            <div className="flex items-center justify-between mt-1.5 gap-2">
              <span className={cn(
                "text-[10px] opacity-80",
                isRoot ? "" : "text-muted-foreground"
              )}>
                {formatDate(date)}
              </span>
              <span className={cn(
                "text-[10px] truncate max-w-[100px] opacity-70",
                isRoot ? "" : "text-muted-foreground"
              )}>
                {source_file || ""}
              </span>
            </div>

            {/* Linked statement indicator */}
            {nodeData.has_linked_statement && !isRoot && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-accent">
                <CornerDownRight className="h-2.5 w-2.5" />
                <span className="truncate">Has statement</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-3 max-w-sm bg-popover border shadow-lg z-[100]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default memo(TraceTreeNode);
