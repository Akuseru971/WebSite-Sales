import * as cheerio from "cheerio";
import { discoverySchema } from "@/lib/listingboost/types";

interface DiscoveredProspect {
  businessName: string;
  website: string;
  publicEmail?: string;
  contactPageUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  city?: string;
  country?: string;
  sourceUrl: string;
  sourceQuery: string;
  source: string;
  confidenceScore: number;
}

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function normalizeWebsite(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url;
  }
}

function extractPublicEmail(text: string): string | undefined {
  const matches = text.match(emailRegex);
  if (!matches?.length) return undefined;
  return matches.find((value) => !value.endsWith("@example.com"))?.toLowerCase();
}

async function readHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ListingBoostBot/1.0 (+internal tooling)",
      Accept: "text/html"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source (${response.status})`);
  }

  return response.text();
}

function parseWebsiteSignals(websiteUrl: string, html: string, query: string, city?: string, country?: string): DiscoveredProspect {
  const $ = cheerio.load(html);
  const title = $("title").text().trim() || new URL(websiteUrl).hostname;
  const bodyText = $("body").text();
  const mailto = $("a[href^='mailto:']").first().attr("href")?.replace("mailto:", "").trim();
  const email = mailto || extractPublicEmail(bodyText);
  const contactPage =
    $("a[href*='contact']").first().attr("href") ||
    $("a[href*='about']").first().attr("href") ||
    undefined;
  const linkedin = $("a[href*='linkedin.com']").first().attr("href") || undefined;
  const instagram = $("a[href*='instagram.com']").first().attr("href") || undefined;

  return {
    businessName: title,
    website: normalizeWebsite(websiteUrl),
    publicEmail: email,
    contactPageUrl: contactPage ? new URL(contactPage, websiteUrl).toString() : undefined,
    linkedinUrl: linkedin,
    instagramUrl: instagram,
    city,
    country,
    sourceUrl: websiteUrl,
    sourceQuery: query,
    source: "manual_query",
    confidenceScore: email ? 0.82 : 0.45
  };
}

export async function discoverProspects(input: unknown) {
  const payload = discoverySchema.parse(input);

  if (payload.websiteUrl) {
    const html = await readHtml(payload.websiteUrl);
    return [parseWebsiteSignals(payload.websiteUrl, html, payload.query ?? payload.websiteUrl, payload.city, payload.country)];
  }

  if (!payload.query) {
    return [];
  }

  const candidateUrls = payload.query
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http://") || line.startsWith("https://"))
    .slice(0, payload.limit);

  const results: DiscoveredProspect[] = [];

  for (const url of candidateUrls) {
    try {
      const html = await readHtml(url);
      results.push(parseWebsiteSignals(url, html, payload.query, payload.city, payload.country));
    } catch {
      results.push({
        businessName: new URL(url).hostname,
        website: normalizeWebsite(url),
        sourceUrl: url,
        sourceQuery: payload.query,
        source: "manual_query",
        city: payload.city,
        country: payload.country,
        confidenceScore: 0.2
      });
    }
  }

  return results;
}
