import { NextResponse } from "next/server";
import type { BusinessCategory } from "@/lib/demo-sites/types";
import { searchCommerceLeads } from "@/lib/leads/live-search";

const allowedCategories = new Set<BusinessCategory>([
  "taxi",
  "restaurant",
  "hotel",
  "real_estate"
]);

interface SearchBody {
  city?: string;
  categories?: BusinessCategory[];
  country?: string;
  limitPerCategory?: number;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchBody;
    const city = typeof body.city === "string" ? body.city.trim() : "";

    if (!city) {
      return NextResponse.json({ error: "city is required" }, { status: 400 });
    }

    const categories = Array.isArray(body.categories)
      ? body.categories.filter((value): value is BusinessCategory => allowedCategories.has(value))
      : [];

    const normalizedCategories: BusinessCategory[] = categories.length
      ? categories
      : ["taxi", "restaurant", "hotel", "real_estate"];

    const leads = await searchCommerceLeads({
      city,
      categories: normalizedCategories,
      country: body.country,
      limitPerCategory:
        typeof body.limitPerCategory === "number" && body.limitPerCategory > 0
          ? Math.min(100, body.limitPerCategory)
          : 30
    });

    return NextResponse.json({
      city,
      categories: normalizedCategories,
      count: leads.length,
      leads
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search commerces"
      },
      { status: 500 }
    );
  }
}
