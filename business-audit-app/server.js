const express = require("express");
const path = require("path");
require("dotenv").config();
const {
  callGooglePlaceDetails,
  callGooglePlacesSearch,
  validatePhotoResourceName,
} = require("./services/googlePlaces");

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";
const businessCache = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function requireApiKey(res) {
  if (!API_KEY) {
    res.status(500).json({ error: "GOOGLE_MAPS_API_KEY manquante dans .env" });
    return false;
  }
  return true;
}

app.get("/api/search", async (req, res) => {
  if (!requireApiKey(res)) return;

  try {
    const city = String(req.query.city || "").trim();
    const type = req.query.type || "tout";

    if (!city) {
      res.status(400).json({ error: "La ville est obligatoire." });
      return;
    }

    const businesses = await callGooglePlacesSearch(city, type, API_KEY);

    businesses.forEach((business) => {
      if (business.id) {
        businessCache.set(business.id, business);
      }
    });

    res.json({
      city,
      type,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur interne serveur",
    });
  }
});

app.get("/api/business/:id", async (req, res) => {
  if (!requireApiKey(res)) return;

  try {
    const placeId = String(req.params.id || "").trim();
    const city = String(req.query.city || "").trim();

    if (!placeId) {
      res.status(400).json({ error: "ID business manquant." });
      return;
    }

    if (businessCache.has(placeId)) {
      res.json({ business: businessCache.get(placeId) });
      return;
    }

    const business = await callGooglePlaceDetails(placeId, city || "Ville", API_KEY);
    businessCache.set(placeId, business);
    res.json({ business });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur details business",
    });
  }
});

app.get("/api/photo", async (req, res) => {
  if (!requireApiKey(res)) return;

  try {
    const name = String(req.query.name || "").trim();
    const maxWidthPx = Number(req.query.maxWidthPx || 600);

    if (!validatePhotoResourceName(name)) {
      res.status(400).json({ error: "Photo resource name invalide." });
      return;
    }

    const width = Math.min(1200, Math.max(100, Number.isNaN(maxWidthPx) ? 600 : maxWidthPx));

    const response = await fetch(`${GOOGLE_PLACES_BASE}/${name}/media?maxWidthPx=${width}`, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": API_KEY,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      const message = await response.text();
      res.status(response.status).json({ error: `Erreur photo Google Places: ${message}` });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur proxy photo",
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Business audit app running on http://localhost:${PORT}`);
});
