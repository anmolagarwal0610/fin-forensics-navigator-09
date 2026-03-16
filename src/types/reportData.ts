export interface CaseSummary {
  total_statement_files: number;
  total_inflow_cr: number | null;
  total_outflow_cr: number | null;
  total_beneficiaries: number;
  total_pois: number;
  total_transactions: number;
}

export interface TransactionType {
  type: string;
  total_credit_cr: number | null;
  total_debit_cr: number | null;
  transaction_count: number | null;
}

export interface ImportantTrailEntry {
  account: string;
  beneficiaries: string;
  total_credit_cr: number | null;
  total_debit_cr: number | null;
  total_txns: number;
}

export interface TopBeneficiary {
  investigation_score: number;
  node: string;
  total_debit_cr: number | null;
  total_credit_cr: number | null;
  accounts_present: number;
  suspicious_activity: string | null;
  unique_beneficiary: boolean;
  shared_beneficiary: boolean;
  hub_beneficiary: boolean;
}

export interface SankeyNodeEntry {
  node: string;
  node_type: string;
  total_debit_cr: number | null;
  total_credit_cr: number | null;
  total_connections: number;
}

export interface SankeyNodes {
  start_trail: SankeyNodeEntry[];
  pass_through: SankeyNodeEntry[];
  end_trail: SankeyNodeEntry[];
}

export interface ReportData {
  case_summary: CaseSummary;
  transaction_types: TransactionType[];
  important_trails: Record<string, ImportantTrailEntry[]>;
  top_beneficiaries: TopBeneficiary[];
  sankey_nodes: SankeyNodes;
}
