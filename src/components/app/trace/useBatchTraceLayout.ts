import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type {
  BatchTraceSeed,
  BatchTraceTreeNode,
  BackwardTrace,
  TraceNodeDisplayData,
  TraceNodeType,
} from "@/types/traceTransaction";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;
const MAX_CHILDREN_BEFORE_COLLAPSE = 15;

let idCounter = 0;
function genId(): string {
  return `bn_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatAmountShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Flatten a BatchTraceTreeNode (recursive outflows[].child) into React Flow nodes/edges.
 */
function flattenBatchTree(
  treeNode: BatchTraceTreeNode,
  parentId: string | null,
  nodes: Node<TraceNodeDisplayData>[],
  edges: Edge[],
): void {
  const id = genId();
  const isCycle = treeNode.status === "cycle_detected";
  const nodeType: TraceNodeType = isCycle ? "cycle" : "account_node";

  const displayData: TraceNodeDisplayData = {
    id,
    type: nodeType,
    beneficiary: treeNode.node,
    amount: treeNode.traced_credit?.amount ?? 0,
    date: treeNode.traced_credit?.date ?? "",
    source_file: treeNode.file,
    has_linked_statement: true,
    total_inflow: treeNode.total_inflow_in_window,
    total_outflow: treeNode.total_outflow_in_window,
    retained: treeNode.retained,
    context_inflows_count: treeNode.context_inflows?.length ?? 0,
    context_inflows: treeNode.context_inflows ?? [],
    outflows_count: treeNode.outflows?.length ?? 0,
    confidence: treeNode.traced_credit?.confidence,
    status: treeNode.status,
  };

  nodes.push({
    id,
    type: "traceNode",
    position: { x: 0, y: 0 },
    data: displayData,
  });

  if (parentId) {
    edges.push({
      id: `e_${parentId}_${id}`,
      source: parentId,
      target: id,
      type: "smoothstep",
      animated: isCycle,
      markerEnd: { type: "arrowclosed" as any, width: 16, height: 16 },
      style: {
        stroke: isCycle ? "hsl(38, 100%, 56%)" : "hsl(220, 100%, 62%)",
        strokeWidth: 2,
      },
      label: treeNode.traced_credit?.amount
        ? formatAmountShort(treeNode.traced_credit.amount)
        : undefined,
      labelStyle: { fontSize: 11, fontWeight: 500, fill: "hsl(220, 12%, 45%)" },
    });
  }

  // Don't recurse if cycle
  if (isCycle) return;

  // Process outflows
  const outflows = treeNode.outflows || [];
  let visibleOutflows = outflows;
  let collapsedOutflows: typeof outflows | null = null;

  if (outflows.length > MAX_CHILDREN_BEFORE_COLLAPSE) {
    const sorted = [...outflows].sort((a, b) => b.amount - a.amount);
    visibleOutflows = sorted.slice(0, MAX_CHILDREN_BEFORE_COLLAPSE);
    collapsedOutflows = sorted.slice(MAX_CHILDREN_BEFORE_COLLAPSE);
  }

  for (const outflow of visibleOutflows) {
    if (outflow.child) {
      // Recurse into child tree
      flattenBatchTree(outflow.child, id, nodes, edges);
    } else {
      // Leaf node — destination whose statement is not uploaded
      const leafId = genId();
      const leafType: TraceNodeType = "leaf";

      nodes.push({
        id: leafId,
        type: "traceNode",
        position: { x: 0, y: 0 },
        data: {
          id: leafId,
          type: leafType,
          beneficiary: outflow.beneficiary || "Unknown Recipient",
          amount: outflow.amount,
          date: outflow.date,
          source_file: outflow.dest_file || "",
          description: outflow.description,
          transaction_type: outflow.transaction_type,
          has_linked_statement: false,
        },
      });

      edges.push({
        id: `e_${id}_${leafId}`,
        source: id,
        target: leafId,
        type: "smoothstep",
        markerEnd: { type: "arrowclosed" as any, width: 14, height: 14 },
        style: {
          stroke: "hsl(220, 13%, 70%)",
          strokeWidth: 1.5,
        },
        label: formatAmountShort(outflow.amount),
        labelStyle: { fontSize: 10, fill: "hsl(220, 12%, 55%)" },
      });
    }
  }

  // Collapsed group
  if (collapsedOutflows && collapsedOutflows.length > 0) {
    const groupId = genId();
    const totalAmount = collapsedOutflows.reduce((s, o) => s + o.amount, 0);
    nodes.push({
      id: groupId,
      type: "traceNode",
      position: { x: 0, y: 0 },
      data: {
        id: groupId,
        type: "collapsed_group",
        beneficiary: `+${collapsedOutflows.length} more`,
        amount: totalAmount,
        date: "",
        source_file: "",
        has_linked_statement: false,
        collapsed_count: collapsedOutflows.length,
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

let _dagre: typeof import("dagre") | null = null;
import("dagre")
  .then((mod) => {
    _dagre = mod.default as any;
  })
  .catch(() => {
    console.warn("dagre module not available");
  });

function applyLayout(nodes: Node<TraceNodeDisplayData>[], edges: Edge[]): void {
  if (!_dagre) return;
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
    node.position = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
  }
}

/**
 * Hook: Convert a BatchTraceSeed (debit trace) into React Flow nodes/edges.
 */
export function useBatchTraceLayout(seed: BatchTraceSeed | null) {
  return useMemo(() => {
    if (!seed) return { nodes: [], edges: [], breadcrumb: "" };

    idCounter = 0;
    const nodes: Node<TraceNodeDisplayData>[] = [];
    const edges: Edge[] = [];

    // Root node = seed transaction
    const rootId = genId();
    nodes.push({
      id: rootId,
      type: "traceNode",
      position: { x: 0, y: 0 },
      data: {
        id: rootId,
        type: "root",
        beneficiary: seed.seed_beneficiary,
        amount: seed.seed_amount,
        date: seed.seed_date,
        source_file: seed.seed_file,
        description: seed.seed_description,
        transaction_type: seed.seed_transaction_type,
        has_linked_statement: seed.has_inter_statement_edge,
        confidence: seed.edge_confidence ?? undefined,
      },
    });

    // Build tree from seed.tree
    if (seed.tree) {
      flattenBatchTree(seed.tree, rootId, nodes, edges);
    }

    applyLayout(nodes, edges);

    const breadcrumb = `${formatAmountShort(seed.seed_amount)} (${seed.seed_beneficiary}) → ${seed.seed_owner}`;

    return { nodes, edges, breadcrumb };
  }, [seed]);
}

/**
 * Hook: Convert a credit trace (backward + forward) into React Flow nodes/edges.
 */
export function useCreditTraceLayout(
  backward: BackwardTrace | null,
  forwardTree: BatchTraceTreeNode | null,
  creditInfo: { beneficiary: string; amount: number; date: string; file: string; file_owner: string } | null,
) {
  return useMemo(() => {
    if (!creditInfo) return { nodes: [], edges: [], breadcrumb: "" };

    idCounter = 0;
    const nodes: Node<TraceNodeDisplayData>[] = [];
    const edges: Edge[] = [];

    // If backward trace exists, create source node
    let rootId: string;

    if (backward) {
      const backwardId = genId();
      nodes.push({
        id: backwardId,
        type: "traceNode",
        position: { x: 0, y: 0 },
        data: {
          id: backwardId,
          type: "backward_source",
          beneficiary: backward.source_owner,
          amount: backward.amount,
          date: backward.source_date,
          source_file: backward.source_file,
          description: backward.description,
          has_linked_statement: true,
          confidence: backward.confidence,
        },
      });

      // Credit recipient node
      rootId = genId();
      nodes.push({
        id: rootId,
        type: "traceNode",
        position: { x: 0, y: 0 },
        data: {
          id: rootId,
          type: "root",
          beneficiary: creditInfo.file_owner,
          amount: creditInfo.amount,
          date: creditInfo.date,
          source_file: creditInfo.file,
          has_linked_statement: true,
        },
      });

      edges.push({
        id: `e_${backwardId}_${rootId}`,
        source: backwardId,
        target: rootId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "hsl(142, 71%, 45%)", strokeWidth: 2 },
        label: formatAmountShort(backward.amount),
        labelStyle: { fontSize: 11, fontWeight: 500, fill: "hsl(142, 71%, 35%)" },
      });
    } else {
      // No backward trace — unknown source
      const unknownId = genId();
      nodes.push({
        id: unknownId,
        type: "traceNode",
        position: { x: 0, y: 0 },
        data: {
          id: unknownId,
          type: "untraced",
          beneficiary: "Source: Unknown / External",
          amount: creditInfo.amount,
          date: "",
          source_file: "",
          has_linked_statement: false,
        },
      });

      rootId = genId();
      nodes.push({
        id: rootId,
        type: "traceNode",
        position: { x: 0, y: 0 },
        data: {
          id: rootId,
          type: "root",
          beneficiary: creditInfo.file_owner,
          amount: creditInfo.amount,
          date: creditInfo.date,
          source_file: creditInfo.file,
          has_linked_statement: true,
        },
      });

      edges.push({
        id: `e_${unknownId}_${rootId}`,
        source: unknownId,
        target: rootId,
        type: "smoothstep",
        style: { stroke: "hsl(220, 8%, 60%)", strokeWidth: 1.5, strokeDasharray: "6 4" },
      });
    }

    // Forward tree
    if (forwardTree) {
      flattenBatchTree(forwardTree, rootId, nodes, edges);
    }

    applyLayout(nodes, edges);

    const breadcrumb = backward
      ? `${backward.source_owner} → ${formatAmountShort(creditInfo.amount)} → ${creditInfo.file_owner}`
      : `Unknown → ${formatAmountShort(creditInfo.amount)} → ${creditInfo.file_owner}`;

    return { nodes, edges, breadcrumb };
  }, [backward, forwardTree, creditInfo]);
}
