import { NextResponse } from "next/server";
import { restoreDemoSiteVersion } from "@/lib/demo-sites/repository";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actorUserId = await requireAuthenticatedUserId();
    const { id } = await context.params;
    const body = await request.json();

    if (!body.versionId || typeof body.versionId !== "string") {
      return NextResponse.json({ error: "versionId is required." }, { status: 400 });
    }

    const site = await restoreDemoSiteVersion({
      demoSiteId: id,
      versionId: body.versionId,
      actorUserId,
      changeNote: body.changeNote
    });

    return NextResponse.json({ site });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore version." },
      { status: 500 }
    );
  }
}
