import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CornerDownRight, HelpCircle, Layers, Link2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TraceNodeDisplayData, BatchContextInflow } from "@/types/traceTransaction";
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
    account_node: "bg-card text-card-foreground border-accent/40 hover:border-accent shadow-md",
    untraced: "bg-muted/50 text-muted-foreground border-dashed border-muted-foreground/30",
    dead_end: "bg-card text-muted-foreground border-dashed border-destructive/40",
    cycle: "bg-warning/10 text-warning-foreground border-dashed border-warning/50",
    collapsed_group: "bg-muted/30 text-muted-foreground border-dashed border-border cursor-pointer",
    backward_source: "bg-emerald-50 dark:bg-emerald-950/30 text-card-foreground border-emerald-400/50 shadow-md",
  };

  const iconMap: Record<string, React.ReactNode> = {
    dead_end: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
    cycle: <RotateCcw className="h-3.5 w-3.5 text-warning" />,
    collapsed_group: <Layers className="h-3.5 w-3.5" />,
    untraced: <HelpCircle className="h-3.5 w-3.5" />,
  };

  // Context inflows analysis
  const contextInflows = (nodeData.context_inflows as BatchContextInflow[] | undefined) || [];
  const tracedInflows = contextInflows.filter(ci => ci.is_traced);
  const contextualInflows = contextInflows.filter(ci => !ci.is_traced);
  const tracedInflowAmount = tracedInflows.reduce((s, ci) => s + ci.amount, 0);
  const otherInflowAmount = contextualInflows.reduce((s, ci) => s + ci.amount, 0);
  const hasContextInflows = contextInflows.length > 1;

  // Render special node types
  if (type === "dead_end") {
    return (
      <div className={cn("rounded-lg border-2 px-4 py-3 w-[240px] text-center", nodeStyles.dead_end)}>
        <Handle type="target" position={Position.Top} className="!bg-destructive/40 !w-2 !h-2" />
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

  // Root, child, account_node, backward_source nodes
  const isRoot = type === "root";
  const isAccountNode = type === "account_node";

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
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
      </div>

      {/* Aggregate split for account nodes */}
      {(isAccountNode || isRoot) && nodeData.total_inflow != null && (
        <div className="border-t border-border pt-2 space-y-1">
          {tracedInflowAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Traced Inflow:</span>
              <span className="font-mono text-accent">{formatAmount(tracedInflowAmount)}</span>
            </div>
          )}
          {otherInflowAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Other Inflows:</span>
              <span className="font-mono text-muted-foreground">{formatAmount(otherInflowAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Inflow:</span>
            <span className="font-mono">{formatAmount(nodeData.total_inflow as number)}</span>
          </div>
          {nodeData.total_outflow != null && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Outflow:</span>
              <span className="font-mono text-destructive">{formatAmount(nodeData.total_outflow as number)}</span>
            </div>
          )}
          {nodeData.retained != null && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Retained:</span>
              <span className={cn("font-mono", (nodeData.retained as number) < 0 ? "text-destructive" : "")}>
                {formatAmount(nodeData.retained as number)}
                {(nodeData.retained as number) < 0 && (
                  <span className="text-[9px] ml-1 opacity-70">*</span>
                )}
              </span>
            </div>
          )}
          {(nodeData.retained as number) < 0 && (
            <p className="text-[9px] text-destructive/70 italic">
              * Additional funding sources outside window
            </p>
          )}
        </div>
      )}

      {/* Context Inflows section */}
      {contextInflows.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">
            Inflows in Window ({contextInflows.length})
            <span className="font-normal ml-1">
              — {tracedInflows.length} traced · {contextualInflows.length} contextual
            </span>
          </p>
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {tracedInflows.map((ci, i) => (
              <div key={`t-${i}`} className="flex items-center gap-1.5 text-[10px] bg-accent/10 border border-accent/20 rounded px-2 py-1">
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-accent/40 text-accent shrink-0">
                  Traced
                </Badge>
                <span className="font-mono shrink-0">{formatAmountShort(ci.amount)}</span>
                <span className="text-muted-foreground truncate">{ci.date}</span>
                {ci.is_inter_statement && ci.source_owner && (
                  <span className="text-muted-foreground truncate flex items-center gap-0.5">
                    <Link2 className="h-2.5 w-2.5" />{ci.source_owner}
                  </span>
                )}
              </div>
            ))}
            {contextualInflows.slice(0, 8).map((ci, i) => (
              <div key={`c-${i}`} className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-2 py-0.5">
                <span className="font-mono shrink-0">{formatAmountShort(ci.amount)}</span>
                <span className="truncate">{ci.date}</span>
                <span className="truncate">{ci.beneficiary}</span>
                {ci.is_inter_statement && ci.source_owner && (
                  <Link2 className="h-2.5 w-2.5 shrink-0 text-accent/50" />
                )}
              </div>
            ))}
            {contextualInflows.length > 8 && (
              <p className="text-[9px] text-muted-foreground italic px-2">
                +{contextualInflows.length - 8} more...
              </p>
            )}
          </div>
        </div>
      )}

      {nodeData.has_linked_statement && (
        <div className="flex items-center gap-1.5 text-xs text-accent pt-1 border-t border-border">
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
            {!isRoot && type !== "backward_source" && (
              <Handle type="target" position={Position.Top} className="!bg-accent !w-2.5 !h-2.5" />
            )}
            {type === "backward_source" && (
              <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2.5 !h-2.5" />
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

            {/* Context inflows indicator */}
            {hasContextInflows && (
              <p className="text-[9px] text-muted-foreground mt-1 opacity-70">
                +{contextualInflows.length} other inflows
              </p>
            )}

            {/* Linked statement indicator */}
            {nodeData.has_linked_statement && !isRoot && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-accent">
                <CornerDownRight className="h-2.5 w-2.5" />
                <span className="truncate">Has statement</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="p-3 max-w-sm bg-popover border shadow-lg z-[9999]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default memo(TraceTreeNode);