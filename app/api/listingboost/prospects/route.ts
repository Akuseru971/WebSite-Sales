import { NextResponse } from "next/server";
import { createProspect, listProspects } from "@/lib/listingboost/repository";
import { toProspectInsert } from "@/lib/listingboost/mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listProspects({
      city: searchParams.get("city") || undefined,
      country: searchParams.get("country") || undefined,
      niche: searchParams.get("niche") || undefined,
      source: searchParams.get("source") || undefined,
      status: searchParams.get("status") || undefined,
      hasEmail: searchParams.get("hasEmail") === "true",
      hasImages: searchParams.get("hasImages") === "true"
    });

    return NextResponse.json({ count: data.length, data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch prospects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = await createProspect(toProspectInsert(body));
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create prospect" }, { status: 400 });
  }
}
