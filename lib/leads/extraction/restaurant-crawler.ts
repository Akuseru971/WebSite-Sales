import { decodeHtmlEntities } from "@/lib/utils/html-entities";

export type RestaurantImageRole = "logo" | "hero" | "food" | "interior" | "gallery" | "team" | "decorative" | "unknown";

export interface RestaurantRawImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  sourcePage: string;
  role: RestaurantImageRole;
}

export interface RestaurantRawMenuItem {
  name: string;
  description?: string;
  price?: string;
}

export interface RestaurantRawMenuSection {
  title: string;
  items: RestaurantRawMenuItem[];
}

export interface RestaurantRawPage {
  url: string;
  title: string;
  metaTitle?: string;
  ogTitle?: string;
  description?: string;
  logoAltCandidates: string[];
  headerBrandCandidates: string[];
  footerBrandCandidates: string[];
  h1: string[];
  headings: string[];
  paragraphs: string[];
  openingHours: string[];
  contacts: {
    phones: string[];
    emails: string[];
    addresses: string[];
    whatsapps: string[];
    reservationLinks: string[];
  };
  socialLinks: Array<{ platform: string; url: string }>;
  menuSections: RestaurantRawMenuSection[];
  menuPdfUrls: string[];
  colors: string[];
  images: RestaurantRawImage[];
  links: string[];
}

export interface RestaurantCrawlResult {
  sourceUrl: string;
  crawledAt: string;
  pages: RestaurantRawPage[];
}

const RESTAURANT_PATH_HINTS = [
  "menu",
  "carte",
  "food",
  "about",
  "our-story",
  "story",
  "contact",
  "reservation",
  "reservations",
  "book",
  "gallery",
];

function normalizeWebsite(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function uniqueStrings(values: string[], limit = 100): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const value = decodeHtmlEntities(raw).replace(/\s+/g, " ").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }

  return out;
}

function toAbsoluteUrl(input: string, base: string): string | undefined {
  try {
    return new URL(input, base).toString();
  } catch {
    return undefined;
  }
}

function scoreRestaurantUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  RESTAURANT_PATH_HINTS.forEach((hint, index) => {
    if (lower.includes(hint)) {
      score += RESTAURANT_PATH_HINTS.length - index;
    }
  });
  if (lower.split("/").filter(Boolean).length <= 3) score += 2;
  return score;
}

function classifyImage(input: { alt: string; src: string; width: number; height: number; y: number }): RestaurantImageRole {
  const text = `${input.alt} ${input.src}`.toLowerCase();

  if (input.width < 80 || input.height < 80) return "decorative";
  if (/icon|badge|cookie|payment|visa|mastercard|facebook|instagram/.test(text)) return "decorative";
  if (/logo|brand/.test(text) || (input.width <= 450 && input.height <= 220 && input.y < 420)) return "logo";
  if (input.width >= 1000 && input.height >= 420 && input.y < 900) return "hero";
  if (/dish|menu|food|plate|dessert|starter|cocktail|wine|pizza|pasta|burger/.test(text)) return "food";
  if (/interior|restaurant|dining|room|table|ambience/.test(text)) return "interior";
  if (/chef|team|staff|cook/.test(text)) return "team";
  if (input.width >= 350 && input.height >= 240) return "gallery";
  return "unknown";
}

export async function crawlRestaurantWebsite(website: string, options?: { maxPages?: number; timeoutMs?: number }): Promise<RestaurantCrawlResult | null> {
  const sourceUrl = normalizeWebsite(website);
  if (!sourceUrl) return null;

  let host: string;
  try {
    host = new URL(sourceUrl).host;
  } catch {
    return null;
  }

  const maxPages = options?.maxPages ?? 7;
  const timeoutMs = options?.timeoutMs ?? 22000;

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const queue: string[] = [sourceUrl];
  const seededPaths = RESTAURANT_PATH_HINTS
    .map((path) => toAbsoluteUrl(`/${path}`, sourceUrl))
    .filter((value): value is string => Boolean(value));
  queue.push(...seededPaths);

  const visited = new Set<string>();
  const pages: RestaurantRawPage[] = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: true,
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    while (queue.length > 0 && pages.length < maxPages) {
      const nextUrl = queue.shift();
      if (!nextUrl || visited.has(nextUrl)) continue;
      visited.add(nextUrl);

      let sameDomain = false;
      try {
        sameDomain = new URL(nextUrl).host === host;
      } catch {
        sameDomain = false;
      }
      if (!sameDomain) continue;

      const page = await context.newPage();
      try {
        await page.goto(nextUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        try {
          await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 7000) });
        } catch {
          // Some pages never reach network idle.
        }

        await page.evaluate(async () => {
          const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const target = Math.max(document.body?.scrollHeight ?? 0, document.documentElement?.scrollHeight ?? 0);
          const viewport = window.innerHeight;
          let y = 0;
          while (y < target) {
            window.scrollTo({ top: y, behavior: "auto" });
            await wait(120);
            y += Math.floor(viewport * 0.75);
          }
          window.scrollTo({ top: 0, behavior: "auto" });
          await wait(120);
        });

        const extracted = await page.evaluate(() => {
          const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();
          const visible = (element: Element): boolean => {
            const style = window.getComputedStyle(element as HTMLElement);
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
          };

          const textFrom = (selector: string, min = 2, max = 220): string[] =>
            Array.from(document.querySelectorAll(selector))
              .filter((el) => visible(el))
              .map((el) => normalize((el.textContent || "").trim()))
              .filter((text) => text.length >= min && text.length <= max);

          const getMeta = (name: string): string | undefined => {
            const node = document.querySelector(`meta[name=\"${name}\"],meta[property=\"${name}\"]`);
            const value = node?.getAttribute("content") || "";
            const normalized = normalize(value);
            return normalized || undefined;
          };

          const cssVarColors = Array.from(document.querySelectorAll("style,link[rel='stylesheet']"))
            .flatMap((node) => {
              const text = (node as HTMLStyleElement).textContent || "";
              const matches = text.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || [];
              return matches;
            });

          const computedColor = (el: Element | null): string[] => {
            if (!el) return [];
            const style = window.getComputedStyle(el as HTMLElement);
            const values = [style.color, style.backgroundColor, style.borderColor]
              .filter(Boolean)
              .map((v) => v.trim());
            return values;
          };

          const rgbToHex = (value: string): string | undefined => {
            if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
            const match = value.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            if (!match) return undefined;
            const channels = [match[1], match[2], match[3]].map((part) => Number.parseInt(part, 10));
            if (channels.some((part) => Number.isNaN(part))) return undefined;
            return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
          };

          const allColors = [
            ...cssVarColors,
            ...computedColor(document.body),
            ...computedColor(document.querySelector("header")),
            ...Array.from(document.querySelectorAll("button,a,.btn")).slice(0, 20).flatMap((el) => computedColor(el)),
          ]
            .map((color) => rgbToHex(color) ?? color)
            .filter((value) => /^#[0-9a-fA-F]{3,8}$/.test(value));

          const allLinks = Array.from(document.querySelectorAll("a[href]"))
            .map((a) => a.getAttribute("href") || "")
            .filter(Boolean);

          const socialLinks = allLinks
            .map((href) => href.trim())
            .filter((href) => /instagram|facebook|tiktok|linkedin|x\.com|twitter|youtube/i.test(href))
            .map((href) => {
              const platform = /instagram/i.test(href)
                ? "instagram"
                : /facebook/i.test(href)
                  ? "facebook"
                  : /tiktok/i.test(href)
                    ? "tiktok"
                    : /linkedin/i.test(href)
                      ? "linkedin"
                      : /youtube/i.test(href)
                        ? "youtube"
                        : "x";
              return { platform, url: href };
            });

          const menuPdfUrls = allLinks.filter((href) => /menu|carte/i.test(href) && /\.pdf(\?|$)/i.test(href));

          const reservationLinks = allLinks.filter((href) => /(reserve|reservation|book|opentable|thefork)/i.test(href));
          const whatsappLinks = allLinks.filter((href) => /wa\.me|whatsapp/i.test(href));
          const emailLinks = allLinks.filter((href) => /^mailto:/i.test(href));
          const phoneLinks = allLinks.filter((href) => /^tel:/i.test(href));

          const fullText = normalize(document.body?.innerText || "");
          const phones = Array.from(new Set(fullText.match(/\+?[0-9][0-9\s().-]{7,}/g) || []));
          const emails = Array.from(new Set(fullText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []));
          const addresses = textFrom("footer p, footer li, address, .contact p, .address", 6, 240).filter((line) =>
            /(street|st\.|avenue|road|boulevard|lane|city|postcode|postal|zip|france|italy|spain|germany|uk|usa)/i.test(line),
          );

          const hours = textFrom(".hours, .opening-hours, .horaire, .horaires, .schedule, footer p, section p", 4, 160).filter((line) =>
            /(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|open|close|am|pm|h-)/i.test(line),
          );

          const menuSections = Array.from(document.querySelectorAll("section, article, div"))
            .slice(0, 220)
            .map((block) => {
              const heading = block.querySelector("h2, h3, h4, .title")?.textContent || "";
              const title = normalize(heading);
              if (!/(menu|carte|starter|main|dessert|drink|cocktail|wine|signature|tasting|plat|entree)/i.test(title)) {
                return null;
              }

              const rowNodes = Array.from(block.querySelectorAll("li, .menu-item, .dish, .card"));
              const items = rowNodes
                .slice(0, 30)
                .map((row) => {
                  const nameNode = row.querySelector("h3, h4, strong, .name, .dish-name");
                  const descNode = row.querySelector("p, .description, .desc");
                  const rowText = normalize(row.textContent || "");
                  const priceMatch = rowText.match(/(?:\$|EUR|USD|GBP|€)\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})\s?(?:€|eur|usd|\$)/i);
                  const name = normalize(nameNode?.textContent || rowText.split(/\s{2,}|\n/)[0] || "");
                  const description = normalize(descNode?.textContent || "");

                  if (name.length < 2 || name.length > 120) {
                    return null;
                  }

                  return {
                    name,
                    description: description || undefined,
                    price: priceMatch?.[0],
                  };
                })
                .filter(Boolean) as Array<{ name: string; description?: string; price?: string }>;

              if (!items.length) return null;
              return { title: title || "Menu", items };
            })
            .filter(Boolean) as Array<{ title: string; items: Array<{ name: string; description?: string; price?: string }> }>;

          const images = Array.from(document.querySelectorAll("img"))
            .map((img) => {
              const source = (img as HTMLImageElement).currentSrc || img.getAttribute("src") || "";
              const alt = normalize(img.getAttribute("alt") || "");
              const rect = img.getBoundingClientRect();
              const width = Math.round(rect.width || (img as HTMLImageElement).naturalWidth || 0);
              const height = Math.round(rect.height || (img as HTMLImageElement).naturalHeight || 0);
              return {
                src: source,
                alt,
                width,
                height,
                y: Math.round(rect.top + window.scrollY),
              };
            })
            .filter((image) => image.src && image.width >= 40 && image.height >= 40);

          return {
            title: normalize(document.title || ""),
            metaTitle: getMeta("title"),
            ogTitle: getMeta("og:title"),
            description: getMeta("description") || getMeta("og:description"),
            logoAltCandidates: textFrom("header img[alt], .logo img[alt], [class*='logo'] img[alt]", 2, 140),
            headerBrandCandidates: textFrom("header .logo, header .brand, header .site-title, header h1, nav .brand", 2, 160),
            footerBrandCandidates: textFrom("footer .logo, footer .brand, footer h2, footer strong", 2, 160),
            h1: textFrom("h1", 2, 180),
            headings: textFrom("h2, h3", 2, 180),
            paragraphs: textFrom("main p, article p, section p", 40, 1100),
            openingHours: hours,
            contacts: {
              phones: [...phones, ...phoneLinks.map((link) => link.replace(/^tel:/i, ""))],
              emails: [...emails, ...emailLinks.map((link) => link.replace(/^mailto:/i, ""))],
              addresses,
              whatsapps: whatsappLinks,
              reservationLinks,
            },
            socialLinks,
            menuSections,
            menuPdfUrls,
            colors: allColors,
            images,
            links: allLinks,
          };
        });

        const rawImages: RestaurantRawImage[] = extracted.images
          .map((image) => {
            const absolute = toAbsoluteUrl(image.src, nextUrl);
            if (!absolute) return null;
            return {
              url: absolute,
              alt: image.alt,
              width: image.width,
              height: image.height,
              sourcePage: nextUrl,
              role: classifyImage({ alt: image.alt, src: absolute, width: image.width, height: image.height, y: image.y }),
            };
          })
          .filter((value): value is RestaurantRawImage => Boolean(value))
          .filter((image) => image.role !== "decorative");

        const socialLinks = extracted.socialLinks
          .map((entry) => ({
            platform: entry.platform,
            url: toAbsoluteUrl(entry.url, nextUrl) ?? entry.url,
          }))
          .filter((entry) => /^https?:\/\//i.test(entry.url));

        const pageData: RestaurantRawPage = {
          url: nextUrl,
          title: extracted.title,
          metaTitle: extracted.metaTitle,
          ogTitle: extracted.ogTitle,
          description: extracted.description,
          logoAltCandidates: uniqueStrings(extracted.logoAltCandidates, 8),
          headerBrandCandidates: uniqueStrings(extracted.headerBrandCandidates, 8),
          footerBrandCandidates: uniqueStrings(extracted.footerBrandCandidates, 8),
          h1: uniqueStrings(extracted.h1, 6),
          headings: uniqueStrings(extracted.headings, 20),
          paragraphs: uniqueStrings(extracted.paragraphs, 40),
          openingHours: uniqueStrings(extracted.openingHours, 14),
          contacts: {
            phones: uniqueStrings(extracted.contacts.phones, 10),
            emails: uniqueStrings(extracted.contacts.emails, 10),
            addresses: uniqueStrings(extracted.contacts.addresses, 8),
            whatsapps: uniqueStrings(extracted.contacts.whatsapps, 6),
            reservationLinks: uniqueStrings(extracted.contacts.reservationLinks, 8),
          },
          socialLinks,
          menuSections: (extracted.menuSections ?? [])
            .filter(Boolean)
            .map((section) => ({
              title: decodeHtmlEntities(section.title).trim(),
              items: (section.items ?? [])
                .filter(Boolean)
                .map((item) => ({
                  name: decodeHtmlEntities(item.name).trim(),
                  description: item.description ? decodeHtmlEntities(item.description).trim() : undefined,
                  price: item.price ? decodeHtmlEntities(item.price).trim() : undefined,
                }))
                .filter((item) => item.name.length >= 2),
            }))
            .filter((section) => section.title && section.items.length > 0),
          menuPdfUrls: uniqueStrings(
            extracted.menuPdfUrls
              .map((href) => toAbsoluteUrl(href, nextUrl) ?? href)
              .filter((href) => /^https?:\/\//i.test(href)),
            10,
          ),
          colors: uniqueStrings(extracted.colors, 20),
          images: rawImages,
          links: uniqueStrings(
            extracted.links
              .map((href) => toAbsoluteUrl(href, nextUrl) ?? href)
              .filter((href) => /^https?:\/\//i.test(href)),
            40,
          ),
        };

        pages.push(pageData);

        const nextLinks = pageData.links
          .filter((href) => {
            try {
              return new URL(href).host === host;
            } catch {
              return false;
            }
          })
          .filter((href) => !visited.has(href))
          .sort((a, b) => scoreRestaurantUrl(b) - scoreRestaurantUrl(a))
          .slice(0, 10);

        nextLinks.forEach((href) => {
          if (!queue.includes(href)) {
            queue.push(href);
          }
        });
      } catch {
        // Skip pages that fail to render.
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (pages.length === 0) {
    return null;
  }

  return {
    sourceUrl,
    crawledAt: new Date().toISOString(),
    pages,
  };
}
