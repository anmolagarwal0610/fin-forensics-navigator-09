import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { TraceTreeResponse, TraceTreeNodeData, TraceNodeDisplayData, TraceNodeType, DebitTraceResponse, CreditTraceResponse, BatchTraceTreeNode } from "@/types/traceTransaction";
import type { TraceModalData } from "../TraceTransactionModal";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;
const MAX_CHILDREN_BEFORE_COLLAPSE = 15;

function generateId(): string {
  return `node_${Math.random().toString(36).slice(2, 11)}`;
}

function flattenTree(
  node: TraceTreeNodeData,
  parentId: string | null,
  type: TraceNodeType,
  nodes: Node<TraceNodeDisplayData>[],
  edges: Edge[],
  depth: number
): void {
  const id = generateId();

  let children = node.children || [];
  let collapsedGroup: TraceTreeNodeData[] | undefined;

  // Auto-collapse if >15 children: keep top by amount, group rest
  if (children.length > MAX_CHILDREN_BEFORE_COLLAPSE) {
    const sorted = [...children].sort((a, b) => b.amount - a.amount);
    const kept = sorted.slice(0, MAX_CHILDREN_BEFORE_COLLAPSE);
    const rest = sorted.slice(MAX_CHILDREN_BEFORE_COLLAPSE);
    children = kept;
    collapsedGroup = rest;
  }

  const displayData: TraceNodeDisplayData = {
    id,
    type,
    beneficiary: node.beneficiary,
    amount: node.amount,
    date: node.date,
    source_file: node.source_file,
    has_linked_statement: node.has_linked_statement,
    linked_statement_file: node.linked_statement_file,
  };

  nodes.push({
    id,
    type: "traceNode",
    position: { x: 0, y: 0 }, // dagre will set this
    data: displayData,
  });

  if (parentId) {
    edges.push({
      id: `e_${parentId}_${id}`,
      source: parentId,
      target: id,
      type: "smoothstep",
      animated: type === "cycle",
      markerEnd: { type: "arrowclosed" as any, width: 16, height: 16 },
      style: {
        stroke: type === "cycle" ? "hsl(38, 100%, 56%)" : "hsl(220, 13%, 70%)",
        strokeWidth: 2,
      },
      label: node.amount > 0 ? formatAmountShort(node.amount) : undefined,
      labelStyle: { fontSize: 11, fontWeight: 500, fill: "hsl(220, 12%, 45%)" },
    });
  }

  // Recurse children
  for (const child of children) {
    const childType: TraceNodeType = child.has_linked_statement ? "child" : "child";
    flattenTree(child, id, childType, nodes, edges, depth + 1);
  }

  // Collapsed group node
  if (collapsedGroup && collapsedGroup.length > 0) {
    const groupId = generateId();
    const totalAmount = collapsedGroup.reduce((sum, c) => sum + c.amount, 0);
    nodes.push({
      id: groupId,
      type: "traceNode",
      position: { x: 0, y: 0 },
      data: {
        id: groupId,
        type: "collapsed_group",
        beneficiary: `+${collapsedGroup.length} more`,
        amount: totalAmount,
        date: "",
        source_file: "",
        has_linked_statement: false,
        collapsed_count: collapsedGroup.length,
        collapsed_children: collapsedGroup,
      },
    });
    edges.push({
      id: `e_${id}_${groupId}`,
      source: id,
      target: groupId,
      type: "smoothstep",
      style: { stroke: "hsl(220, 13%, 70%)", strokeWidth: 1.5, strokeDasharray: "4 4" },
    });
  }
}

function formatAmountShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

let _dagre: typeof import("dagre") | null = null;

function applyDagreLayout(nodes: Node<TraceNodeDisplayData>[], edges: Edge[]): void {
  if (!_dagre) {
    console.warn("dagre not loaded yet, skipping layout");
    return;
  }
  const g = new _dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  _dagre.layout(g);

  for (const node of nodes) {
    const pos = g.node(node.id);
    node.position = {
      x: pos.x - NODE_WIDTH / 2,
      y: pos.y - NODE_HEIGHT / 2,
    };
  }
}

// Eagerly load dagre when this module is first imported
import("dagre").then((mod) => { _dagre = mod.default as any; }).catch(() => {
  console.warn("dagre module not available");
});

// ---------- helpers to detect response format ----------
function isLegacyResponse(data: NonNullable<TraceModalData>): data is TraceTreeResponse {
  return "trace_tree" in data;
}
function isDebitResponse(data: NonNullable<TraceModalData>): data is DebitTraceResponse {
  return "trace" in data && (data as any).trace?.trace_type === "debit";
}
function isCreditResponse(data: NonNullable<TraceModalData>): data is CreditTraceResponse {
  return "trace" in data && (data as any).trace?.trace_type === "credit";
}

// Convert BatchTraceTreeNode (new format) → legacy TraceTreeNodeData
function batchNodeToLegacy(node: BatchTraceTreeNode): TraceTreeNodeData {
  const children: TraceTreeNodeData[] = [];
  for (const outflow of node.outflows || []) {
    if (outflow.child) {
      children.push(batchNodeToLegacy(outflow.child));
    } else {
      // Leaf outflow
      children.push({
        source_file: outflow.dest_file || "",
        beneficiary: outflow.beneficiary || outflow.dest_owner || "Unknown",
        amount: outflow.amount,
        date: outflow.date,
        has_linked_statement: !!outflow.dest_file,
        linked_statement_file: outflow.dest_file || undefined,
        children: [],
      });
    }
  }
  return {
    source_file: node.file,
    beneficiary: node.node,
    amount: node.traced_credit?.amount || 0,
    date: node.traced_credit?.date || "",
    has_linked_statement: node.outflows.some(o => o.is_inter_statement),
    children,
  };
}

function convertToLegacy(data: NonNullable<TraceModalData>): TraceTreeResponse | null {
  if (isLegacyResponse(data)) return data;
  
  if (isDebitResponse(data)) {
    const t = data.trace;
    if (!t.tree) {
      // No tree — create a single root node
      return {
        trace_tree: {
          root_transaction: {
            source_file: t.seed_file,
            beneficiary: t.seed_beneficiary,
            amount: t.seed_amount,
            date: t.seed_date,
            has_linked_statement: t.has_inter_statement_edge,
            children: [],
          },
          untraced_amount: 0,
          cycle_nodes: [],
        },
        metadata: {
          trace_window_days: data.metadata.window_days,
          total_nodes: 1,
          max_depth: 0,
        },
      };
    }
    const root = batchNodeToLegacy(t.tree);
    // Override root info from seed
    root.source_file = t.seed_file;
    root.beneficiary = t.seed_beneficiary;
    root.amount = t.seed_amount;
    root.date = t.seed_date;
    return {
      trace_tree: {
        root_transaction: root,
        untraced_amount: 0,
        cycle_nodes: [],
      },
      metadata: {
        trace_window_days: data.metadata.window_days,
        total_nodes: t.total_accounts_touched,
        max_depth: t.max_depth,
      },
    };
  }
  
  if (isCreditResponse(data)) {
    const t = data.trace;
    const rootChildren: TraceTreeNodeData[] = [];
    
    // Add backward trace as a source node
    if (t.backward_trace) {
      rootChildren.push({
        source_file: t.backward_trace.source_file,
        beneficiary: t.backward_trace.source_beneficiary || t.backward_trace.source_owner,
        amount: t.backward_trace.amount,
        date: t.backward_trace.source_date,
        has_linked_statement: true,
        linked_statement_file: t.backward_trace.source_file,
        children: [],
      });
    }
    
    // Add forward tree
    if (t.forward_tree) {
      const fwdNode = batchNodeToLegacy(t.forward_tree);
      rootChildren.push(fwdNode);
    }
    
    return {
      trace_tree: {
        root_transaction: {
          source_file: t.file,
          beneficiary: t.beneficiary,
          amount: t.amount,
          date: t.date,
          has_linked_statement: t.has_backward_trail || t.has_forward_trail,
          children: rootChildren,
        },
        untraced_amount: 0,
        cycle_nodes: [],
      },
      metadata: {
        trace_window_days: data.metadata.window_days,
        total_nodes: t.total_accounts_touched,
        max_depth: t.max_depth,
      },
    };
  }
  
  return null;
}

export function useTraceLayout(traceData: TraceModalData) {
  return useMemo(() => {
    if (!traceData) return { nodes: [], edges: [], breadcrumb: "" };

    const legacyData = convertToLegacy(traceData);
    if (!legacyData) return { nodes: [], edges: [], breadcrumb: "" };

    const nodes: Node<TraceNodeDisplayData>[] = [];
    const edges: Edge[] = [];
    const root = legacyData.trace_tree.root_transaction;

    // Build tree
    flattenTree(root, null, "root", nodes, edges, 0);

    // Add untraced node if applicable
    if (legacyData.trace_tree.untraced_amount > 0) {
      const rootNode = nodes[0];
      if (rootNode) {
        const untracedId = generateId();
        nodes.push({
          id: untracedId,
          type: "traceNode",
          position: { x: 0, y: 0 },
          data: {
            id: untracedId,
            type: "untraced",
            beneficiary: "Untraced",
            amount: legacyData.trace_tree.untraced_amount,
            date: "",
            source_file: "",
            has_linked_statement: false,
            untraced_amount: legacyData.trace_tree.untraced_amount,
          },
        });
        edges.push({
          id: `e_${rootNode.id}_${untracedId}`,
          source: rootNode.id,
          target: untracedId,
          type: "smoothstep",
          style: { stroke: "hsl(220, 8%, 60%)", strokeWidth: 1.5, strokeDasharray: "6 4" },
          label: formatAmountShort(legacyData.trace_tree.untraced_amount),
          labelStyle: { fontSize: 11, fill: "hsl(220, 8%, 50%)" },
        });
      }
    }

    // Add cycle nodes
    for (const cycle of legacyData.trace_tree.cycle_nodes || []) {
      const cycleId = generateId();
      nodes.push({
        id: cycleId,
        type: "traceNode",
        position: { x: 0, y: 0 },
        data: {
          id: cycleId,
          type: "cycle",
          beneficiary: "Return Flow",
          amount: cycle.amount,
          date: cycle.date,
          source_file: cycle.source_file,
          has_linked_statement: false,
          returns_to_file: cycle.returns_to_file,
        },
      });
      const parentNode = nodes.find(
        (n) =>
          n.data.source_file === cycle.source_file &&
          n.data.type !== "cycle"
      );
      if (parentNode) {
        edges.push({
          id: `e_${parentNode.id}_${cycleId}`,
          source: parentNode.id,
          target: cycleId,
          type: "smoothstep",
          animated: true,
          style: { stroke: "hsl(38, 100%, 56%)", strokeWidth: 2, strokeDasharray: "8 4" },
        });
      }
    }

    // Apply layout
    applyDagreLayout(nodes, edges);

    // Build breadcrumb
    const breadcrumbParts: string[] = [];
    function buildBreadcrumb(node: TraceTreeNodeData, depth: number) {
      if (depth > 3) return;
      breadcrumbParts.push(
        `${formatAmountShort(node.amount)} (${node.beneficiary})`
      );
      if (node.children?.length > 0) {
        const childNames = node.children.slice(0, 3).map((c) => c.beneficiary);
        if (node.children.length > 3) childNames.push(`+${node.children.length - 3} more`);
        breadcrumbParts.push(childNames.join(" + "));
      }
    }
    buildBreadcrumb(root, 0);
    const breadcrumb = breadcrumbParts.join(" → ");

    return { nodes, edges, breadcrumb };
  }, [traceData]);
}

export { formatAmountShort };
