import { NextResponse } from "next/server";
import { listDemoSiteVersions } from "@/lib/demo-sites/repository";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedUserId();
    const { id } = await context.params;
    const versions = await listDemoSiteVersions(id);
    return NextResponse.json({ versions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load versions." },
      { status: 500 }
    );
  }
}
