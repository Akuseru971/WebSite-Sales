import { NextResponse } from "next/server";
import type { BusinessCategory, DemoSiteStyle } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/types";
import { getAuthenticatedUserIdOrNull } from "@/lib/supabase/auth";
import { enrichCommerceLead } from "@/lib/leads/enrichment";
import { runSequentialRedesignPipeline } from "@/lib/demo-sites/sequential-pipeline";
import { createGeneratedDemoSite } from "@/lib/demo-sites/repository";
import { buildOutreachEmailDraft } from "@/lib/leads/outreach-email";

interface GenerationRequestBody {
  lead: CommerceLead;
  siteOption: {
    label: string;
    templateType: BusinessCategory;
    style: DemoSiteStyle;
  };
}

const allowedCategories = new Set<BusinessCategory>([
  "taxi",
  "restaurant",
  "hotel",
  "real_estate"
]);

const allowedStyles = new Set<DemoSiteStyle>([
  "urban",
  "atmospheric",
  "luxury",
  "corporate"
]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actorUserId = await getAuthenticatedUserIdOrNull();
    const body = (await request.json()) as GenerationRequestBody;

    if (!body?.lead || !body?.siteOption) {
      return NextResponse.json({ error: "lead and siteOption are required" }, { status: 400 });
    }

    if (!allowedCategories.has(body.siteOption.templateType)) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    if (!allowedStyles.has(body.siteOption.style)) {
      return NextResponse.json({ error: "Invalid style" }, { status: 400 });
    }

    const enriched = await enrichCommerceLead(body.lead);
    const pipeline = await runSequentialRedesignPipeline({
      enriched,
      category: body.siteOption.templateType,
      style: body.siteOption.style
    });

    const site = await createGeneratedDemoSite({
      content: pipeline.content,
      templateType: body.siteOption.templateType,
      designStyle: body.siteOption.style,
      pipelineArtifacts: pipeline.artifacts,
      actorUserId: actorUserId ?? undefined,
      activityType: "demo_site_generated_from_live_lead",
      changeNote: `Generated from lead ${body.lead.businessName} (${body.siteOption.label})`
    });

    const outreachEmail = buildOutreachEmailDraft({
      enriched,
      generatedContent: pipeline.content
    });

    return NextResponse.json({
      site,
      locale: enriched.locale,
      outreachEmail,
      enrichment: {
        hasStructuredExtraction: Boolean(enriched.extractedWebsite),
        imageCount: enriched.suggestedImages.length,
        menuHintCount: enriched.inferredMenuItems.length,
        redesignPlanReady: Boolean(pipeline.content.redesignPlan),
        extractedProfileReady: Boolean(pipeline.content.extractedSiteProfile),
        adaptiveCompositionReady: Boolean(pipeline.content.adaptiveSiteJson),
        pipelineStages:
          (pipeline.artifacts.pipelineRun?.stageLogs as Array<Record<string, unknown>> | undefined)?.map((stage) => ({
            step: stage.step,
            key: stage.key,
            status: stage.status,
          })) ?? [],
        restaurantDiagnostics: pipeline.content.restaurantDiagnostics
          ? {
              missingFields: pipeline.content.restaurantDiagnostics.missingFields,
              confidence: pipeline.content.restaurantDiagnostics.confidence,
            }
          : undefined,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site generation failed." },
      { status: 500 }
    );
  }
}
