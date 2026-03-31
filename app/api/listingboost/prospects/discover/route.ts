import { NextResponse } from "next/server";
import { discoverProspects } from "@/lib/listingboost/discovery";
import { createProspect } from "@/lib/listingboost/repository";
import { toProspectInsert } from "@/lib/listingboost/mappers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const discovered = await discoverProspects(body);

    const rows = [];
    for (const item of discovered) {
      const row = await createProspect(
        toProspectInsert({
          businessName: item.businessName,
          niche: body.niche,
          city: item.city,
          country: item.country,
          website: item.website,
          publicEmail: item.publicEmail,
          linkedinUrl: item.linkedinUrl,
          instagramUrl: item.instagramUrl,
          contactPageUrl: item.contactPageUrl,
          sourceQuery: item.sourceQuery,
          sourceUrl: item.sourceUrl,
          source: item.source,
          confidenceScore: item.confidenceScore,
          status: "researched"
        })
      );
      rows.push(row);
    }

    return NextResponse.json({ count: rows.length, data: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Discovery failed" }, { status: 400 });
  }
}
