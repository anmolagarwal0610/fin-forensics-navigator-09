// Types for Trace Transaction tree visualization

// ============================================================
// LEGACY types (existing single-transaction trace API)
// ============================================================

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

/** Full backend response for trace tree (legacy single-tx API) */
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
  | "collapsed_group"
  | "backward_source"
  | "account_node"
  | "outflow_leaf";

/** Display data enriched by FE from raw transaction files */
export interface TraceNodeDisplayData {
  [key: string]: unknown;
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
  retained?: number;
  context_inflows_count?: number;
  outflows_count?: number;
  // For collapsed group nodes
  collapsed_count?: number;
  collapsed_children?: TraceTreeNodeData[];
  // For cycle nodes
  returns_to_file?: string;
  // For untraced nodes
  untraced_amount?: number;
  // For backward source (credit traces)
  confidence?: number;
  // Account node status
  status?: string;
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
  row_index: number;
}

// ============================================================
// BATCH TRACE types (fund_traces.json)
// ============================================================

/** Context inflow entry in a batch tree node */
export interface BatchContextInflow {
  row_index: number;
  amount: number;
  date: string;
  beneficiary: string;
  transaction_type: string;
  description: string;
  is_inter_statement: boolean;
  source_file: string | null;
  source_owner: string | null;
  confidence: number | null;
  is_traced: boolean;
}

/** Outflow entry in a batch tree node */
export interface BatchOutflow {
  row_index: number;
  amount: number;
  date: string;
  beneficiary: string;
  transaction_type: string;
  description: string;
  is_inter_statement: boolean;
  confidence: number | null;
  dest_file: string | null;
  dest_owner: string | null;
  child: BatchTraceTreeNode | null;
}

/** Recursive tree node in batch/on-demand traces */
export interface BatchTraceTreeNode {
  node: string;
  file: string;
  status: "traced" | "cycle_detected";
  depth: number;
  traced_credit: {
    row_index: number;
    amount: number;
    date: string;
    confidence: number;
  };
  context_inflows: BatchContextInflow[];
  outflows: BatchOutflow[];
  total_inflow_in_window: number;
  total_outflow_in_window: number;
  retained: number;
}

/** A single seed (traced debit transaction) in batch mode */
export interface BatchTraceSeed {
  trace_id: string;
  trace_type: "debit" | "credit";
  seed_file: string;
  seed_owner: string;
  seed_row_index: number;
  seed_beneficiary: string;
  seed_amount: number;
  seed_date: string;
  seed_transaction_type: string;
  seed_description: string;
  has_inter_statement_edge: boolean;
  edge_confidence: number | null;
  has_inter_statement_trail: boolean;
  max_depth: number;
  total_accounts_touched: number;
  tree: BatchTraceTreeNode | null;
}

/** File-level summary in fund_traces.json */
export interface BatchFileIndexEntry {
  owner: string;
  total_seeds: number;
  seeds_with_trails: number;
  seeds_without_trails: number;
  total_qualifying_debits: number;
  priority_1_count: number;
  priority_2_count: number;
  min_seed_amount: number;
  max_seed_amount: number;
  trace_ids: string[];
}

/** Metadata in fund_traces.json */
export interface BatchTraceMetadata {
  min_amount: number;
  window_days: number;
  min_confidence: number;
  seeds_per_file: number;
  date_range: [string, string] | null;
  total_files: number;
  total_seeds_available: number;
  total_seeds_traced: number;
  seeds_with_trails: number;
  total_inter_statement_edges: number;
  generated_at: string;
  generation_time_seconds: number;
}

/** Top-level structure of fund_traces.json */
export interface BatchTraceResponse {
  metadata: BatchTraceMetadata;
  file_index: Record<string, BatchFileIndexEntry>;
  seeds: BatchTraceSeed[];
}

// ============================================================
// ON-DEMAND / CREDIT TRACE types
// ============================================================

/** Backward trace for credit transactions */
export interface BackwardTrace {
  source_file: string;
  source_owner: string;
  source_row_index: number;
  source_beneficiary: string;
  amount: number;
  source_date: string;
  confidence: number;
  description: string;
}

/** On-demand credit trace response */
export interface CreditTraceResponse {
  metadata: {
    request: {
      file_name: string;
      row_index: number;
      amount: number;
      type: "credit";
    };
    window_days: number;
    min_confidence: number;
    generated_at: string;
  };
  trace: {
    trace_id: string;
    trace_type: "credit";
    file: string;
    file_owner: string;
    row_index: number;
    beneficiary: string;
    amount: number;
    date: string;
    transaction_type: string;
    description: string;
    backward_trace: BackwardTrace | null;
    forward_tree: BatchTraceTreeNode | null;
    has_backward_trail: boolean;
    has_forward_trail: boolean;
    max_depth: number;
    total_accounts_touched: number;
  };
}

/** On-demand debit trace response (same structure as batch seed) */
export interface DebitTraceResponse {
  metadata: {
    request: {
      file_name: string;
      row_index: number;
      amount: number;
      type: "debit";
    };
    window_days: number;
    min_confidence: number;
    generated_at: string;
  };
  trace: {
    trace_id: string;
    trace_type: "debit";
    seed_file: string;
    seed_owner: string;
    seed_row_index: number;
    seed_beneficiary: string;
    seed_amount: number;
    seed_date: string;
    seed_transaction_type: string;
    seed_description: string;
    has_inter_statement_edge: boolean;
    edge_confidence: number | null;
    has_inter_statement_trail: boolean;
    max_depth: number;
    total_accounts_touched: number;
    tree: BatchTraceTreeNode | null;
  };
}

// ============================================================
// FE → BE request (fund_trail_raw.json)
// ============================================================

export interface FundTrailRequestTransaction {
  file_name: string;
  row_index: number;
  amount: number;
  type: "debit" | "credit";
}

export interface FundTrailRequest {
  window_days: number;
  transactions: FundTrailRequestTransaction[];
}
