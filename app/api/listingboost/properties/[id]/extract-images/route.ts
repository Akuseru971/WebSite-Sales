import { NextResponse } from "next/server";
import { extractPropertyImages } from "@/lib/listingboost/image-extraction";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { propertyName?: string; propertyUrl?: string };

    if (!body.propertyUrl || !body.propertyName) {
      return NextResponse.json({ error: "propertyName and propertyUrl are required" }, { status: 400 });
    }

    const result = await extractPropertyImages({
      prospectId: id,
      propertyName: body.propertyName,
      propertyUrl: body.propertyUrl
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Extraction failed" }, { status: 500 });
  }
}
