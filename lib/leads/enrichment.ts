import type { CommerceLead } from "./types";
import type { LocaleProfile } from "@/lib/i18n/locale";
import { inferLocaleProfile } from "@/lib/i18n/locale";

interface WebsiteExtraction {
  sourceUrl: string;
  pageTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  images: string[];
  menuHints: string[];
  textSnippet?: string;
}

export interface EnrichedCommerceLead {
  lead: CommerceLead;
  locale: LocaleProfile;
  websiteData?: WebsiteExtraction;
  inferredDescription?: string;
  inferredMenuItems: string[];
  suggestedImages: string[];
}

function fallbackDescription(lead: CommerceLead, locale: LocaleProfile): string {
  switch (locale.language) {
    case "fr":
      return `${lead.businessName} est un commerce ${lead.category.replace("_", " ")} situe a ${lead.city}.`;
    case "es":
      return `${lead.businessName} es un negocio de ${lead.category.replace("_", " ")} en ${lead.city}.`;
    case "de":
      return `${lead.businessName} ist ein ${lead.category.replace("_", " ")}-Unternehmen in ${lead.city}.`;
    case "it":
      return `${lead.businessName} e un'attivita ${lead.category.replace("_", " ")} a ${lead.city}.`;
    case "pt":
      return `${lead.businessName} e um negocio de ${lead.category.replace("_", " ")} em ${lead.city}.`;
    case "nl":
      return `${lead.businessName} is een ${lead.category.replace("_", " ")}-bedrijf in ${lead.city}.`;
    case "en":
    default:
      return `${lead.businessName} is a ${lead.category.replace("_", " ")} business in ${lead.city}.`;
  }
}

function getTimeoutMs(): number {
  const raw = process.env.WEBSITE_FETCH_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 1000) {
    return parsed;
  }

  return 12000;
}

function normalizeWebsiteUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.toString();
  } catch {
    return null;
  }
}

function extractMeta(html: string, metaName: string): string | undefined {
  const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${metaName}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim();
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(sourceUrl: string, maybeUrl: string): string | null {
  try {
    return new URL(maybeUrl, sourceUrl).toString();
  } catch {
    return null;
  }
}

function extractImageUrls(sourceUrl: string, html: string): string[] {
  const urls = new Set<string>();
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(html)) !== null) {
    const absolute = toAbsoluteUrl(sourceUrl, match[1]);
    if (!absolute) {
      continue;
    }

    if (/\.(jpg|jpeg|png|webp|avif)/i.test(absolute)) {
      urls.add(absolute);
    }

    if (urls.size >= 12) {
      break;
    }
  }

  return Array.from(urls);
}

function extractMenuHints(text: string): string[] {
  const lines = text
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const hints = lines.filter((line) => {
    const hasPrice = /(?:\d+[.,]\d{2}\s?(?:€|eur|usd|\$)|(?:€|\$)\s?\d+)/i.test(line);
    const hasMenuWord = /(menu|plat|dish|starter|dessert|pizza|burger|pasta|cocktail|wine|vin)/i.test(line);
    return hasPrice || hasMenuWord;
  });

  return hints.slice(0, 12);
}

async function extractWebsiteData(website: string): Promise<WebsiteExtraction | undefined> {
  const normalized = normalizeWebsiteUrl(website);
  if (!normalized) {
    return undefined;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(normalized, {
      headers: {
        "User-Agent": process.env.LEADS_SEARCH_USER_AGENT ?? "website-sales/1.0",
        Accept: "text/html,application/xhtml+xml"
      },
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      return undefined;
    }

    const html = await response.text();
    const text = stripHtml(html);

    const metaDescription = extractMeta(html, "description") ?? extractMeta(html, "og:description");
    const ogImageRaw = extractMeta(html, "og:image");
    const ogImage = ogImageRaw ? toAbsoluteUrl(normalized, ogImageRaw) ?? undefined : undefined;

    const images = extractImageUrls(normalized, html);
    if (ogImage) {
      images.unshift(ogImage);
    }

    return {
      sourceUrl: normalized,
      pageTitle: extractTitle(html),
      metaDescription,
      ogImage,
      images: Array.from(new Set(images)).slice(0, 10),
      menuHints: extractMenuHints(text),
      textSnippet: text.slice(0, 1200)
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function enrichCommerceLead(lead: CommerceLead): Promise<EnrichedCommerceLead> {
  const locale = inferLocaleProfile(lead.country);
  const websiteData = lead.website ? await extractWebsiteData(lead.website) : undefined;

  const inferredDescription =
    lead.description ??
    websiteData?.metaDescription ??
    (websiteData?.pageTitle
      ? `${websiteData.pageTitle} - ${lead.city}`
      : fallbackDescription(lead, locale));

  return {
    lead: {
      ...lead,
      country: lead.country ?? locale.country,
      source: websiteData ? "hybrid" : lead.source
    },
    locale,
    websiteData,
    inferredDescription,
    inferredMenuItems: websiteData?.menuHints ?? [],
    suggestedImages: websiteData?.images ?? []
  };
}
