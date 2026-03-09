import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BusinessCategory, DemoSiteStyle } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/types";

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed";

export interface GenerationJobRecord {
  id: string;
  status: GenerationJobStatus;
  phase: number;
  lead: CommerceLead;
  siteOption: {
    label: string;
    templateType: BusinessCategory;
    style: DemoSiteStyle;
  };
  state?: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

function getSupabaseAdminOrNull() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

const memoryJobs = new Map<string, GenerationJobRecord>();

function mapJobRow(row: Record<string, unknown>): GenerationJobRecord {
  return {
    id: String(row.id),
    status: String(row.status) as GenerationJobStatus,
    phase: Number(row.phase ?? 0),
    lead: row.lead_json as CommerceLead,
    siteOption: row.site_option_json as GenerationJobRecord["siteOption"],
    state: (row.state_json as Record<string, unknown> | null) ?? undefined,
    result: (row.result_json as Record<string, unknown> | null) ?? undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createGenerationJob(input: {
  lead: CommerceLead;
  siteOption: GenerationJobRecord["siteOption"];
}): Promise<GenerationJobRecord> {
  const supabase = getSupabaseAdminOrNull();

  if (!supabase) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const job: GenerationJobRecord = {
      id,
      status: "queued",
      phase: 0,
      lead: input.lead,
      siteOption: input.siteOption,
      createdAt: now,
      updatedAt: now,
    };
    memoryJobs.set(id, job);
    return job;
  }

  const { data, error } = await supabase
    .from("demo_site_generation_jobs")
    .insert({
      status: "queued",
      phase: 0,
      lead_json: input.lead,
      site_option_json: input.siteOption,
      state_json: null,
      result_json: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create generation job: ${error?.message ?? "unknown error"}`);
  }

  return mapJobRow(data as Record<string, unknown>);
}

export async function getGenerationJob(jobId: string): Promise<GenerationJobRecord | null> {
  const supabase = getSupabaseAdminOrNull();

  if (!supabase) {
    return memoryJobs.get(jobId) ?? null;
  }

  const { data, error } = await supabase
    .from("demo_site_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapJobRow(data as Record<string, unknown>);
}

export async function updateGenerationJob(
  jobId: string,
  patch: Partial<Pick<GenerationJobRecord, "status" | "phase" | "state" | "result" | "errorMessage">>,
): Promise<GenerationJobRecord> {
  const supabase = getSupabaseAdminOrNull();

  if (!supabase) {
    const current = memoryJobs.get(jobId);
    if (!current) {
      throw new Error("Generation job not found.");
    }

    const next: GenerationJobRecord = {
      ...current,
      status: patch.status ?? current.status,
      phase: patch.phase ?? current.phase,
      state: patch.state ?? current.state,
      result: patch.result ?? current.result,
      errorMessage: patch.errorMessage,
      updatedAt: new Date().toISOString(),
    };

    memoryJobs.set(jobId, next);
    return next;
  }

  const { data, error } = await supabase
    .from("demo_site_generation_jobs")
    .update({
      status: patch.status,
      phase: patch.phase,
      state_json: patch.state,
      result_json: patch.result,
      error_message: patch.errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update generation job: ${error?.message ?? "unknown error"}`);
  }

  return mapJobRow(data as Record<string, unknown>);
}
