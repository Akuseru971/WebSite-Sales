import { NextResponse } from "next/server";
import {
  applyOptimizationFixes,
  optimizationPlanSchema,
  optimizationReportSchema,
  runOptimizationAudit,
  type OptimizationSourceContext,
} from "@/lib/demo-sites/optimization-phase";
import { getDemoSiteById, saveDemoSiteContent } from "@/lib/demo-sites/repository";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type OptimizationAction = "run_audit" | "apply_fixes" | "rerun_optimization";

function toRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === "string") as string[];
}

function buildOptimizationContext(site: NonNullable<Awaited<ReturnType<typeof getDemoSiteById>>>): OptimizationSourceContext {
  const selectedImages = toRecordArray((site.selectedImagesJson as { selectedImages?: unknown } | undefined)?.selectedImages);
  const sourceSelectedImages = toRecordArray((site.rawImagesJson as { images?: unknown } | undefined)?.images);

  return {
    sourceUrl: (site.extractedSiteProfileJson as { sourceWebsiteUrl?: string } | undefined)?.sourceWebsiteUrl,
    sourceReconstructedHtml: site.sourceReconstructedHtml,
    sourceScreenshots: toStringArray(
      (site.extractedSiteProfileJson as { sourceScreenshots?: unknown[] } | undefined)?.sourceScreenshots?.map((item) =>
        typeof item === "object" && item !== null ? (item as { dataUrl?: string }).dataUrl : undefined,
      ),
    ),
    sourceExtractedContent:
      (site.sourceContentJson as Record<string, unknown> | undefined) ??
      (site.reconstructedSourceJson as Record<string, unknown> | undefined) ??
      {},
    sourceSelectedImages,
    sourceBrandProfile: site.brandProfileJson,
    currentSelectedImages: selectedImages,
    currentPreviewScreenshots: [],
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actorUserId = await requireAuthenticatedUserId();
    const { id } = await context.params;
    const body = (await request.json()) as { action?: OptimizationAction };
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const site = await getDemoSiteById(id);
    if (!site) {
      return NextResponse.json({ error: "Demo site not found." }, { status: 404 });
    }

    const sourceContext = buildOptimizationContext(site);
    const baseContent = (site.optimizedSiteJson as unknown as typeof site.generatedContent) || site.generatedContent;

    if (action === "run_audit" || action === "rerun_optimization") {
      const audit = await runOptimizationAudit({
        content: baseContent,
        sourceContext,
      });

      const history = [
        ...(site.optimizationRunHistory ?? []),
        {
          runAt: new Date().toISOString(),
          action,
          overallScore: audit.report.overallScore,
          issueCount: audit.report.issues.length,
        },
      ];

      const updated = await saveDemoSiteContent({
        demoSiteId: id,
        content: baseContent,
        createVersion: false,
        actorUserId,
        activityType: "demo_site_optimization_audit_run",
        changeNote: action === "run_audit" ? "Run optimization audit" : "Re-run optimization audit",
        pipelineArtifacts: {
          optimizationReport: audit.report as unknown as Record<string, unknown>,
          optimizationPlan: audit.plan as unknown as Record<string, unknown>,
          optimizationStatus: "audited",
          optimizationRunHistory: history,
        },
      });

      return NextResponse.json({
        site: updated,
        optimization: {
          status: "audited",
          report: audit.report,
          plan: audit.plan,
          screenshotSignal: audit.screenshotSignal,
        },
      });
    }

    const auditFallback = (!site.optimizationReportJson || !site.optimizationPlanJson)
      ? await runOptimizationAudit({
          content: baseContent,
          sourceContext,
        })
      : null;

    const report = optimizationReportSchema.parse(site.optimizationReportJson ?? auditFallback?.report ?? {});
    const plan = optimizationPlanSchema.parse(site.optimizationPlanJson ?? auditFallback?.plan ?? {});

    const optimized = await applyOptimizationFixes({
      content: baseContent,
      sourceContext,
      report,
      plan,
    });

    const history = [
      ...(site.optimizationRunHistory ?? []),
      {
        runAt: new Date().toISOString(),
        action,
        overallScore: report.overallScore,
        issueCount: report.issues.length,
        appliedActions: optimized.appliedActions.length,
      },
    ];

    const updated = await saveDemoSiteContent({
      demoSiteId: id,
      content: optimized.optimizedContent,
      createVersion: true,
      actorUserId,
      activityType: "demo_site_optimization_applied",
      changeNote: "Apply optimization fixes",
      pipelineArtifacts: {
        optimizationReport: report as unknown as Record<string, unknown>,
        optimizationPlan: plan as unknown as Record<string, unknown>,
        optimizationStatus: "applied",
        optimizedSite: optimized.optimizedContent as unknown as Record<string, unknown>,
        optimizedImageSelection: {
          selectedImages: optimized.optimizedImageSelection,
        },
        optimizationRunHistory: history,
      },
    });

    return NextResponse.json({
      site: updated,
      optimization: {
        status: "applied",
        report,
        plan,
        appliedActions: optimized.appliedActions,
        unchangedSectionIds: optimized.unchangedSectionIds,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimization phase failed." },
      { status: 500 },
    );
  }
}
