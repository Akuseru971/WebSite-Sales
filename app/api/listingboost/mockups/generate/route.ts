import { NextResponse } from "next/server";
import { generateMockup } from "@/lib/listingboost/mockup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      propertyId?: string;
      businessName?: string;
      imageUrls?: string[];
      category?: string;
      address?: string;
      description?: string;
      theme?: "light" | "dark";
    };

    if (!body.propertyId || !body.businessName) {
      return NextResponse.json({ error: "propertyId and businessName are required" }, { status: 400 });
    }

    const result = await generateMockup({
      propertyId: body.propertyId,
      businessName: body.businessName,
      imageUrls: body.imageUrls ?? [],
      category: body.category,
      address: body.address,
      description: body.description,
      theme: body.theme ?? "light"
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mockup generation failed" }, { status: 500 });
  }
}
