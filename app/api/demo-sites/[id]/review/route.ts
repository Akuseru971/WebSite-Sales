import { NextResponse } from "next/server";
import {
  auditGeneratedSiteWithAI,
  buildCorrectionPlanFromAudit,
  correctGeneratedSiteWithAI,
  validateSiteAfterCorrection,
} from "@/lib/demo-sites/quality-review";
import { getDemoSiteById, saveDemoSiteContent } from "@/lib/demo-sites/repository";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type ReviewAction = "rerun_audit" | "apply_correction" | "approve_corrected" | "reject_regenerate";

function buildAuditContext(site: Awaited<ReturnType<typeof getDemoSiteById>>) {
  if (!site) {
    return undefined;
  }

  return {
    sourceData: (site.reconstructedSourceJson ??
      site.sourceContentJson ??
      site.extractedSiteProfileJson ??
      {}) as Record<string, unknown>,
    normalizedContent: (site.normalizedContentJson ?? {}) as Record<string, unknown>,
    multilingual: (site.translatedContentJson ?? {}) as Record<string, unknown>,
    category: site.templateType,
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actorUserId = await requireAuthenticatedUserId();
    const { id } = await context.params;
    const body = (await request.json()) as { action?: ReviewAction };
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const site = await getDemoSiteById(id);
    if (!site) {
      return NextResponse.json({ error: "Demo site not found." }, { status: 404 });
    }

    const auditContext = buildAuditContext(site);
    const baseContent = site.correctedSiteJson
      ? (site.correctedSiteJson as unknown as typeof site.generatedContent)
      : site.generatedContent;

    if (action === "rerun_audit") {
      const audit = await auditGeneratedSiteWithAI({
        content: baseContent,
        context: auditContext,
      });

      const updated = await saveDemoSiteContent({
        demoSiteId: id,
        content: baseContent,
        createVersion: false,
        actorUserId,
        activityType: "demo_site_review_rerun_audit",
        changeNote: "Re-run quality audit",
        pipelineArtifacts: {
          siteQualityAudit: audit as unknown as Record<string, unknown>,
          aiReview: audit as unknown as Record<string, unknown>,
          validationStatus: audit.mustFixBeforePreview.length === 0 ? "passed" : "needs_correction",
          auditScore: audit.overallScore,
          mustFixFlags: audit.mustFixBeforePreview,
        },
      });

      return NextResponse.json({ site: updated, action });
    }

    if (action === "apply_correction") {
      const audit = await auditGeneratedSiteWithAI({
        content: baseContent,
        context: auditContext,
      });
      const correctionPlan = buildCorrectionPlanFromAudit({ content: baseContent, audit });
      const corrected = await correctGeneratedSiteWithAI({
        content: baseContent,
        audit,
        correctionPlan,
        context: auditContext,
      });
      const validation = await validateSiteAfterCorrection({
        correctedContent: corrected,
        context: auditContext,
      });

      const updated = await saveDemoSiteContent({
        demoSiteId: id,
        content: corrected,
        createVersion: true,
        actorUserId,
        activityType: "demo_site_review_apply_correction",
        changeNote: "Apply post-generation correction pass",
        pipelineArtifacts: {
          siteQualityAudit: validation.audit as unknown as Record<string, unknown>,
          aiReview: validation.audit as unknown as Record<string, unknown>,
          correctionPlan: correctionPlan as unknown as Record<string, unknown>,
          correctedSite: corrected as unknown as Record<string, unknown>,
          correctionPass: {
            correctedAt: new Date().toISOString(),
            mode: "manual-review-action",
          },
          validationStatus: validation.passed ? "corrected_pending_review" : "needs_correction",
          auditScore: validation.audit.overallScore,
          mustFixFlags: validation.mustFixFlags,
        },
      });

      return NextResponse.json({ site: updated, action });
    }

    if (action === "approve_corrected") {
      const approvedContent = site.correctedSiteJson
        ? (site.correctedSiteJson as unknown as typeof site.generatedContent)
        : site.generatedContent;

      const updated = await saveDemoSiteContent({
        demoSiteId: id,
        content: approvedContent,
        createVersion: false,
        actorUserId,
        activityType: "demo_site_review_approved",
        changeNote: "Approve corrected site",
        pipelineArtifacts: {
          validationStatus: "approved",
        },
      });

      return NextResponse.json({ site: updated, action });
    }

    const updated = await saveDemoSiteContent({
      demoSiteId: id,
      content: site.generatedContent,
      createVersion: false,
      actorUserId,
      activityType: "demo_site_review_rejected",
      changeNote: "Rejected and sent back to regeneration",
      pipelineArtifacts: {
        validationStatus: "rejected",
      },
    });

    return NextResponse.json({ site: updated, action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run review action." },
      { status: 500 },
    );
  }
}
