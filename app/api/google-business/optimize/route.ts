import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createResponseWithModelFallback } from "@/lib/openai/model-fallback";

const inputSchema = z.object({
  business: z.object({
    id: z.string().trim().optional(),
    name: z.string().trim().optional(),
    category: z.string().trim().optional(),
    city: z.string().trim().optional(),
    rating: z.number().optional(),
    reviewCount: z.number().optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    website: z.string().trim().optional(),
    photos: z.array(z.string().trim()).optional(),
    mapsUrl: z.string().trim().optional(),
  }),
});

const aiOutputSchema = z.object({
  optimizedDescription: z.string().min(60).max(1400),
  services: z.array(z.string().min(3)).min(3).max(8),
  faqPairs: z.array(
    z.object({
      q: z.string().min(5),
      a: z.string().min(8),
    }),
  ).min(3).max(8),
  projectedRating: z.number().min(1).max(5),
  projectedReviewCount: z.number().int().min(0),
  priorityActions: z.array(z.string().min(3)).min(3).max(8),
  primaryCta: z.string().min(3).max(60),
  secondaryCta: z.string().min(3).max(60),
  responseTone: z.string().min(3).max(120),
  reviewReplyTemplate: z.string().min(20).max(400),
});

type ApiProfile = {
  businessName: string;
  category: string;
  city: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  website: string;
  description: string;
  services: string[];
  faqPairs: Array<{ q: string; a: string }>;
  images: string[];
  mapsUrl: string;
  priorityActions?: string[];
  primaryCta?: string;
  secondaryCta?: string;
  responseTone?: string;
  reviewReplyTemplate?: string;
};

interface GooglePhoto {
  name?: string;
}

interface GooglePlaceDetails {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  photos?: GooglePhoto[];
  googleMapsUri?: string;
  editorialSummary?: { text?: string };
}

function uniqueStrings(values: string[], limit = 12): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const next = String(value || "").trim();
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    output.push(next);
    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function buildPhotoProxyUrl(photoName?: string, maxWidthPx = 1200): string {
  if (!photoName) return "";
  return `/api/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidthPx}`;
}

function defaultCurrentDescription(name: string, city: string): string {
  return `${name} est visible sur Google a ${city}. Cette vue reprend l'etat actuel de la fiche avant optimisation.`;
}

function defaultOptimizedDescription(name: string, city: string): string {
  return `${name} presente une fiche plus claire et orientee conversion locale a ${city}. Les informations essentielles, les visuels reels et les points de confiance sont renforces pour augmenter les contacts entrants.`;
}

function buildCategoryPlaybook(rawCategory: string): {
  primaryCta: string;
  secondaryCta: string;
  serviceFocus: string[];
  faqFocus: string[];
  responseTone: string;
} {
  const category = rawCategory.toLowerCase();

  if (/restaurant|food|cafe|bistro|pizza/.test(category)) {
    return {
      primaryCta: "Reserver une table",
      secondaryCta: "Commander",
      serviceFocus: ["reservation", "vente a emporter", "horaires de service"],
      faqFocus: ["allergenes", "menu", "reservation"],
      responseTone: "chaleureux, rapide, orientee hospitalite",
    };
  }

  if (/pharmacy|pharmacie|medical|dentist|doctor/.test(category)) {
    return {
      primaryCta: "Appeler la pharmacie",
      secondaryCta: "Voir l'itineraire",
      serviceFocus: ["conseil", "disponibilite", "acces"],
      faqFocus: ["horaires", "ordonnance", "services de garde"],
      responseTone: "rassurant, clair, professionnel",
    };
  }

  if (/hotel|hostel|lodging/.test(category)) {
    return {
      primaryCta: "Verifier les disponibilites",
      secondaryCta: "Reserver maintenant",
      serviceFocus: ["reservation", "equipements", "localisation"],
      faqFocus: ["arrivee depart", "parking", "services inclus"],
      responseTone: "premium, accueillant, orientee sejour",
    };
  }

  if (/garage|car|repair|auto/.test(category)) {
    return {
      primaryCta: "Demander un devis",
      secondaryCta: "Prendre rendez-vous",
      serviceFocus: ["diagnostic", "devis", "delais"],
      faqFocus: ["tarifs", "prise en charge", "rendez-vous"],
      responseTone: "fiable, transparent, orientee resultat",
    };
  }

  if (/coiffeur|hair|beauty|salon/.test(category)) {
    return {
      primaryCta: "Prendre rendez-vous",
      secondaryCta: "Appeler le salon",
      serviceFocus: ["rendez-vous", "prestations", "resultats"],
      faqFocus: ["tarifs", "disponibilites", "conseils"],
      responseTone: "soigne, bienveillant, orientee experience",
    };
  }

  return {
    primaryCta: "Appeler maintenant",
    secondaryCta: "Demander des informations",
    serviceFocus: ["contact rapide", "informations claires", "disponibilites"],
    faqFocus: ["horaires", "contact", "prestations"],
    responseTone: "professionnel, clair, orientee aide",
  };
}

function buildFallbackOptimized(current: ApiProfile): ApiProfile {
  const projectedRating = Math.min(5, Number((current.rating + 0.2).toFixed(1)));
  const projectedReviewCount = current.reviewCount + Math.max(12, Math.round(current.reviewCount * 0.18));
  const playbook = buildCategoryPlaybook(current.category);

  const services = uniqueStrings([
    ...current.services,
    "Reponse rapide aux demandes clients",
    "Mise a jour hebdomadaire de la fiche",
    "Mise en avant des informations utiles",
  ], 8);

  const faqPairs = [
    ...current.faqPairs,
    {
      q: "Comment obtenir une reponse rapide ?",
      a: "Le contact principal est affiche clairement avec des appels a l'action visibles.",
    },
    {
      q: "Les informations sont-elles a jour ?",
      a: "Les horaires, le telephone et les points forts sont revus regulierement.",
    },
  ].slice(0, 6);

  return {
    ...current,
    rating: projectedRating,
    reviewCount: projectedReviewCount,
    description: defaultOptimizedDescription(current.businessName, current.city),
    services,
    faqPairs,
    priorityActions: [
      "Publier de nouvelles photos chaque semaine",
      "Repondre a tous les avis sous 24h",
      "Renforcer la description avec la proposition de valeur locale",
    ],
    primaryCta: playbook.primaryCta,
    secondaryCta: playbook.secondaryCta,
    responseTone: playbook.responseTone,
    reviewReplyTemplate: `Merci pour votre retour. Toute l'equipe de ${current.businessName} vous remercie et reste disponible pour vous accompagner rapidement.`,
  };
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails | null> {
  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "primaryType",
    "rating",
    "userRatingCount",
    "websiteUri",
    "nationalPhoneNumber",
    "photos",
    "googleMapsUri",
    "editorialSummary",
  ].join(",");

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  return await response.json() as GooglePlaceDetails;
}

function buildCurrentProfile(input: z.infer<typeof inputSchema>["business"], details: GooglePlaceDetails | null, images: string[]): ApiProfile {
  const businessName = details?.displayName?.text || input.name || "Business";
  const category = details?.primaryType || input.category || "local_business";
  const city = input.city || "Ville";
  const rating = Math.max(1, Math.min(5, Number(details?.rating ?? input.rating ?? 4.2)));
  const reviewCount = Math.max(0, Math.round(Number(details?.userRatingCount ?? input.reviewCount ?? 0)));
  const address = details?.formattedAddress || input.address || "Adresse non disponible";
  const phone = details?.nationalPhoneNumber || input.phone || "Telephone a completer";
  const website = details?.websiteUri || input.website || "#";
  const mapsUrl = details?.googleMapsUri || input.mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  const playbook = buildCategoryPlaybook(category);

  return {
    businessName,
    category,
    city,
    rating,
    reviewCount,
    address,
    phone,
    website,
    description: details?.editorialSummary?.text || defaultCurrentDescription(businessName, city),
    services: [
      "Information principale visible",
      phone && !/a completer/i.test(phone) ? "Contact telephonique present" : "Contact telephonique incomplet",
      website && website !== "#" ? "Lien vers site web present" : "Lien vers site web a completer",
    ],
    faqPairs: [
      { q: "Quels sont les horaires ?", a: "Les horaires sont a verifier sur la fiche Google." },
      { q: "Comment contacter l'etablissement ?", a: phone },
      { q: "Ou se situe l'etablissement ?", a: address },
    ],
    images,
    mapsUrl,
    primaryCta: playbook.primaryCta,
    secondaryCta: playbook.secondaryCta,
    responseTone: playbook.responseTone,
    reviewReplyTemplate: `Merci pour votre avis. Nous sommes heureux de vous accompagner et restons disponibles pour toute question complementaire.`,
  };
}

async function generateOptimizedWithAI(current: ApiProfile): Promise<ApiProfile | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const playbook = buildCategoryPlaybook(current.category);

  const response = await createResponseWithModelFallback(openai, {
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You optimize Google Business profile content for local businesses. Return strict JSON only. Keep claims realistic, no fabricated facts, and write concise French copy. Make the output category-aware and conversion-oriented.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              task: "Generate an optimized future version of this Google Business profile.",
              constraints: [
                "French language",
                "Do not invent certifications or legal claims",
                "Services must stay generic and safe",
                "FAQ must answer practical customer intent",
                "Projected rating gain must remain realistic",
                "Primary and secondary CTAs must fit the category",
                "Response tone must match local business expectations",
                "Review reply template must be reusable and polite",
              ],
              playbook,
              current,
            }),
          },
        ],
      },
    ],
    text: { format: { type: "json_object" } },
  });

  const raw = response.output_text?.trim();
  if (!raw) {
    return null;
  }

  const parsed = aiOutputSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return null;
  }

  const projectedRating = Math.max(current.rating, Math.min(5, Number(parsed.data.projectedRating.toFixed(1))));
  const projectedReviewCount = Math.max(current.reviewCount, parsed.data.projectedReviewCount);

  return {
    ...current,
    rating: projectedRating,
    reviewCount: projectedReviewCount,
    description: parsed.data.optimizedDescription,
    services: uniqueStrings(parsed.data.services, 8),
    faqPairs: parsed.data.faqPairs.slice(0, 8),
    priorityActions: uniqueStrings(parsed.data.priorityActions, 8),
    primaryCta: parsed.data.primaryCta,
    secondaryCta: parsed.data.secondaryCta,
    responseTone: parsed.data.responseTone,
    reviewReplyTemplate: parsed.data.reviewReplyTemplate,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedInput = inputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    const incoming = parsedInput.data.business;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    let details: GooglePlaceDetails | null = null;
    if (incoming.id && apiKey) {
      details = await fetchPlaceDetails(incoming.id, apiKey);
    }

    const detailPhotos = Array.isArray(details?.photos)
      ? details!.photos
          .map((photo) => buildPhotoProxyUrl(photo?.name, 1200))
          .filter(Boolean)
      : [];

    const inputPhotos = Array.isArray(incoming.photos) ? incoming.photos : [];
    const images = uniqueStrings([...detailPhotos, ...inputPhotos], 12);

    const currentProfile = buildCurrentProfile(incoming, details, images);
    const aiOptimized = await generateOptimizedWithAI(currentProfile);
    const optimizedProfile = aiOptimized ?? buildFallbackOptimized(currentProfile);

    return NextResponse.json({
      currentProfile,
      optimizedProfile,
      imageCount: images.length,
      imageSource: detailPhotos.length > 0 ? "google_places_details" : "search_result_photos",
      aiUsed: Boolean(aiOptimized),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation optimisee impossible." },
      { status: 500 },
    );
  }
}
