import { SEEDED_DEMO_SITES } from "./defaults";
import type {
  DemoSiteContent,
  DemoSiteRecord,
  DemoSiteVersion,
  SaveDemoSiteContentInput,
  SequentialPipelineArtifacts,
} from "./types";
import { normalizeDemoSiteContent, validateDemoSiteContent } from "./validation";
import {
  createDemoSiteVersionRecord,
  getDemoSiteVersionHistory
} from "./versioning";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isMissingSchemaColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? String(error.message ?? "") : "";
  return /Could not find the '.*' column of 'demo_sites' in the schema cache/i.test(message);
}

function toLegacyDemoSitePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const legacy = { ...payload };
  delete legacy.extracted_site_profile_json;
  delete legacy.redesign_plan_json;
  delete legacy.adaptive_site_json;
  delete legacy.source_screenshots_json;
  delete legacy.source_structure_json;
  delete legacy.source_brand_signals_json;
  delete legacy.source_reconstructed_html;
  delete legacy.source_content_json;
  delete legacy.source_assets_json;
  delete legacy.redesigned_site_json;
  delete legacy.crawl_result;
  delete legacy.rendered_dom;
  delete legacy.reconstructed_source;
  delete legacy.raw_content;
  delete legacy.raw_images;
  delete legacy.normalized_content;
  delete legacy.selected_images;
  delete legacy.brand_profile;
  delete legacy.source_quality_score;
  delete legacy.redesign_plan;
  delete legacy.completed_content;
  delete legacy.translated_content;
  delete legacy.final_render_data;
  delete legacy.ai_review;
  delete legacy.correction_pass;
  delete legacy.site_quality_audit_json;
  delete legacy.correction_plan_json;
  delete legacy.corrected_site_json;
  delete legacy.validation_status;
  delete legacy.audit_score;
  delete legacy.must_fix_flags;
  delete legacy.pipeline_run_json;
  return legacy;
}

function mapPipelineArtifactsToPayload(artifacts?: SequentialPipelineArtifacts): Record<string, unknown> {
  if (!artifacts) {
    return {};
  }

  return {
    crawl_result: artifacts.crawlResult ?? null,
    rendered_dom: artifacts.renderedDom ?? null,
    reconstructed_source: artifacts.reconstructedSource ?? null,
    raw_content: artifacts.rawContent ?? null,
    raw_images: artifacts.rawImages ?? null,
    normalized_content: artifacts.normalizedContent ?? null,
    selected_images: artifacts.selectedImages ?? null,
    brand_profile: artifacts.brandProfile ?? null,
    source_quality_score: artifacts.sourceQualityScore ?? null,
    redesign_plan: artifacts.redesignPlan ?? null,
    completed_content: artifacts.completedContent ?? null,
    translated_content: artifacts.translatedContent ?? null,
    final_render_data: artifacts.finalRenderData ?? null,
    ai_review: artifacts.aiReview ?? null,
    correction_pass: artifacts.correctionPass ?? null,
    site_quality_audit_json: artifacts.siteQualityAudit ?? null,
    correction_plan_json: artifacts.correctionPlan ?? null,
    corrected_site_json: artifacts.correctedSite ?? null,
    validation_status: artifacts.validationStatus ?? null,
    audit_score: artifacts.auditScore ?? null,
    must_fix_flags: artifacts.mustFixFlags ?? null,
    pipeline_run_json: artifacts.pipelineRun ?? null,
  };
}

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
  const rawSiteUrl = row.preview_url ? String(row.preview_url) : "";
  const normalizedSiteUrl = rawSiteUrl
    ? rawSiteUrl.replace(/^\/preview\//, "/sites/")
    : `/sites/${row.slug}`;

  return {
    id: String(row.id),
    leadId: row.lead_id ? String(row.lead_id) : undefined,
    title: row.title ? String(row.title) : undefined,
    slug: String(row.slug),
    status: (row.status as DemoSiteRecord["status"]) ?? "generated",
    templateType: String(row.template_type) as DemoSiteRecord["templateType"],
    designStyle: String(row.design_style) as DemoSiteRecord["designStyle"],
    previewUrl: normalizedSiteUrl,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    generatedContent: normalized,
    extractedSiteProfileJson: (row.extracted_site_profile_json as DemoSiteRecord["extractedSiteProfileJson"]) ?? normalized.extractedSiteProfile,
    redesignPlanJson: (row.redesign_plan_json as DemoSiteRecord["redesignPlanJson"]) ?? normalized.redesignPlan,
    adaptiveSiteJson: (row.adaptive_site_json as DemoSiteRecord["adaptiveSiteJson"]) ?? normalized.adaptiveSiteJson,
    sourceScreenshotsJson: (row.source_screenshots_json as DemoSiteRecord["sourceScreenshotsJson"]) ?? normalized.extractedSiteProfile?.sourceScreenshots,
    sourceStructureJson: (row.source_structure_json as DemoSiteRecord["sourceStructureJson"]) ?? normalized.sourceStructureJson,
    sourceBrandSignalsJson: (row.source_brand_signals_json as DemoSiteRecord["sourceBrandSignalsJson"]) ?? normalized.extractedSiteProfile?.businessIdentity,
    sourceReconstructedHtml: (row.source_reconstructed_html as DemoSiteRecord["sourceReconstructedHtml"]) ?? normalized.sourceReconstructedHtml,
    sourceContentJson: (row.source_content_json as DemoSiteRecord["sourceContentJson"]) ?? normalized.sourceContentJson,
    sourceAssetsJson: (row.source_assets_json as DemoSiteRecord["sourceAssetsJson"]) ?? normalized.sourceAssetsJson,
    redesignedSiteJson: (row.redesigned_site_json as DemoSiteRecord["redesignedSiteJson"]) ?? normalized,
    crawlResultJson: (row.crawl_result as DemoSiteRecord["crawlResultJson"]) ?? undefined,
    renderedDomJson: (row.rendered_dom as DemoSiteRecord["renderedDomJson"]) ?? undefined,
    reconstructedSourceJson: (row.reconstructed_source as DemoSiteRecord["reconstructedSourceJson"]) ?? undefined,
    rawContentJson: (row.raw_content as DemoSiteRecord["rawContentJson"]) ?? undefined,
    rawImagesJson: (row.raw_images as DemoSiteRecord["rawImagesJson"]) ?? undefined,
    normalizedContentJson: (row.normalized_content as DemoSiteRecord["normalizedContentJson"]) ?? undefined,
    selectedImagesJson: (row.selected_images as DemoSiteRecord["selectedImagesJson"]) ?? undefined,
    brandProfileJson: (row.brand_profile as DemoSiteRecord["brandProfileJson"]) ?? undefined,
    sourceQualityScoreJson: (row.source_quality_score as DemoSiteRecord["sourceQualityScoreJson"]) ?? undefined,
    redesignPlanStepJson: (row.redesign_plan as DemoSiteRecord["redesignPlanStepJson"]) ?? undefined,
    completedContentJson: (row.completed_content as DemoSiteRecord["completedContentJson"]) ?? undefined,
    translatedContentJson: (row.translated_content as DemoSiteRecord["translatedContentJson"]) ?? undefined,
    finalRenderDataJson: (row.final_render_data as DemoSiteRecord["finalRenderDataJson"]) ?? undefined,
    aiReviewJson: (row.ai_review as DemoSiteRecord["aiReviewJson"]) ?? undefined,
    correctionPassJson: (row.correction_pass as DemoSiteRecord["correctionPassJson"]) ?? undefined,
    siteQualityAuditJson: (row.site_quality_audit_json as DemoSiteRecord["siteQualityAuditJson"]) ?? undefined,
    correctionPlanJson: (row.correction_plan_json as DemoSiteRecord["correctionPlanJson"]) ?? undefined,
    correctedSiteJson: (row.corrected_site_json as DemoSiteRecord["correctedSiteJson"]) ?? undefined,
    validationStatus: (row.validation_status as DemoSiteRecord["validationStatus"]) ?? undefined,
    auditScore:
      typeof row.audit_score === "number"
        ? row.audit_score
        : typeof row.audit_score === "string"
          ? Number(row.audit_score)
          : undefined,
    mustFixFlags: (row.must_fix_flags as DemoSiteRecord["mustFixFlags"]) ?? undefined,
    pipelineRunJson: (row.pipeline_run_json as DemoSiteRecord["pipelineRunJson"]) ?? undefined,
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

  const payload: Record<string, unknown> = {
    title: validatedContent.businessInfo.name,
    generated_content_json: validatedContent,
    extracted_site_profile_json: validatedContent.extractedSiteProfile ?? null,
    redesign_plan_json: validatedContent.redesignPlan ?? null,
    adaptive_site_json: validatedContent.adaptiveSiteJson ?? null,
    source_screenshots_json: validatedContent.extractedSiteProfile?.sourceScreenshots ?? null,
    source_structure_json: validatedContent.sourceStructureJson ?? null,
    source_brand_signals_json: validatedContent.extractedSiteProfile?.businessIdentity ?? null,
    source_reconstructed_html: validatedContent.sourceReconstructedHtml ?? null,
    source_content_json: validatedContent.sourceContentJson ?? null,
    source_assets_json: validatedContent.sourceAssetsJson ?? null,
    redesigned_site_json: validatedContent,
    ...mapPipelineArtifactsToPayload(input.pipelineArtifacts),
    updated_at: new Date().toISOString()
  };

  let { data: updated, error } = await supabase
    .from("demo_sites")
    .update(payload)
    .eq("id", input.demoSiteId)
    .select("*")
    .single();

  if (error && isMissingSchemaColumnError(error)) {
    const retry = await supabase
      .from("demo_sites")
      .update(toLegacyDemoSitePayload(payload))
      .eq("id", input.demoSiteId)
      .select("*")
      .single();

    updated = retry.data;
    error = retry.error;
  }

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
  pipelineArtifacts?: SequentialPipelineArtifacts;
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

  const payload: Record<string, unknown> = {
    slug,
    title: validatedContent.businessInfo.name,
    status: "generated",
    template_type: params.templateType,
    design_style: params.designStyle,
    preview_url: `/sites/${slug}`,
    generated_content_json: validatedContent,
    extracted_site_profile_json: validatedContent.extractedSiteProfile ?? null,
    redesign_plan_json: validatedContent.redesignPlan ?? null,
    adaptive_site_json: validatedContent.adaptiveSiteJson ?? null,
    source_screenshots_json: validatedContent.extractedSiteProfile?.sourceScreenshots ?? null,
    source_structure_json: validatedContent.sourceStructureJson ?? null,
    source_brand_signals_json: validatedContent.extractedSiteProfile?.businessIdentity ?? null,
    source_reconstructed_html: validatedContent.sourceReconstructedHtml ?? null,
    source_content_json: validatedContent.sourceContentJson ?? null,
    source_assets_json: validatedContent.sourceAssetsJson ?? null,
    redesigned_site_json: validatedContent,
    ...mapPipelineArtifactsToPayload(params.pipelineArtifacts),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  let { data, error } = await supabase
    .from("demo_sites")
    .insert(payload)
    .select("*")
    .single();

  if (error && isMissingSchemaColumnError(error)) {
    const retry = await supabase
      .from("demo_sites")
      .insert(toLegacyDemoSitePayload(payload))
      .select("*")
      .single();

    data = retry.data;
    error = retry.error;
  }

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
