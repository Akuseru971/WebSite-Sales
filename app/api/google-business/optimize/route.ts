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

type OptimizationChange = {
  title: string;
  before: string;
  after: string;
  impact: string;
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

const GENERIC_DESCRIPTION_REGEX = /presence locale|orientee conversion|preuve sociale|information est structuree|augmenter les demandes entrantes|fiche claire|version optimisee|optimis/i;
const NON_OPERATIONAL_DESCRIPTION_REGEX = /optimis|version|constat|analyse|audit|fiche|conversion|preuve sociale|bouton/i;

function hasUsableValue(value: string): boolean {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }
  return !/a completer|non disponible|^#$|^-$|non renseigne/i.test(normalized);
}

function buildConcreteOptimizedDescription(params: {
  businessName: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  primaryCta: string;
  secondaryCta: string;
}): string {
  const category = params.category.toLowerCase();
  const city = params.city || "la zone locale";
  const address = hasUsableValue(params.address) ? params.address : `secteur ${city}`;
  const contactSentence = hasUsableValue(params.phone)
    ? `Contact direct au ${params.phone}.`
    : "Contact direct depuis la fiche Google.";
  const webSentence = hasUsableValue(params.website)
    ? `Informations detaillees sur ${params.website}.`
    : "Informations detaillees disponibles par telephone.";

  if (/taxi/.test(category)) {
    return `Taxi VSL conventionne / Reservation taxi urgent / ${city}. ${params.businessName} propose des trajets taxi a ${city} pour gares, aeroport, rendez-vous medicaux et deplacements professionnels, avec prise en charge rapide depuis ${address}. ${contactSentence} ${webSentence}`;
  }

  if (/pharmacy|pharmacie/.test(category)) {
    return `Pharmacie / Conseil / Disponibilite produits / ${city}. ${params.businessName} accompagne les clients a ${city} avec conseil officinal, orientation rapide et preparation des demandes depuis ${address}. ${contactSentence} ${webSentence}`;
  }

  if (/garage|auto|car|repair/.test(category)) {
    return `Garage auto / Diagnostic / Entretien / ${city}. ${params.businessName} intervient a ${city} pour diagnostic, entretien et reparations courantes depuis ${address}. ${contactSentence} ${webSentence}`;
  }

  if (/coiffeur|hair|salon|beauty/.test(category)) {
    return `Salon de coiffure / Rendez-vous / Conseils / ${city}. ${params.businessName} accueille a ${city} pour coupes, techniques et conseils personnalises depuis ${address}. ${contactSentence} ${webSentence}`;
  }

  if (/hotel|hostel|lodging/.test(category)) {
    return `Hotel / Reservation / Accueil voyageurs / ${city}. ${params.businessName} facilite les sejours a ${city} avec informations claires sur l'accueil, les services et l'acces depuis ${address}. ${contactSentence} ${webSentence}`;
  }

  if (/restaurant|food|cafe|bistro|pizza/.test(category)) {
    return `Restaurant / Reservation / Commande / ${city}. ${params.businessName} propose une offre restauration a ${city} avec menu, horaires et modalites de reservation depuis ${address}. ${contactSentence} ${webSentence}`;
  }

  return `${params.category} / Service local / ${city}. ${params.businessName} propose ses prestations a ${city} depuis ${address} avec informations pratiques et contact immediat. ${contactSentence} ${webSentence}`;
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

function normalizeHttpUrl(raw: string): string | undefined {
  const value = String(raw || "").trim();
  if (!value) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (!/^https?:$/i.test(url.protocol)) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function absolutizeImageUrl(url: string, origin: string): string | undefined {
  const trimmed = String(url || "").trim();
  if (!trimmed || trimmed.startsWith("data:")) {
    return undefined;
  }

  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return undefined;
  }
}

function extractWebsiteImageUrls(html: string, pageUrl: string): string[] {
  const srcMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absolutizeImageUrl(match[1], pageUrl))
    .filter((value): value is string => Boolean(value));

  const ogMatches = [...html.matchAll(/property=["']og:image["'][^>]*content=["']([^"']+)["']/gi)]
    .map((match) => absolutizeImageUrl(match[1], pageUrl))
    .filter((value): value is string => Boolean(value));

  return uniqueStrings([
    ...ogMatches,
    ...srcMatches.filter((url) => !/logo|icon|sprite|badge|avatar|favicon|placeholder/i.test(url)),
  ], 16);
}

async function gatherWebsiteImages(websiteUrl: string): Promise<string[]> {
  const normalized = normalizeHttpUrl(websiteUrl);
  if (!normalized) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(normalized, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoogleBusinessOptimizationBot/1.0)",
      },
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    return extractWebsiteImageUrls(html, normalized);
  } catch {
    return [];
  }
}

function buildCategoryImageKeywords(category: string, businessName: string, city: string): string[] {
  const normalizedCategory = category.toLowerCase();

  if (/restaurant|food|cafe|bistro|pizza/.test(normalizedCategory)) {
    return [`${businessName} restaurant`, `restaurant ${city} interieur`, `plat gastronomique`, "service en salle", "terrasse restaurant"];
  }

  if (/pharmacy|pharmacie/.test(normalizedCategory)) {
    return [`${businessName} pharmacie`, `pharmacie ${city} vitrine`, "comptoir pharmacie", "parapharmacie", "service conseil sante"];
  }

  if (/hotel|hostel|lodging/.test(normalizedCategory)) {
    return [`${businessName} hotel`, `hotel ${city} lobby`, "chambre hotel", "petit dejeuner hotel", "accueil hotel"];
  }

  if (/garage|car|repair|auto/.test(normalizedCategory)) {
    return [`${businessName} garage`, `atelier auto ${city}`, "diagnostic vehicule", "mecanique automobile", "service entretien auto"];
  }

  if (/coiffeur|hair|beauty|salon/.test(normalizedCategory)) {
    return [`${businessName} salon`, `salon coiffure ${city}`, "coupe cheveux", "coloration", "accueil salon"];
  }

  return [`${businessName} ${city}`, `${category} ${city}`, `${category} vitrine`, `${category} interieur`, `${category} equipe`];
}

function buildCategoryFallbackImageUrls(params: { category: string; businessName: string; city: string }): string[] {
  const keywords = buildCategoryImageKeywords(params.category, params.businessName, params.city);
  return keywords.slice(0, 8).map((keyword, index) =>
    `https://source.unsplash.com/1600x900/?${encodeURIComponent(keyword)}&sig=${index + 1}`,
  );
}

interface GeneratedImageEntry {
  b64_json?: string;
  url?: string;
}

interface GeneratedImagePayload {
  data?: GeneratedImageEntry[];
}

async function generateBusinessImagesWithAI(params: {
  businessName: string;
  category: string;
  city: string;
  count: number;
}): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || params.count <= 0) {
    return [];
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `Create realistic business marketing photos for a ${params.category} in ${params.city}. No text overlays, no logos, no watermarks. Show storefront, interior, team moments, and product/service context for ${params.businessName}.`,
      size: "1024x1024",
      n: Math.min(4, Math.max(1, params.count)),
    });

    const payload = response as unknown as GeneratedImagePayload;
    const rawImages = Array.isArray(payload.data) ? payload.data : [];
    const dataUrls = rawImages
      .map((item) => {
        if (item.b64_json) {
          return `data:image/png;base64,${item.b64_json}`;
        }
        return item.url || "";
      })
      .filter(Boolean);

    return uniqueStrings(dataUrls, 8);
  } catch {
    return [];
  }
}

function buildOptimizationChanges(current: ApiProfile, optimized: ApiProfile): OptimizationChange[] {
  const changes: OptimizationChange[] = [];

  const asValue = (value: string): string => {
    const normalized = String(value || "").trim();
    return normalized || "Aucun contenu initial";
  };

  const listValue = (values: string[]): string => {
    if (!Array.isArray(values) || values.length === 0) {
      return "Aucun contenu initial";
    }
    return values.join(" | ");
  };

  if (current.description !== optimized.description) {
    changes.push({
      title: "Description business reecrite",
      before: asValue(current.description),
      after: asValue(optimized.description),
      impact: "Message plus clair, orientee intention client et conversion locale.",
    });
  }

  const addedServices = optimized.services.filter((service) => !current.services.includes(service));
  if (addedServices.length > 0) {
    changes.push({
      title: "Services clarifies et completes",
      before: listValue(current.services),
      after: listValue(optimized.services),
      impact: `Mise en avant de ${addedServices.length} service(s) supplementaire(s) qui aident la decision client.`,
    });
  }

  const addedFaq = optimized.faqPairs.filter((faq) =>
    !current.faqPairs.some((existing) => existing.q === faq.q && existing.a === faq.a),
  );
  if (addedFaq.length > 0) {
    changes.push({
      title: "FAQ orientee objections clients",
      before: listValue(current.faqPairs.map((item) => item.q)),
      after: listValue(optimized.faqPairs.map((item) => item.q)),
      impact: "Moins de friction: les questions les plus frequentes sont traitees avant le contact.",
    });
  }

  if ((current.primaryCta || "") !== (optimized.primaryCta || "") || (current.secondaryCta || "") !== (optimized.secondaryCta || "")) {
    changes.push({
      title: "CTA adaptes au secteur",
      before: `${current.primaryCta || "Appeler"} / ${current.secondaryCta || "Demander"}`,
      after: `${optimized.primaryCta || "Appeler"} / ${optimized.secondaryCta || "Demander"}`,
      impact: "Actions plus naturelles pour le client selon le type de business.",
    });
  }

  if (optimized.images.length !== current.images.length) {
    changes.push({
      title: "Portefeuille photo renforce",
      before: `${current.images.length} image(s) exploitable(s)`,
      after: `${optimized.images.length} image(s) exploitable(s)`,
      impact: "Meilleure preuve visuelle pour rassurer et augmenter les clics.",
    });
  }

  if (optimized.rating !== current.rating || optimized.reviewCount !== current.reviewCount) {
    changes.push({
      title: "Projection de performance",
      before: `${current.rating.toFixed(1)} (${current.reviewCount} avis)`,
      after: `${optimized.rating.toFixed(1)} (${optimized.reviewCount} avis)`,
      impact: "Objectif de progression concret apres application du plan de fiche.",
    });
  }

  return changes.slice(0, 8);
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
    description: buildConcreteOptimizedDescription({
      businessName: current.businessName,
      category: current.category,
      city: current.city,
      address: current.address,
      phone: current.phone,
      website: current.website,
      primaryCta: playbook.primaryCta,
      secondaryCta: playbook.secondaryCta,
    }),
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
    description: details?.editorialSummary?.text || "",
    services: [],
    faqPairs: [],
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

  try {
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
                  "Avoid abstract marketing wording (example: presence locale, conversion, preuve sociale)",
                  "Description must include concrete operational details (service type, zone, contact path)",
                  "Description must be publish-ready and must not mention optimization, audit, analysis, buttons, or before/after framing",
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
    const normalizedDescription = parsed.data.optimizedDescription.trim().replace(/\s+/g, " ");
    const description = GENERIC_DESCRIPTION_REGEX.test(normalizedDescription)
      ? buildConcreteOptimizedDescription({
          businessName: current.businessName,
          category: current.category,
          city: current.city,
          address: current.address,
          phone: current.phone,
          website: current.website,
          primaryCta: parsed.data.primaryCta,
          secondaryCta: parsed.data.secondaryCta,
        })
      : normalizedDescription;

    const safeOperationalDescription = NON_OPERATIONAL_DESCRIPTION_REGEX.test(description)
      ? buildConcreteOptimizedDescription({
          businessName: current.businessName,
          category: current.category,
          city: current.city,
          address: current.address,
          phone: current.phone,
          website: current.website,
          primaryCta: parsed.data.primaryCta,
          secondaryCta: parsed.data.secondaryCta,
        })
      : description;

    return {
      ...current,
      rating: projectedRating,
      reviewCount: projectedReviewCount,
      description: safeOperationalDescription,
      services: uniqueStrings(parsed.data.services, 8),
      faqPairs: parsed.data.faqPairs.slice(0, 8),
      priorityActions: uniqueStrings(parsed.data.priorityActions, 8),
      primaryCta: parsed.data.primaryCta,
      secondaryCta: parsed.data.secondaryCta,
      responseTone: parsed.data.responseTone,
      reviewReplyTemplate: parsed.data.reviewReplyTemplate,
    };
  } catch {
    return null;
  }
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

    const inferredName = details?.displayName?.text || incoming.name || "Business";
    const inferredCategory = details?.primaryType || incoming.category || "local_business";
    const inferredCity = incoming.city || "Ville";

    const detailPhotos = Array.isArray(details?.photos)
      ? details!.photos
          .map((photo) => buildPhotoProxyUrl(photo?.name, 1200))
          .filter(Boolean)
      : [];

    const inputPhotos = Array.isArray(incoming.photos) ? incoming.photos : [];
    const websiteImages = await gatherWebsiteImages(details?.websiteUri || incoming.website || "");
    const directImages = uniqueStrings([...detailPhotos, ...inputPhotos, ...websiteImages], 12);

    const aiGeneratedImages = directImages.length >= 4
      ? []
      : await generateBusinessImagesWithAI({
          businessName: inferredName,
          category: inferredCategory,
          city: inferredCity,
          count: Math.max(2, 6 - directImages.length),
        });

    const categoryFallbackImages = directImages.length + aiGeneratedImages.length >= 6
      ? []
      : buildCategoryFallbackImageUrls({
          category: inferredCategory,
          businessName: inferredName,
          city: inferredCity,
        });

    const optimizedImages = uniqueStrings([...directImages, ...aiGeneratedImages, ...categoryFallbackImages], 12);

    const currentProfile = buildCurrentProfile(incoming, details, directImages);
    const aiOptimized = await generateOptimizedWithAI(currentProfile);
    const nextOptimizedProfile = {
      ...(aiOptimized ?? buildFallbackOptimized(currentProfile)),
      images: optimizedImages,
    };
    const changes = buildOptimizationChanges(currentProfile, nextOptimizedProfile);

    const imageSources = uniqueStrings([
      detailPhotos.length > 0 ? "google_places_details" : "",
      inputPhotos.length > 0 ? "search_result_photos" : "",
      websiteImages.length > 0 ? "website_images" : "",
      aiGeneratedImages.length > 0 ? "ai_generated_images" : "",
      categoryFallbackImages.length > 0 ? "category_fallback_library" : "",
    ], 8);

    return NextResponse.json({
      currentProfile,
      optimizedProfile: nextOptimizedProfile,
      changes,
      imageCount: optimizedImages.length,
      currentImageCount: directImages.length,
      optimizedImageCount: optimizedImages.length,
      imageSource: imageSources[0] || "none",
      imageSources,
      aiUsed: Boolean(aiOptimized),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation optimisee impossible." },
      { status: 500 },
    );
  }
}
