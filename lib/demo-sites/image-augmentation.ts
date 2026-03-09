import type { BusinessCategory } from "@/lib/demo-sites/types";

export type WebsiteImageRole =
  | "logo"
  | "hero"
  | "food"
  | "menu_item"
  | "dining_room"
  | "interior"
  | "room"
  | "suite"
  | "bathroom"
  | "amenity"
  | "transport"
  | "vehicle"
  | "property_exterior"
  | "property_interior"
  | "gallery"
  | "team"
  | "decorative"
  | "unknown";

export interface WebsiteVisualImage {
  url: string;
  role: WebsiteImageRole;
  sourceType: "source" | "fallback";
  sectionId: string;
  origin: string;
  alt?: string;
}

const curatedFallbackByCategory: Record<BusinessCategory, Partial<Record<WebsiteImageRole, string[]>>> = {
  restaurant: {
    hero: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1800&q=80",
    ],
    food: [
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
    ],
    menu_item: [
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80",
    ],
    dining_room: [
      "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80",
    ],
    interior: [
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=1400&q=80",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80",
    ],
  },
  hotel: {
    hero: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80",
    ],
    room: [
      "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1400&q=80",
    ],
    suite: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
    ],
    bathroom: [
      "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1400&q=80",
    ],
    amenity: [
      "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1400&q=80",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80",
    ],
  },
  taxi: {
    hero: [
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1800&q=80",
    ],
    vehicle: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    ],
    transport: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
    ],
  },
  real_estate: {
    hero: [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=80",
    ],
    property_exterior: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
    ],
    property_interior: [
      "https://images.unsplash.com/photo-1616594039964-4f89f7f0f5ac?auto=format&fit=crop&w=1400&q=80",
    ],
    gallery: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
    ],
  },
};

function uniqueByUrl(images: WebsiteVisualImage[]): WebsiteVisualImage[] {
  const seen = new Set<string>();
  const output: WebsiteVisualImage[] = [];
  images.forEach((image) => {
    if (!image.url || seen.has(image.url)) {
      return;
    }
    seen.add(image.url);
    output.push(image);
  });
  return output;
}

export function classifyImageRole(params: { url: string; alt?: string; sectionId?: string }): WebsiteImageRole {
  const bag = `${params.url} ${params.alt ?? ""} ${params.sectionId ?? ""}`.toLowerCase();
  if (/logo|brand/.test(bag)) return "logo";
  if (/hero|cover|banner/.test(bag)) return "hero";
  if (/food|dish|plate|dessert|cocktail|menu/.test(bag)) return "food";
  if (/dining|table|restaurant|interior/.test(bag)) return "dining_room";
  if (/room|suite|bedroom/.test(bag)) return "room";
  if (/bath|bathroom/.test(bag)) return "bathroom";
  if (/spa|pool|gym|amenity/.test(bag)) return "amenity";
  if (/taxi|transport|transfer|car|vehicle/.test(bag)) return "vehicle";
  if (/property|house|home|villa|exterior/.test(bag)) return "property_exterior";
  return "gallery";
}

export function getFallbackImagesForSection(params: {
  category: BusinessCategory;
  sectionId: string;
  preferredRoles: WebsiteImageRole[];
  limit: number;
}): WebsiteVisualImage[] {
  const map = curatedFallbackByCategory[params.category] ?? {};
  const collected: WebsiteVisualImage[] = [];

  params.preferredRoles.forEach((role) => {
    const urls = map[role] ?? [];
    urls.forEach((url) => {
      collected.push({
        url,
        role,
        sourceType: "fallback",
        sectionId: params.sectionId,
        origin: "curated-library",
      });
    });
  });

  if (!collected.length && map.gallery?.length) {
    map.gallery.forEach((url) => {
      collected.push({
        url,
        role: "gallery",
        sourceType: "fallback",
        sectionId: params.sectionId,
        origin: "curated-library",
      });
    });
  }

  return uniqueByUrl(collected).slice(0, params.limit);
}

export function mergeSourceAndFallbackImages(params: {
  sourceImages: WebsiteVisualImage[];
  fallbackImages: WebsiteVisualImage[];
  minRequired: number;
  maxTotal: number;
}): WebsiteVisualImage[] {
  const source = uniqueByUrl(params.sourceImages);
  if (source.length >= params.minRequired) {
    return source.slice(0, params.maxTotal);
  }

  const merged = uniqueByUrl([...source, ...params.fallbackImages]);
  return merged.slice(0, params.maxTotal);
}

export function getSectionImages(params: {
  assets: WebsiteVisualImage[];
  sectionId: string;
  preferredRoles?: WebsiteImageRole[];
  limit?: number;
}): WebsiteVisualImage[] {
  const limit = params.limit ?? 8;
  const preferred = params.preferredRoles ?? [];

  const bySection = params.assets.filter((asset) => asset.sectionId === params.sectionId);
  if (!preferred.length) {
    return bySection.slice(0, limit);
  }

  const prioritized = [
    ...bySection.filter((asset) => preferred.includes(asset.role)),
    ...bySection.filter((asset) => !preferred.includes(asset.role)),
  ];

  return uniqueByUrl(prioritized).slice(0, limit);
}

export function augmentImagePoolForCategory(params: {
  category: BusinessCategory;
  sourceUrls: string[];
  minimumCount: number;
  sectionId?: string;
}): string[] {
  const sectionId = params.sectionId ?? "generic";
  const sourceAssets = params.sourceUrls.map((url) => ({
    url,
    role: classifyImageRole({ url, sectionId }),
    sourceType: "source" as const,
    sectionId,
    origin: "source",
  }));

  const fallback = getFallbackImagesForSection({
    category: params.category,
    sectionId,
    preferredRoles: ["hero", "gallery", "food", "interior", "room", "property_interior", "vehicle"],
    limit: Math.max(params.minimumCount, 12),
  });

  return mergeSourceAndFallbackImages({
    sourceImages: sourceAssets,
    fallbackImages: fallback,
    minRequired: params.minimumCount,
    maxTotal: Math.max(params.minimumCount + 6, 12),
  }).map((asset) => asset.url);
}
