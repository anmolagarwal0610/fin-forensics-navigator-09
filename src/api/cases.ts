
import { supabase } from "@/lib/supabase";

export type CaseStatus = 'Active' | 'Processing' | 'Ready' | 'Archived';

export interface CaseRecord {
  id: string;
  org_id: string | null;
  creator_id: string;
  name: string;
  description: string | null;
  color_hex: string;
  tags: string[] | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  result_zip_url?: string;
  analysis_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface CaseFileRecord {
  id: string;
  case_id: string;
  file_name: string;
  file_url: string | null;
  type: 'upload' | 'result';
  uploaded_by: string;
  uploaded_at: string;
}

export interface EventRecord {
  id: string;
  case_id: string;
  type: 'created' | 'files_uploaded' | 'analysis_submitted' | 'analysis_ready' | 'note_added';
  payload: Record<string, any> | null;
  created_at: string;
}

export const getCases = async () => {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CaseRecord[];
};

export const createCase = async (payload: {
  name: string;
  description?: string;
  color_hex: string;
  tags: string[];
}) => {
  const { data: auth } = await supabase.auth.getUser();
  const creator_id = auth.user?.id;
  if (!creator_id) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("cases")
    .insert({
      name: payload.name,
      description: payload.description || null,
      color_hex: payload.color_hex,
      tags: payload.tags ?? [],
      status: "Active",
      creator_id,
      org_id: null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as CaseRecord;
};

export const updateCaseStatus = async (caseId: string, status: CaseStatus) => {
  const { data, error } = await supabase
    .from("cases")
    .update({ status })
    .eq("id", caseId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as CaseRecord | null;
};

export const updateCaseWithResults = async (caseId: string, resultZipUrl: string) => {
  const { data, error } = await supabase
    .from("cases")
    .update({ 
      result_zip_url: resultZipUrl, 
      status: 'Ready' as CaseStatus,
      analysis_status: 'completed'
    })
    .eq("id", caseId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as CaseRecord | null;
};

export const addEvent = async (caseId: string, type: EventRecord["type"], payload?: Record<string, any>) => {
  const { data, error } = await supabase
    .from("events")
    .insert({
      case_id: caseId,
      type,
      payload: payload ?? {},
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as EventRecord | null;
};

export const addFiles = async (caseId: string, files: { name: string; url?: string }[]) => {
  const { data: auth } = await supabase.auth.getUser();
  const uploaded_by = auth.user?.id;
  if (!uploaded_by) throw new Error("Not authenticated");

  if (!files.length) return [];
  const toInsert = files.map((f) => ({
    case_id: caseId,
    file_name: f.name,
    file_url: f.url || null,
    type: "upload" as const,
    uploaded_by,
  }));
  const { data, error } = await supabase.from("case_files").insert(toInsert).select();
  if (error) throw error;
  return (data ?? []) as CaseFileRecord[];
};

export const getCaseById = async (id: string) => {
  const { data, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as CaseRecord | null;
};

export const getCaseFiles = async (caseId: string) => {
  const { data, error } = await supabase.from("case_files").select("*").eq("case_id", caseId).order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CaseFileRecord[];
};

export const getCaseEvents = async (caseId: string) => {
  const { data, error } = await supabase.from("events").select("*").eq("case_id", caseId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRecord[];
};

export const deleteCase = async (caseId: string) => {
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;
  return true;
};
