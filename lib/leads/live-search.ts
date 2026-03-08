import type { BusinessCategory } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/types";

interface NominatimResult {
  boundingbox: [string, string, string, string];
  display_name: string;
}

interface OverpassElement {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface TagRule {
  key: string;
  value: string;
}

const categoryRules: Record<BusinessCategory, TagRule[]> = {
  taxi: [{ key: "amenity", value: "taxi" }],
  restaurant: [
    { key: "amenity", value: "restaurant" },
    { key: "amenity", value: "fast_food" },
    { key: "amenity", value: "cafe" }
  ],
  hotel: [
    { key: "tourism", value: "hotel" },
    { key: "tourism", value: "guest_house" },
    { key: "tourism", value: "hostel" }
  ],
  real_estate: [{ key: "office", value: "estate_agent" }]
};

function getUserAgent(): string {
  return process.env.LEADS_SEARCH_USER_AGENT ?? "website-sales/1.0";
}

function getNominatimUrl(): string {
  return process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
}

function getOverpassUrl(): string {
  return process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";
}

function safeName(tags: Record<string, string> | undefined, category: BusinessCategory, fallbackId: string): string {
  const value = tags?.name?.trim();
  if (value) {
    return value;
  }

  return `${category}-${fallbackId}`;
}

function getLatLon(element: OverpassElement): { lat?: number; lon?: number } {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }

  if (element.center && typeof element.center.lat === "number" && typeof element.center.lon === "number") {
    return { lat: element.center.lat, lon: element.center.lon };
  }

  return {};
}

function buildOverpassQuery(params: {
  bbox: { south: number; west: number; north: number; east: number };
  categories: BusinessCategory[];
}): string {
  const { bbox, categories } = params;
  const bboxClause = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;

  const lines = categories.flatMap((category) => {
    const rules = categoryRules[category] ?? [];
    return rules.map((rule) => `nwr["${rule.key}"="${rule.value}"]${bboxClause};`);
  });

  return `[out:json][timeout:25];\n(\n${lines.join("\n")}\n);\nout center;`;
}

async function geocodeCity(city: string, country: string): Promise<NominatimResult> {
  const url = new URL("/search", getNominatimUrl());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", `${city}, ${country}`);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": getUserAgent(),
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const payload = (await response.json()) as NominatimResult[];
  if (!payload.length) {
    throw new Error("City not found.");
  }

  return payload[0];
}

async function overpassSearch(query: string): Promise<OverpassResponse> {
  const response = await fetch(getOverpassUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": getUserAgent(),
      Accept: "application/json"
    },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status}`);
  }

  return (await response.json()) as OverpassResponse;
}

function detectCategory(tags: Record<string, string> | undefined): BusinessCategory | null {
  if (!tags) {
    return null;
  }

  if (tags.amenity === "taxi") {
    return "taxi";
  }

  if (tags.amenity === "restaurant" || tags.amenity === "fast_food" || tags.amenity === "cafe") {
    return "restaurant";
  }

  if (tags.tourism === "hotel" || tags.tourism === "guest_house" || tags.tourism === "hostel") {
    return "hotel";
  }

  if (tags.office === "estate_agent") {
    return "real_estate";
  }

  return null;
}

function dedupeLeads(leads: CommerceLead[]): CommerceLead[] {
  const seen = new Set<string>();
  const result: CommerceLead[] = [];

  for (const lead of leads) {
    const key = `${lead.category}|${lead.businessName.toLowerCase()}|${lead.latitude ?? ""}|${lead.longitude ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(lead);
  }

  return result;
}

export async function searchCommerceLeads(params: {
  city: string;
  categories: BusinessCategory[];
  country?: string;
  limitPerCategory?: number;
}): Promise<CommerceLead[]> {
  const city = params.city.trim();
  if (!city) {
    throw new Error("City is required.");
  }

  if (!params.categories.length) {
    return [];
  }

  const country = params.country?.trim() || "France";
  const nominatim = await geocodeCity(city, country);
  const [south, north, west, east] = nominatim.boundingbox.map((value) => Number(value));

  const query = buildOverpassQuery({
    bbox: { south, west, north, east },
    categories: params.categories
  });

  const overpassPayload = await overpassSearch(query);
  const allLeads = overpassPayload.elements
    .map((element) => {
      const category = detectCategory(element.tags);
      if (!category || !params.categories.includes(category)) {
        return null;
      }

      const { lat, lon } = getLatLon(element);
      const name = safeName(element.tags, category, String(element.id));

      const lead: CommerceLead = {
        id: `${category}-${element.type}-${element.id}`,
        businessName: name,
        category,
        city,
        address: [
          element.tags?.["addr:housenumber"],
          element.tags?.["addr:street"]
        ]
          .filter(Boolean)
          .join(" ") || undefined,
        postcode: element.tags?.["addr:postcode"],
        country: element.tags?.["addr:country"] ?? country,
        district:
          element.tags?.["addr:suburb"] ??
          element.tags?.["addr:city_district"] ??
          element.tags?.["addr:neighbourhood"],
        phone: element.tags?.phone ?? element.tags?.["contact:phone"],
        website: element.tags?.website ?? element.tags?.["contact:website"],
        email: element.tags?.email ?? element.tags?.["contact:email"],
        openingHours: element.tags?.opening_hours,
        description: element.tags?.description,
        latitude: lat,
        longitude: lon,
        source: "openstreetmap"
      };

      return lead;
    })
    .filter((lead): lead is CommerceLead => Boolean(lead));

  const deduped = dedupeLeads(allLeads);
  const limitPerCategory = params.limitPerCategory ?? 30;

  const byCategory = deduped.reduce<Record<BusinessCategory, CommerceLead[]>>(
    (acc, lead) => {
      acc[lead.category].push(lead);
      return acc;
    },
    {
      taxi: [],
      restaurant: [],
      hotel: [],
      real_estate: []
    }
  );

  const limited = params.categories.flatMap((category) => byCategory[category].slice(0, limitPerCategory));
  return limited;
}
