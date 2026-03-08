import type { DemoSiteContent, DemoSiteVersion } from "./types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateDemoSiteContent } from "./validation";

function mapVersionRow(row: Record<string, unknown>): DemoSiteVersion {
  return {
    id: String(row.id),
    demoSiteId: String(row.demo_site_id),
    versionNumber: Number(row.version_number),
    contentJson: validateDemoSiteContent(row.content_json),
    changeNote: row.change_note ? String(row.change_note) : undefined,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: String(row.created_at)
  };
}

export async function getNextVersionNumber(demoSiteId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("demo_site_versions")
    .select("version_number")
    .eq("demo_site_id", demoSiteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read latest version number: ${error.message}`);
  }

  return data ? Number(data.version_number) + 1 : 1;
}

export async function createDemoSiteVersionRecord(params: {
  demoSiteId: string;
  content: DemoSiteContent;
  changeNote?: string;
  createdBy?: string;
}): Promise<DemoSiteVersion> {
  const supabase = createSupabaseAdminClient();
  const nextVersion = await getNextVersionNumber(params.demoSiteId);

  const { data, error } = await supabase
    .from("demo_site_versions")
    .insert({
      demo_site_id: params.demoSiteId,
      version_number: nextVersion,
      content_json: params.content,
      change_note: params.changeNote ?? null,
      created_by: params.createdBy ?? null
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create demo site version: ${error.message}`);
  }

  return mapVersionRow(data as Record<string, unknown>);
}

export async function getDemoSiteVersionHistory(demoSiteId: string): Promise<DemoSiteVersion[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("demo_site_versions")
    .select("*")
    .eq("demo_site_id", demoSiteId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch demo site version history: ${error.message}`);
  }

  return (data ?? []).map((row) => mapVersionRow(row as Record<string, unknown>));
}
