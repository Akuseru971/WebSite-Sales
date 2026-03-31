import { NextResponse } from "next/server";
import { createEmailDraft } from "@/lib/listingboost/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prospectId?: string;
      businessName?: string;
      city?: string;
      senderEmail?: string;
      previewLink?: string;
      variant?: "short" | "standard" | "premium";
    };

    if (!body.prospectId || !body.businessName || !body.senderEmail || !body.previewLink) {
      return NextResponse.json(
        { error: "prospectId, businessName, senderEmail and previewLink are required" },
        { status: 400 }
      );
    }

    const row = await createEmailDraft({
      prospectId: body.prospectId,
      businessName: body.businessName,
      city: body.city,
      senderEmail: body.senderEmail,
      previewLink: body.previewLink,
      variant: body.variant ?? "standard"
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Draft generation failed" }, { status: 500 });
  }
}
