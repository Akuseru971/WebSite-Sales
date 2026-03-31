import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/listingboost/repository";
import { toSettingsUpdate } from "@/lib/listingboost/mappers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = await updateSettings(toSettingsUpdate(body));
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update settings" }, { status: 400 });
  }
}
