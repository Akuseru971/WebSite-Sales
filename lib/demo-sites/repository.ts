import { SEEDED_DEMO_SITES } from "./defaults";
import type { DemoSiteContent, DemoSiteRecord, DemoSiteVersion, SaveDemoSiteContentInput } from "./types";
import { normalizeDemoSiteContent, validateDemoSiteContent } from "./validation";
import {
  createDemoSiteVersionRecord,
  getDemoSiteVersionHistory
} from "./versioning";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

function buildDemoSiteSlug(params: { name: string; city?: string }): string {
  const base = [slugify(params.name), params.city ? slugify(params.city) : null]
    .filter(Boolean)
    .join("-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "demo-site"}-${suffix}`;
}

function getSupabaseAdminOrNull() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function mapDbDemoSiteRow(row: Record<string, unknown>): DemoSiteRecord {
  const normalized = normalizeDemoSiteContent(row.generated_content_json);

  return {
    id: String(row.id),
    leadId: row.lead_id ? String(row.lead_id) : undefined,
    title: row.title ? String(row.title) : undefined,
    slug: String(row.slug),
    status: (row.status as DemoSiteRecord["status"]) ?? "generated",
    templateType: String(row.template_type) as DemoSiteRecord["templateType"],
    designStyle: String(row.design_style) as DemoSiteRecord["designStyle"],
    previewUrl: row.preview_url ? String(row.preview_url) : `/preview/${row.slug}`,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    generatedContent: normalized,
    extractedSiteProfileJson: (row.extracted_site_profile_json as DemoSiteRecord["extractedSiteProfileJson"]) ?? normalized.extractedSiteProfile,
    redesignPlanJson: (row.redesign_plan_json as DemoSiteRecord["redesignPlanJson"]) ?? normalized.redesignPlan,
    adaptiveSiteJson: (row.adaptive_site_json as DemoSiteRecord["adaptiveSiteJson"]) ?? normalized.adaptiveSiteJson,
    sourceScreenshotsJson: (row.source_screenshots_json as DemoSiteRecord["sourceScreenshotsJson"]) ?? normalized.extractedSiteProfile?.sourceScreenshots,
    sourceStructureJson: (row.source_structure_json as DemoSiteRecord["sourceStructureJson"]) ?? normalized.extractedSiteProfile?.structuralIdentity.structureSummary,
    sourceBrandSignalsJson: (row.source_brand_signals_json as DemoSiteRecord["sourceBrandSignalsJson"]) ?? normalized.extractedSiteProfile?.businessIdentity,
  };
}

function mapSeedDemoSite(site: DemoSiteRecord): DemoSiteRecord {
  return {
    ...site,
    generatedContent: normalizeDemoSiteContent(site.generatedContent)
  };
}

export async function listDemoSites(): Promise<DemoSiteRecord[]> {
  const supabase = getSupabaseAdminOrNull();

  if (!supabase) {
    return SEEDED_DEMO_SITES.map(mapSeedDemoSite);
  }

  const { data, error } = await supabase
    .from("demo_sites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return SEEDED_DEMO_SITES.map(mapSeedDemoSite);
  }

  if (!data?.length) {
    return SEEDED_DEMO_SITES.map(mapSeedDemoSite);
  }

  return data.map((row) => mapDbDemoSiteRow(row as Record<string, unknown>));
}

export async function getDemoSiteBySlug(slug: string): Promise<DemoSiteRecord | null> {
  const supabase = getSupabaseAdminOrNull();

  if (supabase) {
    const { data, error } = await supabase
      .from("demo_sites")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      return mapDbDemoSiteRow(data as Record<string, unknown>);
    }
  }

  const fallback = SEEDED_DEMO_SITES.find((site) => site.slug === slug);
  return fallback ? mapSeedDemoSite(fallback) : null;
}

export async function getDemoSiteById(id: string): Promise<DemoSiteRecord | null> {
  const supabase = getSupabaseAdminOrNull();

  if (supabase) {
    const { data, error } = await supabase
      .from("demo_sites")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return mapDbDemoSiteRow(data as Record<string, unknown>);
    }
  }

  const fallback = SEEDED_DEMO_SITES.find((site) => site.id === id);
  return fallback ? mapSeedDemoSite(fallback) : null;
}

export async function createDemoSiteVersion(params: {
  demoSiteId: string;
  content: DemoSiteContent;
  changeNote?: string;
  createdBy?: string;
}): Promise<DemoSiteVersion> {
  return createDemoSiteVersionRecord(params);
}

export async function listDemoSiteVersions(demoSiteId: string): Promise<DemoSiteVersion[]> {
  return getDemoSiteVersionHistory(demoSiteId);
}

export async function saveDemoSiteContent(input: SaveDemoSiteContentInput): Promise<DemoSiteRecord> {
  const supabase = createSupabaseAdminClient();
  const validatedContent = validateDemoSiteContent(input.content);

  const { data: updated, error } = await supabase
    .from("demo_sites")
    .update({
      title: validatedContent.businessInfo.name,
      generated_content_json: validatedContent,
      extracted_site_profile_json: validatedContent.extractedSiteProfile ?? null,
      redesign_plan_json: validatedContent.redesignPlan ?? null,
      adaptive_site_json: validatedContent.adaptiveSiteJson ?? null,
      source_screenshots_json: validatedContent.extractedSiteProfile?.sourceScreenshots ?? null,
      source_structure_json: validatedContent.extractedSiteProfile?.structuralIdentity.structureSummary ?? null,
      source_brand_signals_json: validatedContent.extractedSiteProfile?.businessIdentity ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.demoSiteId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update demo site content: ${error.message}`);
  }

  if (input.createVersion ?? true) {
    await createDemoSiteVersionRecord({
      demoSiteId: input.demoSiteId,
      content: validatedContent,
      changeNote: input.changeNote,
      createdBy: input.actorUserId
    });
  }

  if (input.actorUserId && input.activityType) {
    await logDemoSiteActivity({
      userId: input.actorUserId,
      type: input.activityType,
      entityType: "demo_site",
      entityId: input.demoSiteId,
      metadata: {
        changeNote: input.changeNote ?? null,
        createVersion: input.createVersion ?? true
      }
    });
  }

  return mapDbDemoSiteRow(updated as Record<string, unknown>);
}

export async function createGeneratedDemoSite(params: {
  content: DemoSiteContent;
  templateType: DemoSiteRecord["templateType"];
  designStyle: DemoSiteRecord["designStyle"];
  actorUserId?: string;
  activityType?: string;
  changeNote?: string;
}): Promise<DemoSiteRecord> {
  const supabase = createSupabaseAdminClient();
  const validatedContent = validateDemoSiteContent(params.content);
  const slug = buildDemoSiteSlug({
    name: validatedContent.businessInfo.name,
    city: validatedContent.businessInfo.city
  });

  const { data, error } = await supabase
    .from("demo_sites")
    .insert({
      slug,
      title: validatedContent.businessInfo.name,
      status: "generated",
      template_type: params.templateType,
      design_style: params.designStyle,
      preview_url: `/preview/${slug}`,
      generated_content_json: validatedContent,
      extracted_site_profile_json: validatedContent.extractedSiteProfile ?? null,
      redesign_plan_json: validatedContent.redesignPlan ?? null,
      adaptive_site_json: validatedContent.adaptiveSiteJson ?? null,
      source_screenshots_json: validatedContent.extractedSiteProfile?.sourceScreenshots ?? null,
      source_structure_json: validatedContent.extractedSiteProfile?.structuralIdentity.structureSummary ?? null,
      source_brand_signals_json: validatedContent.extractedSiteProfile?.businessIdentity ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create generated demo site: ${error?.message ?? "unknown error"}`);
  }

  const site = mapDbDemoSiteRow(data as Record<string, unknown>);

  await createDemoSiteVersionRecord({
    demoSiteId: site.id,
    content: validatedContent,
    changeNote: params.changeNote ?? "Initial AI generation",
    createdBy: params.actorUserId
  });

  if (params.actorUserId) {
    await logDemoSiteActivity({
      userId: params.actorUserId,
      type: params.activityType ?? "demo_site_generated",
      entityType: "demo_site",
      entityId: site.id,
      metadata: {
        templateType: params.templateType,
        designStyle: params.designStyle,
        slug: site.slug
      }
    });
  }

  return site;
}

export async function restoreDemoSiteVersion(params: {
  demoSiteId: string;
  versionId: string;
  actorUserId?: string;
  changeNote?: string;
}): Promise<DemoSiteRecord> {
  const supabase = createSupabaseAdminClient();
  const { data: version, error: versionError } = await supabase
    .from("demo_site_versions")
    .select("*")
    .eq("id", params.versionId)
    .eq("demo_site_id", params.demoSiteId)
    .single();

  if (versionError || !version) {
    throw new Error(`Failed to find version to restore: ${versionError?.message ?? "missing version"}`);
  }

  const validatedContent = validateDemoSiteContent(version.content_json);
  const restoredRecord = await saveDemoSiteContent({
    demoSiteId: params.demoSiteId,
    content: validatedContent,
    changeNote:
      params.changeNote ?? `Restored from version #${String(version.version_number)}`,
    createVersion: true,
    actorUserId: params.actorUserId,
    activityType: "demo_site_version_restored"
  });

  return restoredRecord;
}

export async function logDemoSiteActivity(params: {
  userId: string;
  type: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("activities").insert({
    user_id: params.userId,
    type: params.type,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata_json: params.metadata ?? {},
    created_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}

export async function listSeededDemoSites(): Promise<DemoSiteRecord[]> {
  return SEEDED_DEMO_SITES.map(mapSeedDemoSite);
}
