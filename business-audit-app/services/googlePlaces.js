const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";

const TYPE_QUERY_MAP = {
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

function normalizeType(type) {
  return String(type || "tout").trim().toLowerCase();
}

function queryForType(type, city) {
  const normalizedType = normalizeType(type);
  const queryTerm = TYPE_QUERY_MAP[normalizedType] || TYPE_QUERY_MAP.tout;

  if (normalizedType === "tout") {
    return `businesses in ${city}`;
  }

  return `${queryTerm} in ${city}`;
}

function buildPhotoProxyUrl(photoName, maxWidthPx = 600) {
  if (!photoName) return "";
  return `/api/photo?name=${encodeURIComponent(photoName)}&maxWidthPx=${encodeURIComponent(String(maxWidthPx))}`;
}

function normalizeBusiness(place, city) {
  const photos = Array.isArray(place.photos)
    ? place.photos
        .map((photo) => buildPhotoProxyUrl(photo && photo.name ? photo.name : "", 900))
        .filter(Boolean)
    : [];

  return {
    id: place.id || "",
    name: (place.displayName && place.displayName.text) || "Business",
    category: place.primaryType || "local_business",
    city,
    address: place.formattedAddress || "Adresse non disponible",
    rating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    phone: place.nationalPhoneNumber || "",
    website: place.websiteUri || "",
    photoUrl: photos[0] || "",
    photos,
    raw: place,
  };
}

async function callGooglePlacesSearch(city, type, apiKey) {
  const textQuery = queryForType(type, city);
  const response = await fetch(`${GOOGLE_PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.primaryType",
        "places.rating",
        "places.userRatingCount",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.photos",
      ].join(","),
    },
    body: JSON.stringify({ textQuery }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places Search error: ${response.status} ${message}`);
  }

  const payload = await response.json();
  const places = Array.isArray(payload.places) ? payload.places : [];
  return places.map((place) => normalizeBusiness(place, city));
}

async function callGooglePlaceDetails(placeId, city, apiKey) {
  const response = await fetch(`${GOOGLE_PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "id",
        "displayName",
        "formattedAddress",
        "primaryType",
        "rating",
        "userRatingCount",
        "websiteUri",
        "nationalPhoneNumber",
        "photos",
      ].join(","),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Place Details error: ${response.status} ${message}`);
  }

  const place = await response.json();
  return normalizeBusiness(place, city);
}

function validatePhotoResourceName(name) {
  return /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(String(name || ""));
}

module.exports = {
  TYPE_QUERY_MAP,
  buildPhotoProxyUrl,
  callGooglePlacesSearch,
  callGooglePlaceDetails,
  normalizeType,
  queryForType,
  validatePhotoResourceName,
};
