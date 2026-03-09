import { NextResponse } from "next/server";
import { enrichCommerceLead } from "@/lib/leads/enrichment";
import {
  getGenerationJob,
  updateGenerationJob,
} from "@/lib/demo-sites/generation-jobs";
import {
  runSequentialRedesignPipelinePhase,
  type SequentialPipelineRuntimeState,
} from "@/lib/demo-sites/sequential-pipeline";
import { createGeneratedDemoSite } from "@/lib/demo-sites/repository";
import { getAuthenticatedUserIdOrNull } from "@/lib/supabase/auth";
import { buildOutreachEmailDraft } from "@/lib/leads/outreach-email";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext) {
  const actorUserId = await getAuthenticatedUserIdOrNull();

  try {
    const { jobId } = await context.params;
    const job = await getGenerationJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({ job });
    }

    if (job.status === "failed") {
      return NextResponse.json({ job }, { status: 409 });
    }

    await updateGenerationJob(job.id, { status: "running" });

    const state = (job.state ?? {}) as SequentialPipelineRuntimeState;
    const phase = (job.phase + 1) as 1 | 2 | 3;

    if (phase > 3) {
      return NextResponse.json({ job });
    }

    const enriched = state.enriched ? undefined : await enrichCommerceLead(job.lead);

    const phaseResult = await runSequentialRedesignPipelinePhase({
      phase,
      category: job.siteOption.templateType,
      style: job.siteOption.style,
      state,
      enriched,
    });

    if (phase < 3) {
      const updated = await updateGenerationJob(job.id, {
        status: "queued",
        phase,
        state: phaseResult.state as unknown as Record<string, unknown>,
      });

      return NextResponse.json({ job: updated });
    }

    if (!phaseResult.content || !phaseResult.artifacts) {
      throw new Error("Final phase completed without output.");
    }

    const site = await createGeneratedDemoSite({
      content: phaseResult.content,
      templateType: job.siteOption.templateType,
      designStyle: job.siteOption.style,
      pipelineArtifacts: phaseResult.artifacts,
      actorUserId: actorUserId ?? undefined,
      activityType: "demo_site_generated_from_live_lead",
      changeNote: `Generated from lead ${job.lead.businessName} (${job.siteOption.label})`,
    });

    const finalEnriched = phaseResult.state.enriched ?? enriched;
    const outreachEmail = finalEnriched
      ? buildOutreachEmailDraft({
          enriched: finalEnriched,
          generatedContent: phaseResult.content,
        })
      : undefined;

    const updated = await updateGenerationJob(job.id, {
      status: "completed",
      phase,
      state: phaseResult.state as unknown as Record<string, unknown>,
      result: {
        site,
        locale: finalEnriched?.locale,
        outreachEmail,
      },
    });

    return NextResponse.json({ job: updated });
  } catch (error) {
    const { jobId } = await context.params;
    const failed = await updateGenerationJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Generation failed.",
    }).catch(() => null);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed.",
        job: failed,
      },
      { status: 500 },
    );
  }
}
