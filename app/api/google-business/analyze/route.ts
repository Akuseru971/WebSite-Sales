import { NextResponse } from "next/server";

const PHONE_REGEX = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const ADDRESS_HINT_REGEX = /(rue|avenue|av\.|boulevard|bd|place|impasse|route|street|road|rd|zip|code postal|\d{5})/i;

function normalizeInputUrl(raw: string): string {
  const value = raw.trim();
  if (!value) {
    throw new Error("URL manquante.");
  }
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("Seules les URLs http/https sont supportées.");
  }
  return parsed.toString();
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(input: string): string {
  return cleanText(input.replace(/<[^>]*>/g, " "));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pickFirstMatch(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeEntities(cleanText(match[1]));
    }
  }
  return undefined;
}

function absolutizeImageUrl(url: string, origin: string): string | undefined {
  const trimmed = cleanText(url);
  if (!trimmed || trimmed.startsWith("data:")) {
    return undefined;
  }

  try {
    return new URL(trimmed, origin).toString();
  } catch {
    return undefined;
  }
}

function extractImages(html: string, pageUrl: string): string[] {
  const srcMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absolutizeImageUrl(match[1], pageUrl))
    .filter((value): value is string => Boolean(value));

  const ogImage = pickFirstMatch(html, [/property=["']og:image["'][^>]*content=["']([^"']+)["']/i]);
  const absoluteOg = ogImage ? absolutizeImageUrl(ogImage, pageUrl) : undefined;

  const merged = [...(absoluteOg ? [absoluteOg] : []), ...srcMatches];
  const unique = [...new Set(merged)].filter((url) => !/logo|icon|sprite|avatar|badge/i.test(url));
  return unique.slice(0, 6);
}

function extractParagraphs(html: string): string[] {
  const body = pickFirstMatch(html, [/<body[^>]*>([\s\S]*?)<\/body>/i]) ?? html;
  const withoutScripts = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const paragraphs = [...withoutScripts.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((line) => line.length > 45);

  return paragraphs.slice(0, 8);
}

function inferAddress(candidates: string[]): string | undefined {
  return candidates.find((line) => ADDRESS_HINT_REGEX.test(line));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const targetUrl = normalizeInputUrl(body.url ?? "");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoogleBusinessSimulationBot/1.0)",
      },
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json({ error: `Impossible de charger la page (${response.status}).` }, { status: 400 });
    }

    const html = await response.text();

    const title = pickFirstMatch(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const description = pickFirstMatch(html, [
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    ]);

    const textCandidates = extractParagraphs(html);
    const phoneCandidates = [...new Set((html.match(PHONE_REGEX) ?? []).map((v) => cleanText(v)))];
    const addressCandidate = inferAddress(textCandidates);
    const images = extractImages(html, targetUrl);

    return NextResponse.json({
      extracted: {
        website: targetUrl,
        businessName: title ?? "Nom de l'etablissement",
        category: "Etablissement local",
        city: "Ville a verifier",
        description: description ?? textCandidates[0] ?? "Description a renseigner",
        address: addressCandidate ?? "Adresse a completer",
        phone: phoneCandidates[0] ?? "Telephone a completer",
        services: textCandidates.slice(1, 4),
        faq: [
          "Quels sont les horaires ?|Horaires a confirmer.",
          "Comment reserver ?|Reservation a confirmer.",
        ],
        images,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyse de page impossible." },
      { status: 500 },
    );
  }
}
