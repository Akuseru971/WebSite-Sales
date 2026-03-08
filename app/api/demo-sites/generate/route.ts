import { NextResponse } from "next/server";
import type { BusinessCategory, DemoSiteStyle } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/types";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";
import { enrichCommerceLead } from "@/lib/leads/enrichment";
import { generateDemoSiteContentWithAI } from "@/lib/demo-sites/ai-generate";
import { createGeneratedDemoSite } from "@/lib/demo-sites/repository";

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
    const actorUserId = await requireAuthenticatedUserId();
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
    const content = await generateDemoSiteContentWithAI({
      category: body.siteOption.templateType,
      style: body.siteOption.style,
      siteLabel: body.siteOption.label,
      enriched
    });

    const site = await createGeneratedDemoSite({
      content,
      templateType: body.siteOption.templateType,
      designStyle: body.siteOption.style,
      actorUserId,
      activityType: "demo_site_generated_from_live_lead",
      changeNote: `Generated from lead ${body.lead.businessName} (${body.siteOption.label})`
    });

    return NextResponse.json({
      site,
      enrichment: {
        hasWebsiteData: Boolean(enriched.websiteData),
        imageCount: enriched.suggestedImages.length,
        menuHintCount: enriched.inferredMenuItems.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site generation failed." },
      { status: 500 }
    );
  }
}
