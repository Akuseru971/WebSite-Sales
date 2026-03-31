import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/listingboost/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const ok = await createAdminSession(body.email ?? "", body.password ?? "");

    if (!ok) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 });
  }
}
