import { NextResponse } from "next/server";

const TYPE_QUERY_MAP: Record<string, string> = {
  restaurant: "restaurant",
  pharmacie: "pharmacy",
  tabac: "tobacco shop",
  coiffeur: "hair salon",
  hotel: "hotel",
  taxi: "taxi service",
  boulangerie: "bakery",
  garage: "car repair",
  tout: "local businesses",
};

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.primaryType",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
  "places.photos",
].join(",");

interface GooglePlacePhoto {
  name?: string;
}

interface GooglePlaceItem {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  photos?: GooglePlacePhoto[];
}

function buildPhotoUrl(photoName?: string): string {
  if (!photoName) return "";
  return `/api/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=720`;
}

function formatGooglePlacesError(status: number, details: string): string {
  let parsedMessage = "";

  try {
    const parsed = JSON.parse(details) as { error?: { message?: string } };
    parsedMessage = parsed.error?.message || "";
  } catch {
    parsedMessage = details;
  }

  if (status === 403 || /PERMISSION_DENIED|has not been used|disabled/i.test(parsedMessage)) {
    return "Google Places API n'est pas active pour ce projet. Active Places API (New) dans Google Cloud Console, verifie la facturation et attends 2-5 minutes.";
  }

  if (status === 401 || /API key|invalid/i.test(parsedMessage)) {
    return "Cle API Google invalide ou non autorisee. Verifie GOOGLE_MAPS_API_KEY et les restrictions de cle.";
  }

  if (status === 429) {
    return "Quota Google Places depasse. Reessaie plus tard ou augmente le quota.";
  }

  return `Google Places error ${status}. ${parsedMessage || "Erreur inconnue."}`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY manquante." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const city = (searchParams.get("city") || "").trim();
    const type = (searchParams.get("type") || "tout").trim().toLowerCase();

    if (!city) {
      return NextResponse.json({ error: "La ville est obligatoire." }, { status: 400 });
    }

    const term = TYPE_QUERY_MAP[type] || TYPE_QUERY_MAP.tout;
    const textQuery = type === "tout" ? `businesses in ${city}` : `${term} in ${city}`;

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify({ textQuery }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: formatGooglePlacesError(response.status, details) }, { status: 500 });
    }

    const payload = (await response.json()) as { places?: GooglePlaceItem[] };
    const places = Array.isArray(payload.places) ? payload.places : [];

    const businesses = places.map((place) => {
      const photoNames = Array.isArray(place.photos)
        ? place.photos.map((photo) => buildPhotoUrl(photo.name)).filter(Boolean)
        : [];

      return {
        id: place.id || "",
        name: place.displayName?.text || "Business",
        category: place.primaryType || "local_business",
        city,
        address: place.formattedAddress || "Adresse non disponible",
        rating: place.rating || 0,
        reviewCount: place.userRatingCount || 0,
        phone: place.nationalPhoneNumber || "",
        website: place.websiteUri || "",
        photoUrl: photoNames[0] || "",
        photos: photoNames,
        mapsUrl: place.googleMapsUri || (place.id ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.id)}` : ""),
        raw: place,
      };
    });

    return NextResponse.json({ city, type, count: businesses.length, businesses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
