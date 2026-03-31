import { NextResponse } from "next/server";
import { getProspectById, updateProspectStatus } from "@/lib/listingboost/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await getProspectById(id);
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prospect not found" }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };

    if (!body.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    await updateProspectStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update prospect" }, { status: 400 });
  }
}
