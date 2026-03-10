import { NextResponse } from "next/server";
import {
  applyOptimizationFixes,
  buildOptimizationPlan,
  optimizationPlanSchema,
  optimizationReportSchema,
  runOptimizationAudit,
  type OptimizationSourceContext,
} from "@/lib/demo-sites/optimization-phase";
import { getDemoSiteById, saveDemoSiteContent } from "@/lib/demo-sites/repository";
import { getAuthenticatedUserIdOrNull } from "@/lib/supabase/auth";

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
    const actorUserId = await getAuthenticatedUserIdOrNull();
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
        actorUserId: actorUserId ?? undefined,
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

    let finalOptimizedContent = optimized.optimizedContent;
    let finalOptimizedImageSelection = optimized.optimizedImageSelection;
    let finalAppliedActions = [...optimized.appliedActions];
    let finalUnchangedSectionIds = [...optimized.unchangedSectionIds];

    let afterAudit = await runOptimizationAudit({
      content: finalOptimizedContent,
      sourceContext: {
        ...sourceContext,
        currentSelectedImages: finalOptimizedImageSelection,
      },
    });

    const beforeScore = report.overallScore;
    if (afterAudit.report.overallScore <= beforeScore) {
      const escalatedBasePlan = buildOptimizationPlan({
        content: finalOptimizedContent,
        report: afterAudit.report,
        weakImageUrls: afterAudit.plan.weakImageUrls,
      });

      const escalatedActions = [
        ...escalatedBasePlan.actionQueue,
        ...afterAudit.report.issues
          .filter((issue) => issue.severity === "critical" || issue.severity === "high")
          .flatMap((issue) => [
            { actionType: "replace_image" as const, targetSectionId: issue.affectedSectionId, notes: "Escalation pass: replace weak visual." },
            { actionType: "rewrite_copy" as const, targetSectionId: issue.affectedSectionId, notes: "Escalation pass: rewrite for coherence and viability." },
            { actionType: "adjust_spacing" as const, targetSectionId: issue.affectedSectionId, notes: "Escalation pass: tighten layout composition." },
          ]),
      ].filter((action) => action.targetSectionId || action.actionType !== "adjust_spacing");

      const dedupedActions = escalatedActions.filter((action, index, self) =>
        self.findIndex((candidate) =>
          candidate.actionType === action.actionType && candidate.targetSectionId === action.targetSectionId,
        ) === index,
      );

      const escalatedPlan = {
        ...escalatedBasePlan,
        actionQueue: dedupedActions,
      };

      const escalation = await applyOptimizationFixes({
        content: finalOptimizedContent,
        sourceContext: {
          ...sourceContext,
          currentSelectedImages: finalOptimizedImageSelection,
        },
        report: afterAudit.report,
        plan: escalatedPlan,
      });

      const escalationAudit = await runOptimizationAudit({
        content: escalation.optimizedContent,
        sourceContext: {
          ...sourceContext,
          currentSelectedImages: escalation.optimizedImageSelection,
        },
      });

      if (escalationAudit.report.overallScore >= afterAudit.report.overallScore) {
        finalOptimizedContent = escalation.optimizedContent;
        finalOptimizedImageSelection = escalation.optimizedImageSelection;
        finalAppliedActions = [...finalAppliedActions, ...escalation.appliedActions];
        finalUnchangedSectionIds = escalation.unchangedSectionIds;
        afterAudit = escalationAudit;
      }
    }

    const history = [
      ...(site.optimizationRunHistory ?? []),
      {
        runAt: new Date().toISOString(),
        action,
        scoreBefore: report.overallScore,
        scoreAfter: afterAudit.report.overallScore,
        issueCountBefore: report.issues.length,
        issueCountAfter: afterAudit.report.issues.length,
        appliedActions: finalAppliedActions.length,
      },
    ];

    const updated = await saveDemoSiteContent({
      demoSiteId: id,
      content: finalOptimizedContent,
      createVersion: true,
      actorUserId: actorUserId ?? undefined,
      activityType: "demo_site_optimization_applied",
      changeNote: "Apply optimization fixes",
      pipelineArtifacts: {
        optimizationReport: afterAudit.report as unknown as Record<string, unknown>,
        optimizationPlan: afterAudit.plan as unknown as Record<string, unknown>,
        optimizationStatus: "applied",
        optimizedSite: finalOptimizedContent as unknown as Record<string, unknown>,
        optimizedImageSelection: {
          selectedImages: finalOptimizedImageSelection,
        },
        optimizationRunHistory: history,
      },
    });

    return NextResponse.json({
      site: updated,
      optimization: {
        status: "applied",
        report: afterAudit.report,
        plan: afterAudit.plan,
        appliedActions: finalAppliedActions,
        unchangedSectionIds: finalUnchangedSectionIds,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimization phase failed." },
      { status: 500 },
    );
  }
}
