// Types for Trace Transaction tree visualization

/** A single node in the trace tree from the backend */
export interface TraceTreeNodeData {
  source_file: string;
  beneficiary: string;
  amount: number;
  date: string;
  has_linked_statement: boolean;
  linked_statement_file?: string;
  children: TraceTreeNodeData[];
}

/** Cycle detection node from backend */
export interface TraceCycleNode {
  source_file: string;
  beneficiary: string;
  amount: number;
  date: string;
  returns_to_file: string;
}

/** Full backend response for trace tree */
export interface TraceTreeResponse {
  trace_tree: {
    root_transaction: TraceTreeNodeData;
    untraced_amount: number;
    cycle_nodes: TraceCycleNode[];
  };
  metadata: {
    trace_window_days: number;
    total_nodes: number;
    max_depth: number;
  };
}

/** Node types for React Flow rendering */
export type TraceNodeType = 
  | "root" 
  | "child" 
  | "untraced" 
  | "dead_end" 
  | "cycle" 
  | "collapsed_group";

/** Display data enriched by FE from raw transaction files */
export interface TraceNodeDisplayData {
  id: string;
  type: TraceNodeType;
  beneficiary: string;
  amount: number;
  date: string;
  source_file: string;
  description?: string;
  transaction_type?: string;
  balance?: number | string;
  has_linked_statement: boolean;
  linked_statement_file?: string;
  is_poi?: boolean;
  statement_count?: number;
  total_inflow?: number;
  total_outflow?: number;
  // For collapsed group nodes
  collapsed_count?: number;
  collapsed_children?: TraceTreeNodeData[];
  // For cycle nodes
  returns_to_file?: string;
  // For untraced nodes
  untraced_amount?: number;
}

/** Selected transaction from dialog for tracing */
export interface SelectedTransaction {
  beneficiary: string;
  amount: number;
  date: string;
  source_file: string;
  description?: string;
  debit: number | string;
  credit: number | string;
}
