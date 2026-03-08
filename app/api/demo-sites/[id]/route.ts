import { NextResponse } from "next/server";
import { getDemoSiteById, saveDemoSiteContent } from "@/lib/demo-sites/repository";
import { validateDemoSiteContent, getValidationErrorMessage } from "@/lib/demo-sites/validation";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticatedUserId();
    const { id } = await context.params;
    const site = await getDemoSiteById(id);

    if (!site) {
      return NextResponse.json({ error: "Demo site not found." }, { status: 404 });
    }

    return NextResponse.json({ site });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load demo site." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const actorUserId = await requireAuthenticatedUserId();
    const { id } = await context.params;
    const body = await request.json();
    const validatedContent = validateDemoSiteContent(body.content);

    const updated = await saveDemoSiteContent({
      demoSiteId: id,
      content: validatedContent,
      changeNote: body.changeNote,
      createVersion: body.createVersion ?? true,
      actorUserId,
      activityType: body.activityType ?? "demo_site_json_updated"
    });

    return NextResponse.json({ site: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? getValidationErrorMessage(error)
            : "Failed to save demo site content."
      },
      { status: 400 }
    );
  }
}
