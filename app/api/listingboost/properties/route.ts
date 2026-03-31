import { NextResponse } from "next/server";
import { createProperty, listProperties } from "@/lib/listingboost/repository";
import { toPropertyInsert } from "@/lib/listingboost/mappers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await listProperties();
    return NextResponse.json({ count: rows.length, data: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list properties" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const row = await createProperty(toPropertyInsert(body));
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create property" }, { status: 400 });
  }
}
