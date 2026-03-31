import { NextResponse } from "next/server";
import { enhanceExtractedImage } from "@/lib/listingboost/image-enhancement";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      originalStoragePath?: string;
      roomType?: string;
      customPrompt?: string;
      version?: number;
    };

    if (!body.originalStoragePath || !body.roomType) {
      return NextResponse.json({ error: "originalStoragePath and roomType are required" }, { status: 400 });
    }

    const row = await enhanceExtractedImage({
      extractedImageId: id,
      originalStoragePath: body.originalStoragePath,
      roomType: body.roomType,
      customPrompt: body.customPrompt,
      version: body.version ?? 1
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enhancement failed" }, { status: 500 });
  }
}
