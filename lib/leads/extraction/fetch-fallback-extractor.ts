import type { StructuredBusinessExtraction } from "./types";

function normalizeWebsite(website: string): string {
  const candidate = website.trim();
  if (!candidate) {
    return "";
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  return `https://${candidate}`;
}

function toAbsoluteUrl(input: string, base: string): string | undefined {
  try {
    return new URL(input, base).toString();
  } catch {
    return undefined;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[], limit = 50): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function extractTags(html: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, "gi");
  const output: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const value = stripHtml(match[1]);
    if (value.length >= 3) {
      output.push(value);
    }
  }

  return output;
}

function extractMetaContent(html: string, key: string): string | undefined {
  const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripHtml(match?.[1] ?? "");
}

function extractLinks(html: string, baseUrl: string): string[] {
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const absolute = toAbsoluteUrl(match[1], baseUrl);
    if (!absolute) {
      continue;
    }

    if (/^https?:\/\//i.test(absolute)) {
      links.push(absolute);
    }
  }

  return uniqueStrings(links, 30);
}

function extractImageUrls(html: string, baseUrl: string): string[] {
  const regex = /<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const absolute = toAbsoluteUrl(match[1], baseUrl);
    if (!absolute) {
      continue;
    }

    images.push(absolute);
  }

  return uniqueStrings(images, 24);
}

async function fetchHtml(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": process.env.LEADS_SEARCH_USER_AGENT ?? "website-sales/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractStructuredBusinessContentWithFetchFallback(
  website: string,
  options?: { timeoutMs?: number },
): Promise<StructuredBusinessExtraction | null> {
  const normalized = normalizeWebsite(website);
  if (!normalized) {
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? 12000;
  const html = await fetchHtml(normalized, timeoutMs);
  if (!html) {
    return null;
  }

  const title = extractTitle(html);
  const description =
    extractMetaContent(html, "description") ??
    extractMetaContent(html, "og:description") ??
    "";

  const headings = uniqueStrings([
    ...extractTags(html, "h1"),
    ...extractTags(html, "h2"),
    ...extractTags(html, "h3"),
  ], 24);

  const paragraphs = uniqueStrings(
    extractTags(html, "p").filter((line) => line.length >= 30 && line.length <= 1200),
    40,
  );

  const links = extractLinks(html, normalized);
  const images = extractImageUrls(html, normalized);
  const ctaPhrases = uniqueStrings(
    [...extractTags(html, "button"), ...extractTags(html, "a")].filter((line) =>
      /(book|reserve|order|get|contact|call|shop|menu|quote|visit|learn|join|start)/i.test(line),
    ),
    20,
  );

  const rawText = stripHtml(html);
  const phones = uniqueStrings(rawText.match(/\+?[0-9][0-9\s().-]{7,}/g) ?? [], 8);
  const emails = uniqueStrings(rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [], 8).map((value) => value.toLowerCase());
  const addresses = uniqueStrings(
    paragraphs.filter((line) => /street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd|postal|zip|city|suite|floor|plaza/i.test(line)),
    6,
  );

  const ogImage = extractMetaContent(html, "og:image");
  const logoCandidate = images.find((url) => /logo|brand/i.test(url));

  const heroImages = uniqueStrings(
    [
      ...(ogImage ? [toAbsoluteUrl(ogImage, normalized) ?? ogImage] : []),
      ...images.slice(0, 4),
    ],
    8,
  );

  const galleryImages = uniqueStrings(images.slice(0, 16), 16);

  return {
    sourceWebsite: normalized,
    crawledAt: new Date().toISOString(),
    pages: [
      {
        url: normalized,
        title,
        description,
        headings,
        paragraphs,
        ctaPhrases,
        links,
        images: galleryImages.map((image) => ({
          url: image,
          alt: title || "Business image",
          width: 800,
          height: 500,
          sourcePage: normalized,
          role: image === logoCandidate ? "logo" : image === heroImages[0] ? "hero" : "content",
        })),
      },
    ],
    logo: logoCandidate
      ? {
          url: logoCandidate,
          alt: "Logo",
          width: 260,
          height: 130,
          sourcePage: normalized,
          role: "logo",
        }
      : undefined,
    heroImages: heroImages.map((image) => ({
      url: image,
      alt: "Hero image",
      width: 1200,
      height: 700,
      sourcePage: normalized,
      role: "hero",
    })),
    galleryImages: galleryImages.map((image) => ({
      url: image,
      alt: "Gallery image",
      width: 900,
      height: 600,
      sourcePage: normalized,
      role: "gallery",
    })),
    keyHeadings: headings,
    aboutText: paragraphs.slice(0, 12),
    serviceDescriptions: paragraphs.filter((line) => /service|offer|menu|product|solution|package|treatment/i.test(line)).slice(0, 20),
    ctaPhrases,
    contact: {
      phones,
      emails,
      addresses,
    },
    themeHints: {
      primaryColor: extractMetaContent(html, "theme-color"),
      secondaryColor: undefined,
      accentColor: undefined,
    },
    pageStructureHints: uniqueStrings([
      headings.length >= 3 ? "rich-headings" : "",
      ctaPhrases.length > 0 ? "cta-driven" : "",
      galleryImages.length > 5 ? "image-heavy" : "",
      "fetch-fallback",
    ], 8),
    screenshots: [],
    navItems: uniqueStrings(extractTags(html, "nav"), 12),
    toneHints: uniqueStrings(
      [
        /luxury|premium|exclusive|signature/i.test(rawText) ? "luxury" : "",
        /family|friendly|welcome|warm/i.test(rawText) ? "warm" : "",
        /trusted|professional|certified|reliable/i.test(rawText) ? "corporate" : "",
      ],
      6,
    ),
  };
}
