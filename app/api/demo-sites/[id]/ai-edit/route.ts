import { NextResponse } from "next/server";
import { getDemoSiteById, logDemoSiteActivity } from "@/lib/demo-sites/repository";
import { updateDemoSiteJsonWithAI } from "@/lib/demo-sites/ai-edit";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actorUserId = await requireAuthenticatedUserId();
    const { id } = await context.params;
    const body = await request.json();
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";

    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }

    const site = await getDemoSiteById(id);
    if (!site) {
      return NextResponse.json({ error: "Demo site not found." }, { status: 404 });
    }

    const result = await updateDemoSiteJsonWithAI({
      currentContent: site.generatedContent,
      instruction
    });

    await logDemoSiteActivity({
      userId: actorUserId,
      type: "demo_site_ai_edit_requested",
      entityType: "demo_site",
      entityId: id,
      metadata: {
        instruction
      }
    });

    return NextResponse.json({
      currentContent: site.generatedContent,
      suggestedContent: result.suggestedContent
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI edit failed." },
      { status: 500 }
    );
  }
}
