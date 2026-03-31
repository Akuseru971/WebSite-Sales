import { NextResponse } from "next/server";
import { getDashboardKpis } from "@/lib/listingboost/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const kpis = await getDashboardKpis();
    return NextResponse.json(kpis);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load KPIs" }, { status: 500 });
  }
}
