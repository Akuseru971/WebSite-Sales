import type { ExtractedImageAsset, ExtractedPageContent, StructuredBusinessExtraction } from "./types";

interface CrawlOptions {
  maxPages?: number;
  timeoutMs?: number;
}

interface BrowserPageExtraction {
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  links: string[];
  ctaPhrases: string[];
  images: Array<{
    url: string;
    alt: string;
    width: number;
    height: number;
    isLikelyLogo: boolean;
    isLikelyHero: boolean;
  }>;
  themeColors: string[];
  pageHints: string[];
  contacts: {
    phones: string[];
    emails: string[];
    addresses: string[];
  };
}

const DEFAULT_MAX_PAGES = 5;
const DEFAULT_TIMEOUT_MS = 20_000;
const PAGE_KEYWORD_PRIORITIES = [
  "about",
  "services",
  "menu",
  "products",
  "gallery",
  "contact",
  "team",
  "pricing",
  "book",
  "reservation",
  "faq",
] as const;

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

function sameHost(url: string, host: string): boolean {
  try {
    return new URL(url).host === host;
  } catch {
    return false;
  }
}

function scoreLink(url: string): number {
  const pathname = url.toLowerCase();
  let score = 0;

  for (let i = 0; i < PAGE_KEYWORD_PRIORITIES.length; i += 1) {
    if (pathname.includes(PAGE_KEYWORD_PRIORITIES[i])) {
      score += PAGE_KEYWORD_PRIORITIES.length - i;
    }
  }

  if (pathname.split("/").filter(Boolean).length <= 2) {
    score += 2;
  }

  return score;
}

function uniqueStrings(values: string[], limit = 50): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
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

function uniqueImages(images: ExtractedImageAsset[], limit = 40): ExtractedImageAsset[] {
  const seen = new Set<string>();
  const output: ExtractedImageAsset[] = [];

  for (const image of images) {
    const key = image.url;
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(image);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function trimTextBlocks(blocks: string[], minLength = 60, limit = 20): string[] {
  return uniqueStrings(
    blocks
      .map((block) => block.replace(/\s+/g, " ").trim())
      .filter((block) => block.length >= minLength),
    limit,
  );
}

export async function extractStructuredBusinessContent(
  website: string,
  options?: CrawlOptions,
): Promise<StructuredBusinessExtraction | null> {
  const normalizedWebsite = normalizeWebsite(website);
  if (!normalizedWebsite) {
    return null;
  }

  let entryHost: string;
  try {
    entryHost = new URL(normalizedWebsite).host;
  } catch {
    return null;
  }

  const envMaxPages = Number.parseInt(process.env.EXTRACTION_MAX_PAGES ?? "", 10);
  const envTimeoutMs = Number.parseInt(process.env.EXTRACTION_TIMEOUT_MS ?? "", 10);
  const maxPages = options?.maxPages ?? (Number.isFinite(envMaxPages) && envMaxPages > 0 ? envMaxPages : DEFAULT_MAX_PAGES);
  const timeoutMs = options?.timeoutMs ?? (Number.isFinite(envTimeoutMs) && envTimeoutMs > 0 ? envTimeoutMs : DEFAULT_TIMEOUT_MS);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const queue: string[] = [normalizedWebsite];
  const visited = new Set<string>();
  const pages: ExtractedPageContent[] = [];
  const collectedThemeColors: string[] = [];
  const contactPhones: string[] = [];
  const contactEmails: string[] = [];
  const contactAddresses: string[] = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: true,
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    while (queue.length > 0 && pages.length < maxPages) {
      const nextUrl = queue.shift();
      if (!nextUrl) {
        continue;
      }

      if (visited.has(nextUrl)) {
        continue;
      }

      visited.add(nextUrl);

      const page = await context.newPage();
      let extracted: BrowserPageExtraction | null = null;

      try {
        await page.goto(nextUrl, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });

        try {
          await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 6_000) });
        } catch {
          // Some websites never reach networkidle due to long-polling.
        }

        extracted = await page.evaluate(() => {
          const toHexColor = (rawColor: string | null): string | undefined => {
            if (!rawColor) {
              return undefined;
            }

            const color = rawColor.trim().toLowerCase();
            if (!color || color === "transparent" || color === "inherit") {
              return undefined;
            }

            if (/^#[0-9a-f]{3,8}$/i.test(color)) {
              return color;
            }

            const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (!rgbMatch) {
              return undefined;
            }

            const r = Number.parseInt(rgbMatch[1], 10);
            const g = Number.parseInt(rgbMatch[2], 10);
            const b = Number.parseInt(rgbMatch[3], 10);
            if ([r, g, b].some((channel) => Number.isNaN(channel))) {
              return undefined;
            }

            return `#${[r, g, b]
              .map((channel) => channel.toString(16).padStart(2, "0"))
              .join("")}`;
          };

          const isVisible = (element: Element): boolean => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element as HTMLElement);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              Number.parseFloat(style.opacity || "1") > 0
            );
          };

          const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

          const title = normalizeText(document.title || "");
          const description = normalizeText(
            document
              .querySelector('meta[name="description"]')
              ?.getAttribute("content") || "",
          );

          const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
            .filter((el) => isVisible(el))
            .map((el) => normalizeText(el.textContent || ""))
            .filter((text) => text.length >= 3);

          const paragraphs = Array.from(document.querySelectorAll("main p, article p, section p, li"))
            .filter((el) => isVisible(el))
            .map((el) => normalizeText(el.textContent || ""))
            .filter((text) => text.length >= 25 && text.length <= 1200);

          const ctaPhrases = Array.from(document.querySelectorAll("button, a"))
            .filter((el) => isVisible(el))
            .map((el) => normalizeText(el.textContent || ""))
            .filter(
              (text) =>
                text.length >= 4 &&
                text.length <= 80 &&
                /(book|reserve|order|get|contact|call|shop|menu|quote|visit|learn|join|start)/i.test(text),
            );

          const images = Array.from(document.querySelectorAll("img"))
            .filter((img) => isVisible(img))
            .map((img) => {
              const alt = normalizeText(img.getAttribute("alt") || "");
              const src = (img as HTMLImageElement).currentSrc || img.getAttribute("src") || "";
              const rect = img.getBoundingClientRect();
              const width = Math.round(rect.width || (img as HTMLImageElement).naturalWidth || 0);
              const height = Math.round(rect.height || (img as HTMLImageElement).naturalHeight || 0);
              const classes = `${img.className || ""} ${(img.parentElement?.className as string) || ""}`;
              const isLikelyLogo =
                /logo/i.test(alt) || /logo|brand|navbar|header/i.test(classes) || (width <= 350 && height <= 180);
              const isLikelyHero = width >= 700 && height >= 260;

              return {
                url: src,
                alt,
                width,
                height,
                isLikelyLogo,
                isLikelyHero,
              };
            })
            .filter((image) => image.url && image.width >= 100 && image.height >= 60);

          const links = Array.from(document.querySelectorAll("a[href]"))
            .map((anchor) => anchor.getAttribute("href") || "")
            .filter((href) => href && !href.startsWith("#") && !href.startsWith("javascript:"));

          const themeColors = [
            toHexColor(document.querySelector('meta[name="theme-color"]')?.getAttribute("content") || null),
            toHexColor(window.getComputedStyle(document.body).backgroundColor),
            toHexColor(window.getComputedStyle(document.body).color),
            ...Array.from(document.querySelectorAll("button, .btn, a"))
              .slice(0, 12)
              .map((el) => toHexColor(window.getComputedStyle(el as HTMLElement).backgroundColor)),
          ].filter((value): value is string => Boolean(value));

          const pageHints: string[] = [];
          if (document.querySelector("form")) {
            pageHints.push("has-form");
          }
          if (document.querySelector("nav")) {
            pageHints.push("has-navigation");
          }
          if (document.querySelector("section")) {
            pageHints.push("sectioned-layout");
          }
          if (document.querySelector("footer")) {
            pageHints.push("has-footer");
          }

          const pageText = normalizeText(document.body?.innerText || "");
          const phones = Array.from(
            new Set(pageText.match(/\+?[0-9][0-9\s().-]{7,}/g) || []),
          )
            .map((match) => normalizeText(match))
            .filter((match) => match.length >= 8 && match.length <= 25);

          const emails = Array.from(
            new Set(pageText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []),
          ).map((match) => match.toLowerCase());

          const addresses = paragraphs.filter((paragraph) =>
            /street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd|postal|zip|city|suite|floor|plaza/i.test(paragraph),
          );

          return {
            title,
            description,
            headings,
            paragraphs,
            links,
            ctaPhrases,
            images,
            themeColors,
            pageHints,
            contacts: {
              phones,
              emails,
              addresses,
            },
          };
        });
      } catch {
        extracted = null;
      } finally {
        await page.close();
      }

      if (!extracted) {
        continue;
      }

      collectedThemeColors.push(...extracted.themeColors);
      contactPhones.push(...extracted.contacts.phones);
      contactEmails.push(...extracted.contacts.emails);
      contactAddresses.push(...extracted.contacts.addresses);

      const images: ExtractedImageAsset[] = extracted.images
        .map((image): ExtractedImageAsset | null => {
          const absolute = toAbsoluteUrl(image.url, nextUrl);
          if (!absolute) {
            return null;
          }

          const role = image.isLikelyLogo ? "logo" : image.isLikelyHero ? "hero" : "content";
          return {
            url: absolute,
            alt: image.alt,
            width: image.width,
            height: image.height,
            sourcePage: nextUrl,
            role,
          };
        })
        .filter((image): image is ExtractedImageAsset => Boolean(image));

      pages.push({
        url: nextUrl,
        title: extracted.title,
        description: extracted.description,
        headings: uniqueStrings(extracted.headings, 20),
        paragraphs: trimTextBlocks(extracted.paragraphs, 40, 40),
        ctaPhrases: uniqueStrings(extracted.ctaPhrases, 20),
        links: extracted.links,
        images,
      });

      const discoveredLinks = extracted.links
        .map((href) => toAbsoluteUrl(href, nextUrl))
        .filter((href): href is string => Boolean(href))
        .filter((href) => sameHost(href, entryHost))
        .filter((href) => !visited.has(href));

      const prioritized = uniqueStrings(discoveredLinks, 30).sort((a, b) => scoreLink(b) - scoreLink(a));
      for (const discoveredUrl of prioritized) {
        if (queue.includes(discoveredUrl) || visited.has(discoveredUrl)) {
          continue;
        }
        queue.push(discoveredUrl);
      }
    }
  } finally {
    await browser.close();
  }

  if (pages.length === 0) {
    return null;
  }

  const allImages = uniqueImages(pages.flatMap((page) => page.images), 80);
  const keyHeadings = uniqueStrings(pages.flatMap((page) => page.headings), 30);
  const ctaPhrases = uniqueStrings(pages.flatMap((page) => page.ctaPhrases), 20);

  const aboutText = trimTextBlocks(
    pages
      .filter((page) => /about|story|mission|team/i.test(page.url) || /about|story|mission|team/i.test(page.title))
      .flatMap((page) => page.paragraphs),
    80,
    12,
  );

  const serviceDescriptions = trimTextBlocks(
    pages
      .filter((page) => /service|menu|product|offer|solution|treatments?|pricing/i.test(page.url + " " + page.title))
      .flatMap((page) => page.paragraphs),
    50,
    20,
  );

  const logo =
    allImages.find((image) => image.role === "logo") ||
    allImages.find((image) => /logo|brand/i.test(image.alt)) ||
    allImages.find((image) => image.width <= 400 && image.height <= 220);

  const heroImages = uniqueImages(
    allImages
      .filter((image) => image.role === "hero" || (image.width >= 900 && image.height >= 300))
      .slice(0, 8),
    8,
  );

  const galleryImages = uniqueImages(
    allImages
      .filter(
        (image) =>
          image.url !== logo?.url &&
          image.url !== heroImages[0]?.url &&
          image.width >= 320 &&
          image.height >= 200,
      )
      .slice(0, 18)
      .map((image) => ({ ...image, role: "gallery" as const })),
    18,
  );

  const uniqueThemeColors = uniqueStrings(collectedThemeColors, 6);

  return {
    sourceWebsite: normalizedWebsite,
    crawledAt: new Date().toISOString(),
    pages,
    logo,
    heroImages,
    galleryImages,
    keyHeadings,
    aboutText,
    serviceDescriptions,
    ctaPhrases,
    contact: {
      phones: uniqueStrings(contactPhones, 8),
      emails: uniqueStrings(contactEmails, 8),
      addresses: uniqueStrings(contactAddresses, 6),
    },
    themeHints: {
      primaryColor: uniqueThemeColors[0],
      secondaryColor: uniqueThemeColors[1],
      accentColor: uniqueThemeColors[2],
    },
    pageStructureHints: uniqueStrings(
      pages.flatMap((page) => {
        const hints: string[] = [];
        if (page.headings.length >= 3) {
          hints.push("rich-headings");
        }
        if (page.ctaPhrases.length > 0) {
          hints.push("cta-driven");
        }
        if (page.images.length > 4) {
          hints.push("image-heavy");
        }
        return hints;
      }),
      10,
    ),
  };
}
