import { NextResponse } from "next/server";
import { getGenerationJob } from "@/lib/demo-sites/generation-jobs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const job = await getGenerationJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load generation job." },
      { status: 500 },
    );
  }
}
