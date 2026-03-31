import { NextResponse } from "next/server";
import { saveManualImageUpload } from "@/lib/listingboost/image-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const propertyId = String(formData.get("propertyId") || "");
    const roomType = String(formData.get("roomType") || "unknown");
    const file = formData.get("file");

    if (!propertyId || !(file instanceof File)) {
      return NextResponse.json({ error: "propertyId and file are required" }, { status: 400 });
    }

    const row = await saveManualImageUpload({ propertyId, file, roomType });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
