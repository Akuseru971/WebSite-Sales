import { NextResponse } from "next/server";
import type { BusinessCategory, DemoSiteStyle } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/types";
import { createGenerationJob } from "@/lib/demo-sites/generation-jobs";

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

    const job = await createGenerationJob({
      lead: body.lead,
      siteOption: body.siteOption,
    });

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        phase: job.phase,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site generation failed." },
      { status: 500 }
    );
  }
}
