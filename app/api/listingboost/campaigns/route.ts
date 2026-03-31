import { NextResponse } from "next/server";
import { createCampaign, listCampaigns } from "@/lib/listingboost/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await listCampaigns();
    return NextResponse.json({ count: rows.length, data: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; variant?: "short" | "standard" | "premium"; dailyCap?: number };

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const row = await createCampaign({
      name: body.name,
      variant: body.variant ?? "standard",
      status: "draft",
      daily_cap: body.dailyCap ?? null
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create campaign" }, { status: 500 });
  }
}
