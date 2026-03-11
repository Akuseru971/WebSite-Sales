import { NextResponse } from "next/server";

const PHOTO_NAME_REGEX = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

function formatGooglePhotoError(status: number, details: string): string {
  let parsedMessage = "";

  try {
    const parsed = JSON.parse(details) as { error?: { message?: string } };
    parsedMessage = parsed.error?.message || "";
  } catch {
    parsedMessage = details;
  }

  if (status === 403 || /PERMISSION_DENIED|has not been used|disabled/i.test(parsedMessage)) {
    return "Google Places API n'est pas active pour ce projet. Active Places API (New) dans Google Cloud Console et attends quelques minutes.";
  }

  if (status === 401 || /API key|invalid/i.test(parsedMessage)) {
    return "Cle API Google invalide ou non autorisee pour les photos Places.";
  }

  return `Google Place Photo error ${status}. ${parsedMessage || "Erreur inconnue."}`;
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
    const name = (searchParams.get("name") || "").trim();
    const maxWidthPxRaw = Number(searchParams.get("maxWidthPx") || 600);
    const maxWidthPx = Math.max(100, Math.min(1600, Number.isNaN(maxWidthPxRaw) ? 600 : maxWidthPxRaw));

    if (!PHOTO_NAME_REGEX.test(name)) {
      return NextResponse.json({ error: "Photo resource name invalide." }, { status: 400 });
    }

    const mediaUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}`;
    const response = await fetch(mediaUrl, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ error: formatGooglePhotoError(response.status, details) }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = await response.arrayBuffer();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur proxy photo" },
      { status: 500 },
    );
  }
}
