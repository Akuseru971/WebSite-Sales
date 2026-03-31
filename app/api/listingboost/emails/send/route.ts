import { NextResponse } from "next/server";
import { sendDraftEmail } from "@/lib/listingboost/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      outboundEmailId?: string;
      toEmail?: string;
      subject?: string;
      body?: string;
      fromEmail?: string;
    };

    if (!body.outboundEmailId || !body.toEmail || !body.subject || !body.body || !body.fromEmail) {
      return NextResponse.json(
        { error: "outboundEmailId, toEmail, subject, body and fromEmail are required" },
        { status: 400 }
      );
    }

    const row = await sendDraftEmail({
      outboundEmailId: body.outboundEmailId,
      toEmail: body.toEmail,
      subject: body.subject,
      body: body.body,
      fromEmail: body.fromEmail
    });

    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
}
