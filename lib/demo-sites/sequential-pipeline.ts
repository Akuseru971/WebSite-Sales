import OpenAI from "openai";
import type {
  AdaptiveSiteComposition,
  BusinessCategory,
  DemoSection,
  DemoSiteContent,
  DemoSiteStyle,
  RedesignPlan,
  RestaurantContent,
  RestaurantLocaleCode,
  SequentialPipelineArtifacts,
  SourceAssetsJson,
  SourceBrandSignals,
  SourceContentJson,
  SourceStructureJson,
} from "@/lib/demo-sites/types";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import { extractStructuredBusinessContent } from "@/lib/leads/extraction/playwright-extractor";
import { extractStructuredBusinessContentWithFetchFallback } from "@/lib/leads/extraction/fetch-fallback-extractor";
import { inferLocaleProfile, type SupportedLanguage } from "@/lib/i18n/locale";
import { createResponseWithModelFallback } from "@/lib/openai/model-fallback";
import { buildSupportedLocales, resolvePrimaryLocale } from "@/lib/demo-sites/locale-resolution";
import { validateDemoSiteContent } from "@/lib/demo-sites/validation";
import { generateAdaptiveDemoSiteJson } from "@/lib/demo-sites/redesign-intelligence";
import { generateRedesignedHtmlFromSource } from "@/lib/demo-sites/source-redesign-pipeline";
import { generateRestaurantTranslations } from "@/lib/demo-sites/multilingual";
import { getFallbackImagesForSection, mergeSourceAndFallbackImages } from "@/lib/demo-sites/image-augmentation";
import {
  auditGeneratedSiteWithAI,
  buildCorrectionPlanFromAudit,
  correctGeneratedSiteWithAI,
  validateSiteAfterCorrection,
} from "@/lib/demo-sites/quality-review";

export interface PipelineExecutionResult {
  content: DemoSiteContent;
  artifacts: SequentialPipelineArtifacts;
}

type StepStatus = "completed" | "failed";

interface PipelineStageLog {
  step: number;
  key: string;
  status: StepStatus;
  startedAt: string;
  completedAt: string;
  summary: string;
}

interface CrawledPage {
  url: string;
  title: string;
  description?: string;
  links: string[];
  headings: string[];
  paragraphs: string[];
  ctas: string[];
  images: Array<{ url: string; alt: string; width: number; height: number }>;
}

interface CrawlResult {
  sourceUrl: string;
  pages: CrawledPage[];
  discoveredLinks: string[];
  metadata: {
    category: BusinessCategory;
    sameDomainOnly: boolean;
    crawledAt: string;
    maxPages: number;
  };
}

interface RenderedDomPage {
  url: string;
  title: string;
  metaDescription?: string;
  ogTags: {
    title?: string;
    description?: string;
    image?: string;
  };
  dom: string;
  screenshotDataUrl?: string;
  visibleContent: {
    headings: string[];
    paragraphs: string[];
    buttons: string[];
    navItems: string[];
    footerText: string[];
    ctas: string[];
    images: Array<{ src: string; alt: string; width: number; height: number; y: number }>;
  };
}

interface RenderedDomResult {
  pages: RenderedDomPage[];
  metadata: {
    extractedAt: string;
    usedPlaywright: boolean;
    fallbackReason?: string;
  };
}

interface ReconstructedSource {
  reconstructedHtml: string;
  structureSummary: {
    navItems: string[];
    detectedSections: string[];
    ctaInfo: string[];
    contactInfo: {
      phones: string[];
      emails: string[];
      addresses: string[];
    };
    footerInfo: string[];
  };
  sourceStructureJson: SourceStructureJson;
  sourceContentJson: SourceContentJson;
  sourceAssetsJson: SourceAssetsJson;
  sourceBrandSignals: SourceBrandSignals;
}

interface RawContentExtraction {
  rawContentBlocks: string[];
  cleanedContentBlocks: string[];
  fieldCandidates: Record<string, string[]>;
  confidenceLevels: Record<string, "high" | "medium" | "low">;
}

interface RawImageExtraction {
  images: Array<{
    url: string;
    alt: string;
    width: number;
    height: number;
    pageUrl: string;
    domPositionY: number;
    visibilityHint: "high" | "medium" | "low";
  }>;
}

interface NormalizedBusinessContent {
  businessName: string;
  tagline?: string;
  shortDescription?: string;
  aboutText?: string;
  signatureHighlights: string[];
  services: string[];
  menuSections: Array<{ title: string; items: string[] }>;
  rooms: string[];
  amenities: string[];
  testimonials: string[];
  contact: {
    phones: string[];
    emails: string[];
    addresses: string[];
  };
  openingHours: string[];
  reservation: {
    cta?: string;
    links: string[];
  };
  socialLinks: string[];
  mappingDiagnostics: Record<string, unknown>;
  missingFields: string[];
  confidenceScores: Record<string, number>;
}

type ImageRole =
  | "logo"
  | "hero"
  | "gallery"
  | "food"
  | "room"
  | "amenity"
  | "interior"
  | "exterior"
  | "property"
  | "vehicle"
  | "team"
  | "decorative"
  | "unknown";

interface SelectedImagesOutput {
  selectedImages: Array<{ url: string; alt: string; role: ImageRole; qualityScore: number; pageUrl: string }>;
  rejectedImages: Array<{ url: string; reason: string }>;
  missingImageRoles: ImageRole[];
}

interface BrandProfile {
  brandArchetype: string;
  brandConfidence: number;
  visualPersonality: string[];
  conversionPosture: string;
  premiumPotential: "high" | "medium" | "low";
  toneRecommendation: string;
  designDirection: string;
  preserveRecommendations: string[];
  improveRecommendations: string[];
  extractedColors: string[];
}

interface SourceQualityScore {
  score: number;
  breakdown: Record<string, number>;
  mode: "strategy_a" | "strategy_b" | "strategy_c";
  reasoning: string;
}

interface RedesignPlanStep {
  preserve: string[];
  replace: string[];
  rewrite: string[];
  reorder: string[];
  emphasize: string[];
  hide: string[];
  fallbackVisualNeeds: string[];
  premiumDirection: string;
  layoutStyle: string;
  emotionalEffect: string;
  suggestedSectionOrder: Array<DemoSection["type"]>;
  conversionStrategy: string[];
  mobilePriorities: string[];
}

interface CompletedContentOutput {
  completedContent: NormalizedBusinessContent;
  fallbackUsage: Record<string, string>;
  missingCriticalFieldsWarnings: string[];
}

interface TranslatedContentOutput {
  primaryLocale: SupportedLanguage;
  supportedLocales: SupportedLanguage[];
  localized: Record<string, Record<string, unknown>>;
}

interface FinalRenderDataOutput {
  finalSiteStructure: {
    sectionOrder: Array<DemoSection["type"]>;
  };
  finalRenderData: {
    generatedHtmlPreview?: {
      html: string;
      css?: string;
      metadata?: Record<string, unknown>;
    };
    adaptiveSiteJson: AdaptiveSiteComposition;
    usedImageUrls: string[];
    finalLocaleReadyContent: TranslatedContentOutput;
  };
  previewPageData: {
    hasHtmlPreview: boolean;
  };
  content: DemoSiteContent;
}

interface RestaurantSemanticAudit {
  valid: boolean;
  failedChecks: string[];
}

function uniqueStrings(values: string[], limit = 60): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

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
    out.push(normalized);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

async function runAiJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  fallback: T;
}): Promise<T> {
  const openai = getOpenAIClient();
  if (!openai) {
    return params.fallback;
  }

  try {
    const response = await createResponseWithModelFallback(openai, {
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: params.systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: params.userPrompt }],
        },
      ],
      text: { format: { type: "json_object" } },
    });

    const output = response.output_text?.trim();
    if (!output) {
      return params.fallback;
    }

    return JSON.parse(output) as T;
  } catch {
    return params.fallback;
  }
}

function inferImageRoleFromText(text: string): ImageRole {
  const value = text.toLowerCase();
  if (/logo|brand/.test(value)) return "logo";
  if (/hero|header|cover/.test(value)) return "hero";
  if (/food|dish|menu|plate|dessert|cocktail|wine/.test(value)) return "food";
  if (/room|suite|bed/.test(value)) return "room";
  if (/amenit|spa|pool|gym/.test(value)) return "amenity";
  if (/interior|inside|dining/.test(value)) return "interior";
  if (/exterior|outside|facade/.test(value)) return "exterior";
  if (/property|listing|estate|apartment/.test(value)) return "property";
  if (/vehicle|taxi|car/.test(value)) return "vehicle";
  if (/team|staff|chef|driver/.test(value)) return "team";
  if (/icon|badge|payment|social/.test(value)) return "decorative";
  return "unknown";
}

function ensureUrl(input?: string): string | undefined {
  if (!input) {
    return undefined;
  }

  try {
    const parsed = new URL(input);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function normalizeWebsiteUrl(raw?: string): string | undefined {
  const value = (raw ?? "").trim();
  if (!value) {
    return undefined;
  }

  const direct = ensureUrl(value);
  if (direct) {
    return direct;
  }

  return ensureUrl(`https://${value}`);
}

function getCrawlPathHints(category: BusinessCategory): string[] {
  const base = ["about", "contact", "gallery", "services", "reservation", "book"];
  if (category === "restaurant") {
    return [...base, "menu", "food"];
  }
  if (category === "hotel") {
    return [...base, "rooms", "amenities"];
  }
  if (category === "real_estate") {
    return [...base, "properties", "listings"];
  }
  return [...base, "fleet", "rides", "coverage"];
}

function scoreLink(url: string, hints: string[]): number {
  const path = url.toLowerCase();
  let score = 0;
  hints.forEach((hint, index) => {
    if (path.includes(hint)) {
      score += hints.length - index;
    }
  });
  if (path.split("/").filter(Boolean).length <= 3) {
    score += 2;
  }
  if (/privacy|terms|cookie|legal|login|signup|cart|checkout|wp-admin/.test(path)) {
    score -= 10;
  }
  return score;
}

function selectRelevantPages(pages: CrawledPage[], category: BusinessCategory, maxPages = 7): CrawledPage[] {
  const hints = getCrawlPathHints(category);

  return [...pages]
    .sort((a, b) => scoreLink(b.url, hints) - scoreLink(a.url, hints))
    .slice(0, maxPages);
}

function buildSyntheticCrawlResult(params: {
  enriched: EnrichedCommerceLead;
  category: BusinessCategory;
  sourceUrl?: string;
}): CrawlResult {
  const lead = params.enriched.lead;
  const fallbackUrl = params.sourceUrl ?? (lead.website?.startsWith("http") ? lead.website : `https://${lead.website ?? "example.com"}`);
  const shortDescription =
    params.enriched.inferredDescription ??
    lead.description ??
    `${lead.businessName} - ${lead.category} - ${lead.city}`;

  const syntheticPage: CrawledPage = {
    url: fallbackUrl,
    title: lead.businessName,
    description: shortDescription,
    links: [],
    headings: [lead.businessName, lead.city, "Reservation", "Contact"],
    paragraphs: [shortDescription],
    ctas: ["Contact", "Reservation"],
    images: (params.enriched.suggestedImages ?? []).slice(0, 6).map((url) => ({
      url,
      alt: `${lead.businessName} image`,
      width: 1200,
      height: 800,
    })),
  };

  return {
    sourceUrl: fallbackUrl,
    pages: [syntheticPage],
    discoveredLinks: [],
    metadata: {
      category: params.category,
      sameDomainOnly: true,
      crawledAt: new Date().toISOString(),
      maxPages: 1,
    },
  };
}

export async function crawlWebsitePages(params: {
  enriched: EnrichedCommerceLead;
  category: BusinessCategory;
}): Promise<CrawlResult> {
  const sourceUrl = normalizeWebsiteUrl(params.enriched.lead.website);
  const fromEnrichment = params.enriched.extractedWebsite;

  if (!sourceUrl && !fromEnrichment) {
    return buildSyntheticCrawlResult({
      enriched: params.enriched,
      category: params.category,
      sourceUrl,
    });
  }

  let extracted = fromEnrichment ?? null;
  if (!extracted && sourceUrl) {
    try {
      extracted = await extractStructuredBusinessContent(sourceUrl);
    } catch {
      extracted = await extractStructuredBusinessContentWithFetchFallback(sourceUrl);
    }
  }

  if (!extracted || extracted.pages.length === 0) {
    return buildSyntheticCrawlResult({
      enriched: params.enriched,
      category: params.category,
      sourceUrl,
    });
  }

  const pages: CrawledPage[] = extracted.pages.map((page) => ({
    url: page.url,
    title: page.title,
    description: page.description,
    links: page.links,
    headings: page.headings,
    paragraphs: page.paragraphs,
    ctas: page.ctaPhrases,
    images: page.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      width: image.width,
      height: image.height,
    })),
  }));

  const filtered = selectRelevantPages(pages, params.category);
  const discoveredLinks = uniqueStrings(filtered.flatMap((page) => page.links), 200);

  return {
    sourceUrl: extracted.sourceWebsite,
    pages: filtered,
    discoveredLinks,
    metadata: {
      category: params.category,
      sameDomainOnly: true,
      crawledAt: new Date().toISOString(),
      maxPages: filtered.length,
    },
  };
}

export async function extractRenderedDom(input: CrawlResult): Promise<RenderedDomResult> {
  function buildFallbackRenderedDom(reason: string): RenderedDomResult {
    return {
      pages: input.pages.map((page) => ({
        url: page.url,
        title: page.title,
        metaDescription: page.description,
        ogTags: {},
        dom: [
          "<!doctype html>",
          "<html><head>",
          `<title>${page.title}</title>`,
          page.description ? `<meta name=\"description\" content=\"${page.description.replace(/"/g, "&quot;")}\" />` : "",
          "</head><body>",
          ...page.headings.map((heading) => `<h2>${heading}</h2>`),
          ...page.paragraphs.map((paragraph) => `<p>${paragraph}</p>`),
          ...page.ctas.map((cta) => `<button>${cta}</button>`),
          ...page.images.map((image) => `<img src=\"${image.url}\" alt=\"${image.alt || "image"}\" />`),
          "</body></html>",
        ].join("\n"),
        visibleContent: {
          headings: uniqueStrings(page.headings, 40),
          paragraphs: uniqueStrings(page.paragraphs, 200),
          buttons: uniqueStrings(page.ctas, 40),
          navItems: [],
          footerText: [],
          ctas: uniqueStrings(page.ctas, 20),
          images: page.images.map((image) => ({
            src: image.url,
            alt: image.alt,
            width: image.width,
            height: image.height,
            y: 0,
          })),
        },
      })),
      metadata: {
        extractedAt: new Date().toISOString(),
        usedPlaywright: false,
        fallbackReason: reason,
      },
    };
  }

  let chromium: Awaited<typeof import("playwright")>["chromium"];
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return buildFallbackRenderedDom("Playwright package unavailable.");
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Playwright browser launch failed.";
      return buildFallbackRenderedDom(message);
    }

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: true,
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    const pages: RenderedDomPage[] = [];

    for (const crawled of input.pages) {
      const page = await context.newPage();
      try {
        try {
          await page.goto(crawled.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
          try {
            await page.waitForLoadState("networkidle", { timeout: 6_000 });
          } catch {
            // Some websites keep network open continuously.
          }
        } catch {
          pages.push({
            url: crawled.url,
            title: crawled.title,
            metaDescription: crawled.description,
            ogTags: {},
            dom: crawled.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n"),
            visibleContent: {
              headings: uniqueStrings(crawled.headings, 40),
              paragraphs: uniqueStrings(crawled.paragraphs, 200),
              buttons: uniqueStrings(crawled.ctas, 40),
              navItems: [],
              footerText: [],
              ctas: uniqueStrings(crawled.ctas, 20),
              images: crawled.images.map((image) => ({
                src: image.url,
                alt: image.alt,
                width: image.width,
                height: image.height,
                y: 0,
              })),
            },
          });
          continue;
        }

        await page.evaluate(async () => {
          const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const viewport = window.innerHeight;
          const maxHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
          let y = 0;
          while (y < maxHeight) {
            window.scrollTo({ top: y, behavior: "auto" });
            await wait(120);
            y += Math.max(200, Math.floor(viewport * 0.75));
          }
          window.scrollTo({ top: 0, behavior: "auto" });
          await wait(100);
        });

        const extracted = await page.evaluate(() => {
          const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();
          const isVisible = (el: Element): boolean => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el as HTMLElement);
            return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
          };

          const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
            .filter((el) => isVisible(el))
            .map((el) => normalize(el.textContent || ""))
            .filter((text) => text.length >= 2);

          const paragraphs = Array.from(document.querySelectorAll("main p, article p, section p, li"))
            .filter((el) => isVisible(el))
            .map((el) => normalize(el.textContent || ""))
            .filter((text) => text.length >= 25 && text.length <= 1200);

          const buttons = Array.from(document.querySelectorAll("button, [role='button'], a"))
            .filter((el) => isVisible(el))
            .map((el) => normalize(el.textContent || ""))
            .filter((text) => text.length >= 2 && text.length <= 120);

          const navItems = Array.from(document.querySelectorAll("nav a, header a"))
            .filter((el) => isVisible(el))
            .map((el) => normalize(el.textContent || ""))
            .filter((text) => text.length >= 2 && text.length <= 80);

          const footerText = Array.from(document.querySelectorAll("footer p, footer li, footer a"))
            .filter((el) => isVisible(el))
            .map((el) => normalize(el.textContent || ""))
            .filter((text) => text.length >= 3 && text.length <= 300);

          const ctas = buttons.filter((text) => /(book|reserve|call|contact|get|quote|start|menu|visit|learn)/i.test(text));

          const images = Array.from(document.querySelectorAll("img"))
            .filter((el) => isVisible(el))
            .map((img) => {
              const image = img as HTMLImageElement;
              const rect = image.getBoundingClientRect();
              return {
                src: image.currentSrc || image.src || "",
                alt: normalize(image.alt || image.getAttribute("alt") || ""),
                width: Math.round(rect.width || image.naturalWidth || 0),
                height: Math.round(rect.height || image.naturalHeight || 0),
                y: Math.round(rect.y),
              };
            })
            .filter((img) => Boolean(img.src));

          return {
            title: normalize(document.title || ""),
            metaDescription: normalize(document.querySelector('meta[name="description"]')?.getAttribute("content") || ""),
            ogTitle: normalize(document.querySelector('meta[property="og:title"]')?.getAttribute("content") || ""),
            ogDescription: normalize(document.querySelector('meta[property="og:description"]')?.getAttribute("content") || ""),
            ogImage: normalize(document.querySelector('meta[property="og:image"]')?.getAttribute("content") || ""),
            dom: document.documentElement.outerHTML,
            headings,
            paragraphs,
            buttons,
            navItems,
            footerText,
            ctas,
            images,
          };
        });

        let screenshotDataUrl: string | undefined;
        try {
          const buffer = await page.screenshot({ type: "jpeg", quality: 50, fullPage: false });
          screenshotDataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
        } catch {
          screenshotDataUrl = undefined;
        }

        pages.push({
          url: crawled.url,
          title: extracted.title || crawled.title,
          metaDescription: extracted.metaDescription || crawled.description,
          ogTags: {
            title: extracted.ogTitle || undefined,
            description: extracted.ogDescription || undefined,
            image: extracted.ogImage || undefined,
          },
          dom: extracted.dom,
          screenshotDataUrl,
          visibleContent: {
            headings: uniqueStrings(extracted.headings, 40),
            paragraphs: uniqueStrings(extracted.paragraphs, 200),
            buttons: uniqueStrings(extracted.buttons, 40),
            navItems: uniqueStrings(extracted.navItems, 30),
            footerText: uniqueStrings(extracted.footerText, 40),
            ctas: uniqueStrings(extracted.ctas, 20),
            images: extracted.images,
          },
        });
      } finally {
        await page.close();
      }
    }

    return {
      pages,
      metadata: {
        extractedAt: new Date().toISOString(),
        usedPlaywright: true,
      },
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function stripScriptsAndJunk(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<[^>]+class="[^"]*(cookie|consent|popup|modal|banner|tracking)[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
    .trim();
}

function extractContactsFromText(texts: string[]): { phones: string[]; emails: string[]; addresses: string[] } {
  const merged = texts.join(" \n ");
  const phones = uniqueStrings(merged.match(/\+?[0-9][0-9\s().-]{7,}/g) ?? [], 10);
  const emails = uniqueStrings(merged.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [], 10);
  const addresses = uniqueStrings(
    texts.filter((line) => /street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd|city|zip|postal|suite|plaza/i.test(line)),
    10,
  );

  return { phones, emails, addresses };
}

export async function reconstructSourceWebsiteHtml(input: RenderedDomResult): Promise<ReconstructedSource> {
  const navItems = uniqueStrings(input.pages.flatMap((page) => page.visibleContent.navItems), 20);
  const detectedSections = uniqueStrings(
    input.pages.flatMap((page) => page.visibleContent.headings.map((heading) => heading.toLowerCase())),
    40,
  );
  const allParagraphs = uniqueStrings(input.pages.flatMap((page) => page.visibleContent.paragraphs), 260);
  const ctaInfo = uniqueStrings(input.pages.flatMap((page) => page.visibleContent.ctas), 20);
  const footerInfo = uniqueStrings(input.pages.flatMap((page) => page.visibleContent.footerText), 20);
  const contactInfo = extractContactsFromText([...allParagraphs, ...footerInfo]);

  const reconstructedChunks: string[] = ["<site>"];

  input.pages.forEach((page, pageIndex) => {
    reconstructedChunks.push(`  <page index="${pageIndex}" url="${page.url}">`);
    reconstructedChunks.push(`    <title>${page.title}</title>`);
    if (page.metaDescription) {
      reconstructedChunks.push(`    <description>${page.metaDescription}</description>`);
    }

    page.visibleContent.headings.slice(0, 16).forEach((heading, headingIndex) => {
      reconstructedChunks.push(`    <section order="${headingIndex}">`);
      reconstructedChunks.push(`      <heading>${heading}</heading>`);
      page.visibleContent.paragraphs.slice(headingIndex * 2, headingIndex * 2 + 2).forEach((paragraph) => {
        reconstructedChunks.push(`      <paragraph>${paragraph}</paragraph>`);
      });
      page.visibleContent.ctas.slice(0, 3).forEach((cta) => {
        reconstructedChunks.push(`      <button>${cta}</button>`);
      });
      page.visibleContent.images.slice(0, 4).forEach((image) => {
        reconstructedChunks.push(`      <image src="${image.src}" alt="${image.alt || "image"}" />`);
      });
      reconstructedChunks.push("    </section>");
    });

    reconstructedChunks.push("  </page>");
  });

  reconstructedChunks.push("</site>");
  const reconstructedHtml = stripScriptsAndJunk(reconstructedChunks.join("\n"));

  const sourceStructureJson: SourceStructureJson = {
    pages: input.pages.map((page) => ({
      url: page.url,
      title: page.title,
      navItems: page.visibleContent.navItems.slice(0, 8),
      sectionKeys: page.visibleContent.headings.slice(0, 12).map((heading) => heading.toLowerCase().slice(0, 40)),
    })),
    nodes: input.pages.flatMap((page, pageIndex) =>
      page.visibleContent.headings.slice(0, 12).map((heading, headingIndex) => ({
        pageUrl: page.url,
        sectionKey: heading.toLowerCase().slice(0, 40),
        heading,
        paragraphs: page.visibleContent.paragraphs.slice(headingIndex * 2, headingIndex * 2 + 2),
        ctas: page.visibleContent.ctas.slice(0, 3),
        imageUrls: page.visibleContent.images.slice(0, 4).map((image) => image.src),
        order: pageIndex * 100 + headingIndex,
      })),
    ),
  };

  const sourceContentJson: SourceContentJson = {
    headings: uniqueStrings(input.pages.flatMap((page) => page.visibleContent.headings), 80),
    paragraphs: allParagraphs,
    ctas: ctaInfo,
    services: uniqueStrings(allParagraphs.filter((line) => /service|offer|solution|package|menu|room|amenit/i.test(line)), 40),
    menuItems: uniqueStrings(allParagraphs.filter((line) => /menu|dish|starter|dessert|pizza|pasta|cocktail|wine/i.test(line)), 40),
    testimonials: uniqueStrings(allParagraphs.filter((line) => /review|testimonial|client|customer/i.test(line)), 24),
    contacts: contactInfo,
  };

  const sourceAssetsJson: SourceAssetsJson = {
    logoUrl: uniqueStrings(
      input.pages.flatMap((page) => page.visibleContent.images.filter((image) => /logo|brand/i.test(image.alt)).map((image) => image.src)),
      1,
    )[0],
    heroImages: uniqueStrings(
      input.pages.flatMap((page) => page.visibleContent.images.filter((image) => image.width >= 900 && image.height >= 300).map((image) => image.src)),
      10,
    ),
    galleryImages: uniqueStrings(input.pages.flatMap((page) => page.visibleContent.images.map((image) => image.src)), 40),
    allImages: uniqueStrings(input.pages.flatMap((page) => page.visibleContent.images.map((image) => image.src)), 60),
  };

  const sourceBrandSignals: SourceBrandSignals = {
    businessName: sourceContentJson.headings[0],
    slogan: sourceContentJson.paragraphs[0],
    visualTone: sourceContentJson.paragraphs.some((line) => /luxury|premium|exclusive/i.test(line)) ? "premium" : "practical",
    toneOfVoice: sourceContentJson.ctas.some((line) => /book|reserve/i.test(line)) ? "conversion" : "informative",
    ctaStyle: sourceContentJson.ctas[0],
  };

  return {
    reconstructedHtml,
    structureSummary: {
      navItems,
      detectedSections,
      ctaInfo,
      contactInfo,
      footerInfo,
    },
    sourceStructureJson,
    sourceContentJson,
    sourceAssetsJson,
    sourceBrandSignals,
  };
}

export async function extractRawContent(input: ReconstructedSource): Promise<RawContentExtraction> {
  const lines = input.sourceContentJson.paragraphs;
  const headingCandidates = input.sourceContentJson.headings;

  const fieldCandidates: Record<string, string[]> = {
    businessName: headingCandidates.slice(0, 6),
    about: lines.filter((line) => /about|story|mission|welcome/i.test(line)).slice(0, 12),
    services: input.sourceContentJson.services.slice(0, 20),
    menu: input.sourceContentJson.menuItems.slice(0, 20),
    testimonials: input.sourceContentJson.testimonials.slice(0, 12),
    contacts: [
      ...input.sourceContentJson.contacts.phones,
      ...input.sourceContentJson.contacts.emails,
      ...input.sourceContentJson.contacts.addresses,
    ],
    reservationLinks: input.sourceContentJson.ctas.filter((value) => /reserve|book/i.test(value)).slice(0, 8),
  };

  const cleanedContentBlocks = uniqueStrings(
    lines
      .map((line) => line.replace(/[\u0000-\u001F]/g, "").trim())
      .filter((line) => line.length >= 20),
    220,
  );

  return {
    rawContentBlocks: lines,
    cleanedContentBlocks,
    fieldCandidates,
    confidenceLevels: {
      businessName: fieldCandidates.businessName.length ? "high" : "low",
      about: fieldCandidates.about.length >= 2 ? "high" : fieldCandidates.about.length === 1 ? "medium" : "low",
      services: fieldCandidates.services.length >= 3 ? "high" : fieldCandidates.services.length ? "medium" : "low",
      contact: fieldCandidates.contacts.length >= 2 ? "high" : fieldCandidates.contacts.length ? "medium" : "low",
    },
  };
}

export async function extractRawImages(input: RenderedDomResult): Promise<RawImageExtraction> {
  const images = input.pages.flatMap((page) =>
    page.visibleContent.images
      .filter((image) => image.width >= 90 && image.height >= 90)
      .filter((image) => !/icon|badge|payment|social|pixel/.test(`${image.alt} ${image.src}`.toLowerCase()))
      .map((image) => ({
        url: image.src,
        alt: image.alt,
        width: image.width,
        height: image.height,
        pageUrl: page.url,
        domPositionY: image.y,
        visibilityHint: image.width >= 500 && image.height >= 300 ? ("high" as const) : ("medium" as const),
      })),
  );

  return {
    images: images
      .filter((image, index, arr) => arr.findIndex((candidate) => candidate.url === image.url) === index)
      .slice(0, 120),
  };
}

function heuristicNormalizedContent(input: {
  leadName: string;
  rawContent: RawContentExtraction;
  reconstructed: ReconstructedSource;
}): NormalizedBusinessContent {
  const aboutText = input.rawContent.fieldCandidates.about[0] ?? input.rawContent.cleanedContentBlocks[0];

  const businessName =
    input.rawContent.fieldCandidates.businessName.find((value) => value.length >= 3 && value.length <= 80) ??
    input.leadName;

  const socialLinks = uniqueStrings(
    input.reconstructed.sourceContentJson.paragraphs.filter((line) => /instagram|facebook|linkedin|tiktok|youtube|x\.com/i.test(line)),
    10,
  );

  return {
    businessName,
    tagline: input.rawContent.fieldCandidates.about[0],
    shortDescription: input.rawContent.cleanedContentBlocks[0],
    aboutText,
    signatureHighlights: uniqueStrings(input.reconstructed.sourceContentJson.headings.slice(1), 6),
    services: uniqueStrings(input.rawContent.fieldCandidates.services, 12),
    menuSections: [
      {
        title: "Highlights",
        items: uniqueStrings(input.rawContent.fieldCandidates.menu, 8),
      },
    ].filter((section) => section.items.length > 0),
    rooms: uniqueStrings(input.rawContent.cleanedContentBlocks.filter((line) => /room|suite/i.test(line)), 8),
    amenities: uniqueStrings(input.rawContent.cleanedContentBlocks.filter((line) => /amenit|pool|spa|wifi|parking/i.test(line)), 10),
    testimonials: uniqueStrings(input.rawContent.fieldCandidates.testimonials, 6),
    contact: {
      phones: uniqueStrings(input.reconstructed.structureSummary.contactInfo.phones, 6),
      emails: uniqueStrings(input.reconstructed.structureSummary.contactInfo.emails, 6),
      addresses: uniqueStrings(input.reconstructed.structureSummary.contactInfo.addresses, 6),
    },
    openingHours: uniqueStrings(
      input.rawContent.cleanedContentBlocks.filter((line) => /mon|tue|wed|thu|fri|sat|sun|open|close|hour/i.test(line)),
      10,
    ),
    reservation: {
      cta: input.reconstructed.structureSummary.ctaInfo.find((cta) => /reserve|book|appointment/i.test(cta)),
      links: [],
    },
    socialLinks,
    mappingDiagnostics: {
      sourceHeadings: input.reconstructed.sourceContentJson.headings.length,
      sourceParagraphs: input.reconstructed.sourceContentJson.paragraphs.length,
    },
    missingFields: [],
    confidenceScores: {
      businessName: 0.75,
      aboutText: aboutText ? 0.8 : 0.2,
      services: Math.min(1, input.rawContent.fieldCandidates.services.length / 6),
      contact: input.reconstructed.structureSummary.contactInfo.phones.length || input.reconstructed.structureSummary.contactInfo.emails.length ? 0.8 : 0.3,
    },
  };
}

export async function mapContentWithAI(input: {
  leadName: string;
  rawContent: RawContentExtraction;
  reconstructed: ReconstructedSource;
}): Promise<NormalizedBusinessContent> {
  const fallback = heuristicNormalizedContent(input);

  const aiResult = await runAiJson<Partial<NormalizedBusinessContent>>({
    systemPrompt:
      "You are a senior content strategist. Return strict JSON. Map extracted business content into normalized fields. Preserve facts and avoid generic filler.",
    userPrompt: [
      "Map and classify this raw extraction into normalized business JSON.",
      "Do not invent critical facts. Include missingFields and confidenceScores.",
      JSON.stringify({
        leadName: input.leadName,
        fieldCandidates: input.rawContent.fieldCandidates,
        cleanedBlocks: input.rawContent.cleanedContentBlocks.slice(0, 120),
        structureSummary: input.reconstructed.structureSummary,
      }),
    ].join("\n\n"),
    fallback,
  });

  return {
    ...fallback,
    ...aiResult,
    contact: {
      ...fallback.contact,
      ...(aiResult.contact ?? {}),
      phones: uniqueStrings([...(fallback.contact.phones ?? []), ...((aiResult.contact?.phones as string[] | undefined) ?? [])], 10),
      emails: uniqueStrings([...(fallback.contact.emails ?? []), ...((aiResult.contact?.emails as string[] | undefined) ?? [])], 10),
      addresses: uniqueStrings([...(fallback.contact.addresses ?? []), ...((aiResult.contact?.addresses as string[] | undefined) ?? [])], 10),
    },
    signatureHighlights: uniqueStrings([...(fallback.signatureHighlights ?? []), ...((aiResult.signatureHighlights as string[] | undefined) ?? [])], 8),
    services: uniqueStrings([...(fallback.services ?? []), ...((aiResult.services as string[] | undefined) ?? [])], 14),
    testimonials: uniqueStrings([...(fallback.testimonials ?? []), ...((aiResult.testimonials as string[] | undefined) ?? [])], 8),
    socialLinks: uniqueStrings([...(fallback.socialLinks ?? []), ...((aiResult.socialLinks as string[] | undefined) ?? [])], 10),
    missingFields: Array.isArray(aiResult.missingFields) ? aiResult.missingFields : fallback.missingFields,
    confidenceScores: {
      ...fallback.confidenceScores,
      ...(aiResult.confidenceScores ?? {}),
    },
    mappingDiagnostics: {
      ...fallback.mappingDiagnostics,
      ...(aiResult.mappingDiagnostics ?? {}),
      pipelineStep: "mapContentWithAI",
    },
  };
}

export async function classifyImagesWithAI(input: {
  rawImages: RawImageExtraction;
  category: BusinessCategory;
}): Promise<SelectedImagesOutput> {
  const heuristic = input.rawImages.images.map((image) => {
    const role = inferImageRoleFromText(`${image.alt} ${image.url}`);
    const qualityScore = Math.min(100, Math.round((image.width * image.height) / 6000));
    return {
      url: image.url,
      alt: image.alt,
      role,
      qualityScore,
      pageUrl: image.pageUrl,
    };
  });

  const fallback: SelectedImagesOutput = {
    selectedImages: heuristic.filter((image) => image.role !== "decorative" && image.qualityScore >= 12).slice(0, 24),
    rejectedImages: heuristic
      .filter((image) => image.role === "decorative" || image.qualityScore < 12)
      .map((image) => ({ url: image.url, reason: image.role === "decorative" ? "decorative" : "low_quality" }))
      .slice(0, 40),
    missingImageRoles: ["hero", "gallery", "logo"].filter(
      (role) => !heuristic.some((image) => image.role === role),
    ) as ImageRole[],
  };

  const aiResult = await runAiJson<Partial<SelectedImagesOutput>>({
    systemPrompt:
      "You are a visual director. Classify images by semantic role, reject weak assets, and return JSON with selectedImages, rejectedImages, missingImageRoles.",
    userPrompt: JSON.stringify({ category: input.category, images: heuristic.slice(0, 80) }),
    fallback,
  });

  return {
    selectedImages: Array.isArray(aiResult.selectedImages)
      ? (aiResult.selectedImages as SelectedImagesOutput["selectedImages"]).slice(0, 30)
      : fallback.selectedImages,
    rejectedImages: Array.isArray(aiResult.rejectedImages)
      ? (aiResult.rejectedImages as SelectedImagesOutput["rejectedImages"]).slice(0, 60)
      : fallback.rejectedImages,
    missingImageRoles: Array.isArray(aiResult.missingImageRoles)
      ? (aiResult.missingImageRoles as ImageRole[])
      : fallback.missingImageRoles,
  };
}

function extractColorsFromDom(dom: RenderedDomResult): string[] {
  const rawColors = dom.pages.flatMap((page) => {
    const matches = page.dom.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) ?? [];
    return matches.map((color) => color.toLowerCase());
  });

  return uniqueStrings(rawColors, 12);
}

export async function analyzeBrandWithAI(input: {
  reconstructed: ReconstructedSource;
  normalizedContent: NormalizedBusinessContent;
  selectedImages: SelectedImagesOutput;
  renderedDom: RenderedDomResult;
}): Promise<BrandProfile> {
  const extractedColors = extractColorsFromDom(input.renderedDom);
  const fallback: BrandProfile = {
    brandArchetype: input.normalizedContent.services.length >= 4 ? "premium-service" : "boutique",
    brandConfidence: Math.max(0.35, Math.min(0.95, 0.4 + input.normalizedContent.services.length * 0.05)),
    visualPersonality: ["modern", "clean", "conversion-ready"],
    conversionPosture: input.reconstructed.structureSummary.ctaInfo.length ? "active" : "light",
    premiumPotential: input.selectedImages.selectedImages.length >= 8 ? "high" : "medium",
    toneRecommendation: "premium and authentic",
    designDirection: "bold hierarchy with refined spacing",
    preserveRecommendations: input.reconstructed.structureSummary.navItems.slice(0, 5),
    improveRecommendations: ["hero clarity", "cta emphasis", "content density"],
    extractedColors,
  };

  const aiResult = await runAiJson<Partial<BrandProfile>>({
    systemPrompt:
      "You are a brand strategist and design director. Analyze source DNA and return concise JSON brand profile for redesign decisions.",
    userPrompt: JSON.stringify({
      structureSummary: input.reconstructed.structureSummary,
      normalizedContent: input.normalizedContent,
      selectedImageStats: {
        selected: input.selectedImages.selectedImages.length,
        missingRoles: input.selectedImages.missingImageRoles,
      },
      extractedColors,
    }),
    fallback,
  });

  return {
    ...fallback,
    ...aiResult,
    visualPersonality: Array.isArray(aiResult.visualPersonality)
      ? uniqueStrings(aiResult.visualPersonality.map(String), 8)
      : fallback.visualPersonality,
    preserveRecommendations: Array.isArray(aiResult.preserveRecommendations)
      ? uniqueStrings(aiResult.preserveRecommendations.map(String), 8)
      : fallback.preserveRecommendations,
    improveRecommendations: Array.isArray(aiResult.improveRecommendations)
      ? uniqueStrings(aiResult.improveRecommendations.map(String), 8)
      : fallback.improveRecommendations,
    extractedColors,
  };
}

export async function scoreSourceQualityWithAI(input: {
  normalizedContent: NormalizedBusinessContent;
  selectedImages: SelectedImagesOutput;
  brandProfile: BrandProfile;
}): Promise<SourceQualityScore> {
  const breakdown = {
    logoQuality: input.selectedImages.selectedImages.some((image) => image.role === "logo") ? 80 : 35,
    imageQuality: Math.min(100, input.selectedImages.selectedImages.length * 7),
    imageCompleteness: Math.max(30, 100 - input.selectedImages.missingImageRoles.length * 18),
    contentRichness: Math.min(100, input.normalizedContent.services.length * 10 + input.normalizedContent.testimonials.length * 12),
    structureClarity: input.normalizedContent.signatureHighlights.length >= 3 ? 80 : 55,
    contactCompleteness: input.normalizedContent.contact.phones.length || input.normalizedContent.contact.emails.length ? 80 : 35,
    brandCoherence: Math.round(input.brandProfile.brandConfidence * 100),
  };

  const baseline = Math.round(Object.values(breakdown).reduce((acc, value) => acc + value, 0) / Object.keys(breakdown).length);
  const fallback: SourceQualityScore = {
    score: baseline,
    breakdown,
    mode: baseline >= 75 ? "strategy_a" : baseline >= 50 ? "strategy_b" : "strategy_c",
    reasoning: baseline >= 75 ? "Strong source material with good preservation potential." : baseline >= 50 ? "Mixed quality source; preserve identity and improve weak parts." : "Weak source; preserve key facts and apply premium fallback enhancements.",
  };

  const aiResult = await runAiJson<Partial<SourceQualityScore>>({
    systemPrompt:
      "You are a website quality auditor. Score source quality and choose mode among strategy_a, strategy_b, strategy_c. Return JSON.",
    userPrompt: JSON.stringify({ breakdown, normalizedContent: input.normalizedContent, missingRoles: input.selectedImages.missingImageRoles }),
    fallback,
  });

  return {
    ...fallback,
    ...aiResult,
    score: typeof aiResult.score === "number" ? Math.max(0, Math.min(100, Math.round(aiResult.score))) : fallback.score,
    breakdown: {
      ...breakdown,
      ...(aiResult.breakdown ?? {}),
    },
    mode: aiResult.mode === "strategy_a" || aiResult.mode === "strategy_b" || aiResult.mode === "strategy_c" ? aiResult.mode : fallback.mode,
  };
}

export async function buildRedesignPlanWithAI(input: {
  normalizedContent: NormalizedBusinessContent;
  selectedImages: SelectedImagesOutput;
  brandProfile: BrandProfile;
  sourceQuality: SourceQualityScore;
  category: BusinessCategory;
}): Promise<RedesignPlanStep> {
  const fallback: RedesignPlanStep = {
    preserve: uniqueStrings([
      input.normalizedContent.businessName,
      ...(input.normalizedContent.signatureHighlights ?? []),
      ...(input.brandProfile.preserveRecommendations ?? []),
    ], 10),
    replace: input.sourceQuality.mode === "strategy_c" ? ["weak hero visuals", "thin body copy"] : ["generic headings"],
    rewrite: ["hero subtitle", "cta microcopy"],
    reorder: ["hero", "about", "services", "gallery", "testimonials", "cta", "contact"],
    emphasize: ["hero", "cta", "proof blocks"],
    hide: ["low-value repetitive paragraphs"],
    fallbackVisualNeeds: input.selectedImages.missingImageRoles,
    premiumDirection: input.brandProfile.designDirection,
    layoutStyle: input.category === "restaurant" ? "immersive editorial" : "conversion premium grid",
    emotionalEffect: "trust, desirability, and clarity",
    suggestedSectionOrder: ["hero", "about", "services", "gallery", "testimonials", "cta", "contact"],
    conversionStrategy: ["single primary CTA", "sticky contact touchpoints", "trust proof near CTA"],
    mobilePriorities: ["hero readability", "fast load", "thumb-friendly CTA"],
  };

  const aiResult = await runAiJson<Partial<RedesignPlanStep>>({
    systemPrompt:
      "You are a premium redesign strategist. Return a practical redesign plan JSON with preserve/replace/rewrite/reorder and conversion-first decisions.",
    userPrompt: JSON.stringify(input),
    fallback,
  });

  return {
    ...fallback,
    ...aiResult,
    preserve: Array.isArray(aiResult.preserve) ? uniqueStrings(aiResult.preserve.map(String), 12) : fallback.preserve,
    replace: Array.isArray(aiResult.replace) ? uniqueStrings(aiResult.replace.map(String), 12) : fallback.replace,
    rewrite: Array.isArray(aiResult.rewrite) ? uniqueStrings(aiResult.rewrite.map(String), 12) : fallback.rewrite,
    reorder: Array.isArray(aiResult.reorder) ? uniqueStrings(aiResult.reorder.map(String), 12) : fallback.reorder,
    emphasize: Array.isArray(aiResult.emphasize) ? uniqueStrings(aiResult.emphasize.map(String), 8) : fallback.emphasize,
    hide: Array.isArray(aiResult.hide) ? uniqueStrings(aiResult.hide.map(String), 8) : fallback.hide,
    fallbackVisualNeeds: Array.isArray(aiResult.fallbackVisualNeeds)
      ? (uniqueStrings(aiResult.fallbackVisualNeeds.map(String), 8) as ImageRole[])
      : fallback.fallbackVisualNeeds,
    suggestedSectionOrder: Array.isArray(aiResult.suggestedSectionOrder)
      ? (aiResult.suggestedSectionOrder.filter((value): value is DemoSection["type"] => typeof value === "string") as DemoSection["type"][])
      : fallback.suggestedSectionOrder,
    conversionStrategy: Array.isArray(aiResult.conversionStrategy)
      ? uniqueStrings(aiResult.conversionStrategy.map(String), 8)
      : fallback.conversionStrategy,
    mobilePriorities: Array.isArray(aiResult.mobilePriorities)
      ? uniqueStrings(aiResult.mobilePriorities.map(String), 8)
      : fallback.mobilePriorities,
  };
}

export async function completeMissingContentWithAI(input: {
  normalizedContent: NormalizedBusinessContent;
  redesignPlan: RedesignPlanStep;
}): Promise<CompletedContentOutput> {
  const fr = looksFrench(
    input.normalizedContent.businessName,
    input.normalizedContent.tagline,
    input.normalizedContent.shortDescription,
    input.normalizedContent.aboutText,
    ...input.normalizedContent.services,
  );

  const fallbackUsage: Record<string, string> = {};
  const completed: NormalizedBusinessContent = {
    ...input.normalizedContent,
    tagline: input.normalizedContent.tagline ?? specificPlaceholder("tagline", fr),
    shortDescription:
      input.normalizedContent.shortDescription ??
      input.normalizedContent.aboutText?.slice(0, 180) ??
      specificPlaceholder("description", fr),
    aboutText:
      input.normalizedContent.aboutText ??
      specificPlaceholder("about", fr),
    services:
      input.normalizedContent.services.length > 0
        ? input.normalizedContent.services
        : [
            specificPlaceholder("service", fr),
            fr ? "[A COMPLETER: Offre secondaire]" : "[TO COMPLETE: Secondary offer]",
          ],
  } as NormalizedBusinessContent;

  if (!input.normalizedContent.tagline) {
    fallbackUsage.tagline = "generated";
  }
  if (!input.normalizedContent.shortDescription) {
    fallbackUsage.shortDescription = "generated";
  }
  if (!input.normalizedContent.aboutText) {
    fallbackUsage.aboutText = "generated";
  }
  if (input.normalizedContent.services.length === 0) {
    fallbackUsage.services = "generated";
  }

  const warnings: string[] = [];
  if (!completed.contact.phones.length && !completed.contact.emails.length) {
    warnings.push("Critical: no direct contact channel extracted.");
  }
  if (completed.services.length < 2) {
    warnings.push("Critical: very limited service inventory.");
  }

  const aiResult = await runAiJson<Partial<CompletedContentOutput>>({
    systemPrompt:
      "You refine website content with strict source fidelity. Never invent claims. Remove superfluous filler. Keep only useful business information. If data is missing, keep explicit placeholders. Return JSON with completedContent, fallbackUsage, missingCriticalFieldsWarnings.",
    userPrompt: JSON.stringify({ normalizedContent: completed, redesignPlan: input.redesignPlan }),
    fallback: {
      completedContent: completed,
      fallbackUsage,
      missingCriticalFieldsWarnings: warnings,
    },
  });

  return {
    completedContent: {
      ...completed,
      ...(aiResult.completedContent ?? {}),
      services: Array.isArray(aiResult.completedContent?.services)
        ? uniqueStrings(aiResult.completedContent.services.map(String), 14)
        : completed.services,
      signatureHighlights: Array.isArray(aiResult.completedContent?.signatureHighlights)
        ? uniqueStrings(aiResult.completedContent.signatureHighlights.map(String), 8)
        : completed.signatureHighlights,
    },
    fallbackUsage: {
      ...fallbackUsage,
      ...(aiResult.fallbackUsage ?? {}),
    },
    missingCriticalFieldsWarnings: Array.isArray(aiResult.missingCriticalFieldsWarnings)
      ? aiResult.missingCriticalFieldsWarnings.map(String)
      : warnings,
  };
}

export async function translateContentWithAI(input: {
  completedContent: NormalizedBusinessContent;
  city?: string;
  country?: string;
}): Promise<TranslatedContentOutput> {
  const primaryLocale = resolvePrimaryLocale(input.city, input.country);
  const supportedLocales = buildSupportedLocales(primaryLocale);

  const fallbackLocalized: Record<string, Record<string, unknown>> = {
    [primaryLocale]: {
      businessName: input.completedContent.businessName,
      tagline: input.completedContent.tagline,
      shortDescription: input.completedContent.shortDescription,
      aboutText: input.completedContent.aboutText,
      services: input.completedContent.services,
      cta: input.completedContent.reservation.cta ?? "Contact us",
    },
  };

  if (!fallbackLocalized.en) {
    fallbackLocalized.en = {
      businessName: input.completedContent.businessName,
      tagline: input.completedContent.tagline,
      shortDescription: input.completedContent.shortDescription,
      aboutText: input.completedContent.aboutText,
      services: input.completedContent.services,
      cta: "Contact us",
    };
  }

  const aiResult = await runAiJson<Partial<TranslatedContentOutput>>({
    systemPrompt:
      "Translate naturally while preserving facts (names, prices, addresses). Return JSON with primaryLocale, supportedLocales, localized.",
    userPrompt: JSON.stringify({
      primaryLocale,
      supportedLocales,
      content: input.completedContent,
    }),
    fallback: {
      primaryLocale,
      supportedLocales,
      localized: fallbackLocalized,
    },
  });

  return {
    primaryLocale,
    supportedLocales,
    localized: {
      ...fallbackLocalized,
      ...(aiResult.localized ?? {}),
    },
  };
}

function toThemeFromBrand(brand: BrandProfile): DemoSiteContent["theme"] {
  const colors = brand.extractedColors;
  return {
    primaryColor: colors[0] ?? "#13151a",
    secondaryColor: colors[1] ?? "#f4f2ed",
    accentColor: colors[2] ?? "#b4874c",
    backgroundStyle: "adaptive",
    headingFont: "Playfair Display",
    bodyFont: "Manrope",
    buttonVariant: "solid",
    borderRadius: "soft",
    tone: brand.premiumPotential === "high" ? "luxury" : "premium",
  };
}

function mapImageRoleToRestaurantRole(role: ImageRole): RestaurantContent["visualAssets"][number]["role"] {
  if (role === "logo") return "logo";
  if (role === "hero") return "hero";
  if (role === "food") return "food";
  if (role === "room") return "room";
  if (role === "amenity") return "amenity";
  if (role === "interior") return "interior";
  if (role === "exterior") return "property_exterior";
  if (role === "property") return "property_exterior";
  if (role === "vehicle") return "vehicle";
  if (role === "team") return "team";
  if (role === "decorative") return "decorative";
  return "gallery";
}

function localeText(primaryLocale: RestaurantLocaleCode) {
  if (primaryLocale === "fr") {
    return {
      reserve: "Reserver",
      viewMenu: "Voir la carte",
      about: "A propos",
      menu: "Nos plats",
      gallery: "Galerie",
      contact: "Contact",
      reservation: "Reservation",
      details: "Informations pratiques",
    };
  }

  return {
    reserve: "Reserve",
    viewMenu: "View menu",
    about: "About",
    menu: "Menu",
    gallery: "Gallery",
    contact: "Contact",
    reservation: "Reservation",
    details: "Details",
  };
}

function looksFrench(...values: Array<string | undefined>): boolean {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return /\b(le|la|les|des|avec|pour|restaurant|contact|horaires|adresse|ville)\b/.test(text);
}

function specificPlaceholder(
  field: "tagline" | "description" | "about" | "service" | "phone" | "email" | "address" | "hours",
  isFr: boolean,
): string {
  if (isFr) {
    if (field === "tagline") return "[A COMPLETER: Positionnement principal]";
    if (field === "description") return "[A COMPLETER: Description courte de l'etablissement]";
    if (field === "about") return "[A COMPLETER: Presentation detaillee de l'etablissement]";
    if (field === "service") return "[A COMPLETER: Offre principale]";
    if (field === "phone") return "[A COMPLETER: Telephone]";
    if (field === "email") return "[A COMPLETER: Email de contact]";
    if (field === "address") return "[A COMPLETER: Adresse]";
    return "[A COMPLETER: Horaires d'ouverture]";
  }

  if (field === "tagline") return "[TO COMPLETE: Primary positioning]";
  if (field === "description") return "[TO COMPLETE: Short business description]";
  if (field === "about") return "[TO COMPLETE: Detailed business presentation]";
  if (field === "service") return "[TO COMPLETE: Main offer]";
  if (field === "phone") return "[TO COMPLETE: Phone number]";
  if (field === "email") return "[TO COMPLETE: Contact email]";
  if (field === "address") return "[TO COMPLETE: Address]";
  return "[TO COMPLETE: Opening hours]";
}

async function buildRestaurantSourceFirstContent(input: {
  lead: EnrichedCommerceLead["lead"];
  reconstructed: ReconstructedSource;
  normalizedContent: NormalizedBusinessContent;
  selectedImages: SelectedImagesOutput;
  brandProfile: BrandProfile;
}): Promise<RestaurantContent> {
  const primaryLocale = resolvePrimaryLocale(input.lead.city, input.lead.country) as RestaurantLocaleCode;
  const supportedLocales = buildSupportedLocales(primaryLocale) as RestaurantLocaleCode[];
  const localText = localeText(primaryLocale);

  const reservationLabelFromSource = input.reconstructed.structureSummary.ctaInfo.find((line) =>
    /(reserv|reserve|book|table|tableau|livraison|commander)/i.test(line),
  );
  const reservationUrl = input.normalizedContent.reservation.links.find((value) => /^https?:\/\//i.test(value));

  const sourceHeroAssets = input.selectedImages.selectedImages
    .filter((image) => ["hero", "food", "interior", "gallery"].includes(image.role))
    .map((image) => ({
      url: image.url,
      role: mapImageRoleToRestaurantRole(image.role),
      sourceType: "source" as const,
      sectionId: "hero",
      origin: "pipeline-selected",
      alt: image.alt,
    }));

  const heroAssets = mergeSourceAndFallbackImages({
    sourceImages: sourceHeroAssets,
    fallbackImages: getFallbackImagesForSection({
      category: "restaurant",
      sectionId: "hero",
      preferredRoles: ["hero", "food", "dining_room", "interior"],
      limit: 4,
    }),
    minRequired: 1,
    maxTotal: 4,
  });

  const sourceGalleryAssets = input.selectedImages.selectedImages
    .filter((image) => !["logo", "decorative"].includes(image.role))
    .map((image) => ({
      url: image.url,
      role: mapImageRoleToRestaurantRole(image.role),
      sourceType: "source" as const,
      sectionId: "gallery",
      origin: "pipeline-selected",
      alt: image.alt,
    }));

  const galleryAssets = mergeSourceAndFallbackImages({
    sourceImages: sourceGalleryAssets,
    fallbackImages: getFallbackImagesForSection({
      category: "restaurant",
      sectionId: "gallery",
      preferredRoles: ["gallery", "food", "dining_room", "interior", "team"],
      limit: 16,
    }),
    minRequired: 4,
    maxTotal: 16,
  });

  const menuSections = input.normalizedContent.menuSections.length
    ? input.normalizedContent.menuSections.map((section) => ({
        title: section.title,
        items: section.items.slice(0, 10).map((item) => ({ name: item })),
      }))
    : [
        {
          title: primaryLocale === "fr" ? "Carte" : "Menu",
          items: input.reconstructed.sourceContentJson.menuItems.slice(0, 12).map((item) => ({ name: item })),
        },
      ].filter((section) => section.items.length > 0);

  const socialLinks = input.normalizedContent.socialLinks
    .filter((value) => /^https?:\/\//i.test(value))
    .map((url) => {
      const platform = /instagram/i.test(url)
        ? "instagram"
        : /facebook/i.test(url)
          ? "facebook"
          : /tiktok/i.test(url)
            ? "tiktok"
            : /linkedin/i.test(url)
              ? "linkedin"
              : /youtube/i.test(url)
                ? "youtube"
                : "website";
      return { platform, url };
    });

  const restaurant: RestaurantContent = {
    restaurantName: input.normalizedContent.businessName || input.lead.businessName,
    primaryLocale,
    supportedLocales,
    tagline: input.normalizedContent.tagline,
    shortDescription: input.normalizedContent.shortDescription,
    aboutText: input.normalizedContent.aboutText,
    signatureHighlights: input.normalizedContent.signatureHighlights,
    brandColors: {
      primary: input.brandProfile.extractedColors[0],
      secondary: input.brandProfile.extractedColors[1],
      accent: input.brandProfile.extractedColors[2],
    },
    logoUrl: input.selectedImages.selectedImages.find((image) => image.role === "logo")?.url,
    heroImages: heroAssets.map((image) => image.url),
    galleryImages: galleryAssets.map((image) => image.url),
    contact: {
      phone: input.normalizedContent.contact.phones[0] ?? input.lead.phone,
      email: input.normalizedContent.contact.emails[0] ?? input.lead.email,
      address: input.normalizedContent.contact.addresses[0] ?? input.lead.address,
    },
    openingHours: input.normalizedContent.openingHours,
    reservation: {
      label: reservationLabelFromSource ?? localText.reserve,
      url: reservationUrl,
    },
    menuSections,
    menuPdfUrls: input.normalizedContent.reservation.links.filter((value) => /\.pdf(\?|$)/i.test(value)),
    menuPubliclyAvailable: menuSections.some((section) => section.items.length > 0),
    testimonials: input.normalizedContent.testimonials.slice(0, 6).map((text) => ({ text })),
    socialLinks,
    visualAssets: [
      ...heroAssets.map((image) => ({
        url: image.url,
        role: mapImageRoleToRestaurantRole((image.role as ImageRole) ?? "gallery"),
        sourceType: image.sourceType,
        sectionId: "hero",
        origin: image.origin,
      })),
      ...galleryAssets.map((image) => ({
        url: image.url,
        role: mapImageRoleToRestaurantRole((image.role as ImageRole) ?? "gallery"),
        sourceType: image.sourceType,
        sectionId: "gallery",
        origin: image.origin,
      })),
    ],
    translations: {},
    sourceUrl: input.lead.website?.startsWith("http") ? input.lead.website : `https://${input.lead.website ?? "example.com"}`,
    extractionConfidence: {
      content: input.normalizedContent.services.length > 0 ? "high" : "medium",
      images: input.selectedImages.selectedImages.length >= 4 ? "high" : "medium",
      menu: menuSections.length > 0 ? "high" : "low",
      colors: input.brandProfile.extractedColors.length >= 2 ? "high" : "low",
    },
  };

  restaurant.translations = await generateRestaurantTranslations({
    base: restaurant,
    primaryLocale,
    supportedLocales,
  });

  return restaurant;
}

function buildRestaurantSemanticSections(input: {
  restaurant: RestaurantContent;
  sourceNavItems: string[];
}): DemoSection[] {
  const localText = localeText(input.restaurant.primaryLocale);
  const aboutTitle =
    input.sourceNavItems.find((item) => /a propos|about|histoire|story/i.test(item)) ?? localText.about;
  const menuTitle =
    input.sourceNavItems.find((item) => /carte|menu|plats|dish/i.test(item)) ?? localText.menu;
  const reservationTitle =
    input.sourceNavItems.find((item) => /reserv|book|table/i.test(item)) ?? localText.reservation;

  const sections: DemoSection[] = [
    {
      id: "restaurant-hero-0",
      type: "hero",
      enabled: true,
      order: 0,
      styleVariant: "restaurant-source-first",
      content: {
        badge: input.restaurant.primaryLocale === "fr" ? "Restaurant" : "Restaurant",
        title: input.restaurant.restaurantName,
        subtitle: input.restaurant.shortDescription ?? input.restaurant.aboutText ?? "",
        primaryCta: {
          label: input.restaurant.reservation?.label ?? localText.reserve,
          href: input.restaurant.reservation?.url ?? "#contact",
        },
        secondaryCta: {
          label: localText.viewMenu,
          href: "#menu",
        },
        image: input.restaurant.heroImages[0] ?? input.restaurant.galleryImages[0],
      },
    },
    {
      id: "restaurant-menu-1",
      type: "menu_highlights",
      enabled: true,
      order: 1,
      styleVariant: "restaurant-source-first",
      content: {
        title: menuTitle,
        items: input.restaurant.menuSections.flatMap((section) =>
          section.items.slice(0, 6).map((item) => ({
            name: item.name,
            description: item.description ?? section.title,
            priceHint: item.price,
            image: input.restaurant.galleryImages[0],
          })),
        ).slice(0, 8),
      },
    },
    {
      id: "restaurant-about-2",
      type: "about",
      enabled: true,
      order: 2,
      styleVariant: "restaurant-source-first",
      content: {
        title: aboutTitle,
        body: input.restaurant.aboutText ?? input.restaurant.shortDescription ?? "",
        bullets: input.restaurant.signatureHighlights.slice(0, 5),
      },
    },
    {
      id: "restaurant-gallery-3",
      type: "gallery",
      enabled: true,
      order: 3,
      styleVariant: "restaurant-source-first",
      content: {
        title: localText.gallery,
        items: input.restaurant.galleryImages.slice(0, 10).map((image, index) => ({
          image,
          alt: `${input.restaurant.restaurantName} ${index + 1}`,
        })),
      },
    },
    {
      id: "restaurant-cta-4",
      type: "cta",
      enabled: true,
      order: 4,
      styleVariant: "restaurant-source-first",
      content: {
        title: reservationTitle,
        body: input.restaurant.primaryLocale === "fr" ? "Reservez votre table en quelques clics." : "Reserve your table in a few clicks.",
        action: {
          label: input.restaurant.reservation?.label ?? localText.reserve,
          href: input.restaurant.reservation?.url ?? "#contact",
        },
      },
    },
    {
      id: "restaurant-contact-5",
      type: "contact",
      enabled: true,
      order: 5,
      styleVariant: "restaurant-source-first",
      content: {
        title: localText.details,
        address: input.restaurant.contact.address,
        phone: input.restaurant.contact.phone,
        email: input.restaurant.contact.email,
        hours: input.restaurant.openingHours,
      },
    },
  ];

  return sections
    .filter((section) => section.type !== "gallery" || section.content.items.length > 0)
    .filter((section) => section.type !== "menu_highlights" || section.content.items.length > 0)
    .map((section, index) => ({ ...section, order: index, id: `${section.type}-${index}` }));
}

function auditRestaurantSemantics(input: {
  content: DemoSiteContent;
  expectedPrimaryLocale: RestaurantLocaleCode;
}): RestaurantSemanticAudit {
  const failedChecks: string[] = [];
  const restaurant = input.content.restaurantContent;
  if (!restaurant) {
    return { valid: false, failedChecks: ["missing_restaurant_content"] };
  }

  if (!restaurant.restaurantName || !input.content.businessInfo.name) {
    failedChecks.push("restaurant_name_not_preserved");
  }

  if (
    restaurant.restaurantName &&
    input.content.businessInfo.name &&
    restaurant.restaurantName.toLowerCase() !== input.content.businessInfo.name.toLowerCase()
  ) {
    failedChecks.push("restaurant_name_mismatch_between_layers");
  }

  if (!restaurant.reservation?.label && !restaurant.reservation?.url) {
    failedChecks.push("reservation_missing");
  }

  if (!restaurant.menuPubliclyAvailable && restaurant.menuSections.length === 0 && restaurant.menuPdfUrls.length === 0) {
    failedChecks.push("menu_not_represented");
  }

  if (!restaurant.openingHours?.length) {
    failedChecks.push("opening_hours_missing");
  }

  const hasAddress = Boolean(restaurant.contact.address?.trim());
  const hasPhone = Boolean(restaurant.contact.phone?.trim());
  const hasEmail = Boolean(restaurant.contact.email?.trim());
  if (!hasAddress || !hasPhone || !hasEmail) {
    failedChecks.push("contact_blocks_incomplete");
  }

  if (restaurant.primaryLocale !== input.expectedPrimaryLocale) {
    failedChecks.push("source_language_not_default");
  }

  const atmosphereText = `${restaurant.aboutText ?? ""} ${(restaurant.signatureHighlights ?? []).join(" ")}`.toLowerCase();
  if (!/(ambiance|atmosphere|decor|interieur|convivial|intime|cuisine|chef|tradition)/i.test(atmosphereText)) {
    failedChecks.push("atmosphere_identity_missing");
  }

  if (!restaurant.heroImages.length) {
    failedChecks.push("hero_image_missing");
  }

  if (input.content.sections.some((section) => section.type === "services")) {
    failedChecks.push("generic_service_cards_present");
  }

  return {
    valid: failedChecks.length === 0,
    failedChecks,
  };
}

function applyRestaurantAuditCorrections(input: {
  content: DemoSiteContent;
  expectedPrimaryLocale: RestaurantLocaleCode;
}): DemoSiteContent {
  const next = JSON.parse(JSON.stringify(input.content)) as DemoSiteContent;
  if (!next.restaurantContent) {
    return next;
  }

  const local = localeText(input.expectedPrimaryLocale);
  next.restaurantContent.primaryLocale = input.expectedPrimaryLocale;
  next.restaurantContent.supportedLocales = buildSupportedLocales(input.expectedPrimaryLocale) as RestaurantLocaleCode[];

  if (!next.restaurantContent.heroImages.length) {
    next.restaurantContent.heroImages = getFallbackImagesForSection({
      category: "restaurant",
      sectionId: "hero",
      preferredRoles: ["hero", "food", "dining_room"],
      limit: 2,
    }).map((item) => item.url);
  }

  if (!next.restaurantContent.reservation?.label) {
    next.restaurantContent.reservation = {
      ...next.restaurantContent.reservation,
      label: local.reserve,
    };
  }

  if (!next.restaurantContent.openingHours?.length) {
    next.restaurantContent.openingHours = [input.expectedPrimaryLocale === "fr" ? "Horaires sur demande" : "Opening hours on request"];
  }

  const missingText = input.expectedPrimaryLocale === "fr" ? "Non renseigne" : "Not provided";
  const normalizeOptional = (value?: string): string | undefined => {
    if (!value) return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  };

  const fallbackEmail = `${next.businessInfo.name.toLowerCase().replace(/\s+/g, "")}@example.com`;
  next.restaurantContent.contact.phone =
    normalizeOptional(next.restaurantContent.contact.phone) ??
    normalizeOptional(next.businessInfo.phone) ??
    normalizeOptional(next.contact.phone) ??
    missingText;
  next.restaurantContent.contact.email =
    normalizeOptional(next.restaurantContent.contact.email) ??
    normalizeOptional(next.businessInfo.email) ??
    normalizeOptional(next.contact.email) ??
    fallbackEmail;
  next.restaurantContent.contact.address =
    normalizeOptional(next.restaurantContent.contact.address) ??
    normalizeOptional(next.businessInfo.address) ??
    missingText;

  next.contact.phone = normalizeOptional(next.contact.phone) ?? next.restaurantContent.contact.phone;
  next.contact.email = normalizeOptional(next.contact.email) ?? next.restaurantContent.contact.email;

  const contactSectionIndex = next.sections.findIndex((section) => section.type === "contact");
  if (contactSectionIndex >= 0) {
    const contactSection = next.sections[contactSectionIndex];
    if (contactSection.type === "contact") {
      next.sections[contactSectionIndex] = {
        ...contactSection,
        content: {
          ...contactSection.content,
          address: contactSection.content.address ?? next.restaurantContent.contact.address,
          phone: contactSection.content.phone ?? next.restaurantContent.contact.phone,
          email: contactSection.content.email ?? next.restaurantContent.contact.email,
          hours: contactSection.content.hours?.length ? contactSection.content.hours : next.restaurantContent.openingHours,
        },
      };
    }
  }

  next.sections = next.sections.filter((section) => section.type !== "services");
  return next;
}

function toRedesignPlanModel(input: { brand: BrandProfile; quality: SourceQualityScore; plan: RedesignPlanStep }): RedesignPlan {
  return {
    brandPositioning: input.brand.brandArchetype,
    visualMood: input.brand.premiumPotential === "high" ? "immersive" : "editorial",
    toneOfVoice: input.brand.toneRecommendation,
    originalStructureSummary: input.quality.reasoning,
    preserveElements: input.plan.preserve,
    improveElements: input.plan.replace,
    mergeElements: [],
    simplifyElements: input.plan.hide,
    elevateElements: input.plan.emphasize,
    suggestedSectionOrder: input.plan.suggestedSectionOrder,
    layoutDirection: input.plan.layoutStyle,
    imageStrategy: input.plan.fallbackVisualNeeds.join(", "),
    typographyDirection: input.brand.designDirection,
    ctaStyle: input.plan.conversionStrategy[0] ?? "strong-primary",
    premiumUpgradeNotes: input.plan.mobilePriorities,
  };
}

function buildSectionsFromPipeline(input: {
  content: NormalizedBusinessContent;
  images: SelectedImagesOutput;
  plan: RedesignPlanStep;
}): DemoSection[] {
  const fr = looksFrench(
    input.content.businessName,
    input.content.tagline,
    input.content.shortDescription,
    input.content.aboutText,
    ...input.content.services,
  );

  const heroImage = input.images.selectedImages.find((image) => image.role === "hero")?.url;
  const galleryImages = input.images.selectedImages
    .filter((image) => ["gallery", "food", "interior", "exterior", "property", "hero"].includes(image.role))
    .slice(0, 10);

  const serviceDescriptions = input.content.services.length
    ? input.content.services
    : [specificPlaceholder("service", fr)];

  const sectionList: DemoSection[] = [];

  sectionList.push({
      id: "hero-0",
      type: "hero",
      enabled: true,
      order: 0,
      styleVariant: "premium",
      content: {
        badge: input.content.signatureHighlights[0],
        title: input.content.businessName,
        subtitle: input.content.shortDescription ?? input.content.aboutText ?? specificPlaceholder("description", fr),
        primaryCta: { label: input.content.reservation.cta ?? (fr ? "Demander un devis" : "Request a quote"), href: "#contact" },
        secondaryCta: { label: fr ? "Voir l'activite" : "See activity", href: "#about" },
        image: heroImage,
      },
    });

  sectionList.push({
      id: "about-1",
      type: "about",
      enabled: true,
      order: 1,
      styleVariant: "premium",
      content: {
        title: fr ? "A propos" : "About",
        body:
          input.content.aboutText ??
          input.content.shortDescription ??
          specificPlaceholder("about", fr),
        bullets: input.content.signatureHighlights.slice(0, 4),
      },
    });

  sectionList.push({
      id: "services-2",
      type: "services",
      enabled: true,
      order: 2,
      styleVariant: "premium",
      content: {
        title: fr ? "Prestations" : "Services",
        subtitle: fr ? "Ce que nous proposons" : "What we provide",
        items: serviceDescriptions.slice(0, 6).map((service, index) => ({
          title: service.length > 60 ? `${fr ? "Offre" : "Offer"} ${index + 1}` : service,
          description: service.length > 60 ? service : (fr ? "Detail a completer selon l'etablissement." : "Detail to complete for this business."),
        })),
      },
    });

  if (galleryImages.length > 0) {
    sectionList.push({
      id: "gallery-3",
      type: "gallery",
      enabled: true,
      order: sectionList.length,
      styleVariant: "premium",
      content: {
        title: fr ? "Galerie" : "Gallery",
        items: galleryImages.map((image, index) => ({ image: image.url, alt: image.alt || `image-${index + 1}` })),
      },
    });
  }

  sectionList.push({
      id: "cta-4",
      type: "cta",
      enabled: true,
      order: 4,
      styleVariant: "premium",
      content: {
        title: fr ? "Parlons de votre projet" : "Let's discuss your project",
        body: fr ? "Contactez l'etablissement pour une reponse adaptee." : "Contact the business for a tailored response.",
        action: { label: input.content.reservation.cta ?? (fr ? "Contacter" : "Contact"), href: "#contact" },
      },
    });

  sectionList.push({
      id: "contact-5",
      type: "contact",
      enabled: true,
      order: 5,
      styleVariant: "premium",
      content: {
        title: fr ? "Informations de contact" : "Contact details",
        address: input.content.contact.addresses[0] ?? specificPlaceholder("address", fr),
        phone: input.content.contact.phones[0] ?? specificPlaceholder("phone", fr),
        email: input.content.contact.emails[0] ?? specificPlaceholder("email", fr),
        hours: input.content.openingHours.length ? input.content.openingHours : [specificPlaceholder("hours", fr)],
      },
    });

  const preferredOrder = input.plan.suggestedSectionOrder;
  return sectionList
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.type);
      const bIndex = preferredOrder.indexOf(b.type);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    })
    .map((section, index) => ({ ...section, id: `${section.type}-${index}`, order: index }));
}

export async function generateFinalWebsite(input: {
  lead: EnrichedCommerceLead["lead"];
  category: BusinessCategory;
  style: DemoSiteStyle;
  reconstructed: ReconstructedSource;
  completedContent: CompletedContentOutput;
  selectedImages: SelectedImagesOutput;
  brandProfile: BrandProfile;
  qualityScore: SourceQualityScore;
  redesignPlan: RedesignPlanStep;
  translatedContent: TranslatedContentOutput;
}): Promise<FinalRenderDataOutput> {
  if (input.category === "restaurant") {
    const restaurant = await buildRestaurantSourceFirstContent({
      lead: input.lead,
      reconstructed: input.reconstructed,
      normalizedContent: input.completedContent.completedContent,
      selectedImages: input.selectedImages,
      brandProfile: input.brandProfile,
    });

    const semanticSections = buildRestaurantSemanticSections({
      restaurant,
      sourceNavItems: input.reconstructed.structureSummary.navItems,
    });

    const redesignedPlanModel = toRedesignPlanModel({
      brand: input.brandProfile,
      quality: input.qualityScore,
      plan: input.redesignPlan,
    });

    let restaurantContent = validateDemoSiteContent({
      businessInfo: {
        name: restaurant.restaurantName,
        category: "restaurant",
        city: input.lead.city,
        country: input.lead.country ?? inferLocaleProfile(input.lead.country).country,
        address: restaurant.contact.address,
        phone: restaurant.contact.phone,
        email: restaurant.contact.email,
        tagline: restaurant.tagline,
        shortDescription: restaurant.shortDescription,
      },
      theme: toThemeFromBrand(input.brandProfile),
      seo: {
        metaTitle: `${restaurant.restaurantName} | ${input.lead.city}`,
        metaDescription: restaurant.shortDescription ?? restaurant.aboutText ?? `${restaurant.restaurantName} restaurant in ${input.lead.city}`,
      },
      contact: {
        contactName: restaurant.restaurantName,
        email: restaurant.contact.email,
        phone: restaurant.contact.phone,
        bookingEnabled: true,
        formEnabled: true,
        openingHours: restaurant.openingHours,
      },
      sections: semanticSections,
      sourceReconstructedHtml: input.reconstructed.reconstructedHtml,
      sourceStructureJson: input.reconstructed.sourceStructureJson,
      sourceContentJson: input.reconstructed.sourceContentJson,
      sourceAssetsJson: input.reconstructed.sourceAssetsJson,
      redesignPlan: redesignedPlanModel,
      adaptiveSiteJson: generateAdaptiveDemoSiteJson(redesignedPlanModel, {
        businessInfo: {
          name: restaurant.restaurantName,
          category: "restaurant",
          city: input.lead.city,
          country: input.lead.country ?? "",
        },
        theme: toThemeFromBrand(input.brandProfile),
        seo: {
          metaTitle: restaurant.restaurantName,
          metaDescription: restaurant.shortDescription ?? "",
        },
        contact: { bookingEnabled: true, formEnabled: true },
        sections: semanticSections,
      }),
      restaurantContent: restaurant,
    });

    const expectedLocale = resolvePrimaryLocale(input.lead.city, input.lead.country) as RestaurantLocaleCode;
    let audit = auditRestaurantSemantics({
      content: restaurantContent,
      expectedPrimaryLocale: expectedLocale,
    });

    if (!audit.valid) {
      restaurantContent = validateDemoSiteContent(
        applyRestaurantAuditCorrections({
          content: restaurantContent,
          expectedPrimaryLocale: expectedLocale,
        }),
      );

      audit = auditRestaurantSemantics({
        content: restaurantContent,
        expectedPrimaryLocale: expectedLocale,
      });

      if (!audit.valid) {
        throw new Error(`Restaurant semantic audit failed: ${audit.failedChecks.join(", ")}`);
      }
    }

    return {
      finalSiteStructure: {
        sectionOrder: restaurantContent.sections.map((section) => section.type),
      },
      finalRenderData: {
        generatedHtmlPreview: undefined,
        adaptiveSiteJson: restaurantContent.adaptiveSiteJson as AdaptiveSiteComposition,
        usedImageUrls: [
          ...(restaurantContent.restaurantContent?.heroImages ?? []),
          ...(restaurantContent.restaurantContent?.galleryImages ?? []),
        ],
        finalLocaleReadyContent: input.translatedContent,
      },
      previewPageData: {
        hasHtmlPreview: false,
      },
      content: restaurantContent,
    };
  }

  const sections = buildSectionsFromPipeline({
    content: input.completedContent.completedContent,
    images: input.selectedImages,
    plan: input.redesignPlan,
  });

  const redesignPlanModel = toRedesignPlanModel({
    brand: input.brandProfile,
    quality: input.qualityScore,
    plan: input.redesignPlan,
  });

  const baseContent = validateDemoSiteContent({
    businessInfo: {
      name: input.completedContent.completedContent.businessName || input.lead.businessName,
      category: input.category,
      city: input.lead.city,
      country: input.lead.country ?? inferLocaleProfile(input.lead.country).country,
      address: input.completedContent.completedContent.contact.addresses[0] ?? input.lead.address,
      phone: input.completedContent.completedContent.contact.phones[0] ?? input.lead.phone,
      email: input.completedContent.completedContent.contact.emails[0] ?? input.lead.email,
      tagline: input.completedContent.completedContent.tagline,
      shortDescription: input.completedContent.completedContent.shortDescription,
    },
    theme: toThemeFromBrand(input.brandProfile),
    seo: {
      metaTitle: `${input.completedContent.completedContent.businessName} | ${input.lead.city}`,
      metaDescription:
        input.completedContent.completedContent.shortDescription ??
        input.completedContent.completedContent.aboutText ??
        `${input.lead.businessName} in ${input.lead.city}`,
      ogTitle: `${input.completedContent.completedContent.businessName} - Premium Redesign`,
      ogDescription:
        input.completedContent.completedContent.shortDescription ??
        input.completedContent.completedContent.aboutText ??
        `${input.lead.businessName} in ${input.lead.city}`,
    },
    contact: {
      contactName: input.completedContent.completedContent.businessName,
      email: input.completedContent.completedContent.contact.emails[0] ?? input.lead.email,
      phone: input.completedContent.completedContent.contact.phones[0] ?? input.lead.phone,
      bookingEnabled: true,
      formEnabled: true,
      openingHours: input.completedContent.completedContent.openingHours,
    },
    sections,
    sourceReconstructedHtml: input.reconstructed.reconstructedHtml,
    sourceStructureJson: input.reconstructed.sourceStructureJson,
    sourceContentJson: input.reconstructed.sourceContentJson,
    sourceAssetsJson: input.reconstructed.sourceAssetsJson,
    redesignPlan: redesignPlanModel,
    adaptiveSiteJson: generateAdaptiveDemoSiteJson(redesignPlanModel, {
      businessInfo: {
        name: input.completedContent.completedContent.businessName || input.lead.businessName,
        category: input.category,
        city: input.lead.city,
        country: input.lead.country ?? "",
      },
      theme: toThemeFromBrand(input.brandProfile),
      seo: {
        metaTitle: input.completedContent.completedContent.businessName,
        metaDescription: input.completedContent.completedContent.shortDescription ?? "",
      },
      contact: { bookingEnabled: true, formEnabled: true },
      sections,
    }),
  });

  let htmlPreview: FinalRenderDataOutput["finalRenderData"]["generatedHtmlPreview"];
  try {
    const generated = await generateRedesignedHtmlFromSource({
      redesignPrompt: [
        "Create a premium website HTML using the provided structured redesign decisions.",
        "Use real business data first. Avoid generic filler.",
        JSON.stringify({
          normalizedContent: input.completedContent.completedContent,
          selectedImages: input.selectedImages.selectedImages.slice(0, 20),
          brandProfile: input.brandProfile,
          redesignPlan: input.redesignPlan,
          translatedContent: input.translatedContent,
        }, null, 2),
      ].join("\n\n"),
      businessName: input.completedContent.completedContent.businessName,
      languageLabel: input.translatedContent.primaryLocale,
    });

    htmlPreview = generated;
  } catch {
    htmlPreview = undefined;
  }

  const finalized: DemoSiteContent = {
    ...baseContent,
    generatedHtmlPreview: htmlPreview,
    adaptiveSiteJson: generateAdaptiveDemoSiteJson(redesignPlanModel, baseContent),
  };

  return {
    finalSiteStructure: {
      sectionOrder: sections.map((section) => section.type),
    },
    finalRenderData: {
      generatedHtmlPreview: htmlPreview,
      adaptiveSiteJson: finalized.adaptiveSiteJson as AdaptiveSiteComposition,
      usedImageUrls: input.selectedImages.selectedImages.map((image) => image.url),
      finalLocaleReadyContent: input.translatedContent,
    },
    previewPageData: {
      hasHtmlPreview: Boolean(htmlPreview?.html),
    },
    content: finalized,
  };
}

export async function runSequentialRedesignPipeline(params: {
  enriched: EnrichedCommerceLead;
  category: BusinessCategory;
  style: DemoSiteStyle;
}): Promise<PipelineExecutionResult> {
  const logs: PipelineStageLog[] = [];

  async function runStep<T>(
    step: number,
    key: string,
    summary: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    const startedAt = new Date().toISOString();
    try {
      const result = await execute();
      logs.push({
        step,
        key,
        status: "completed",
        startedAt,
        completedAt: new Date().toISOString(),
        summary,
      });
      return result;
    } catch (error) {
      logs.push({
        step,
        key,
        status: "failed",
        startedAt,
        completedAt: new Date().toISOString(),
        summary: `${summary} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      });
      throw error;
    }
  }

  const crawl = await runStep(1, "crawl_result", "Source website crawl", () =>
    crawlWebsitePages({ enriched: params.enriched, category: params.category }),
  );

  const renderedDom = await runStep(2, "rendered_dom", "Rendered DOM extraction", () =>
    extractRenderedDom(crawl),
  );

  const reconstructed = await runStep(3, "reconstructed_source", "Semantic source reconstruction", () =>
    reconstructSourceWebsiteHtml(renderedDom),
  );

  const rawContent = await runStep(4, "raw_content", "Raw content extraction", () =>
    extractRawContent(reconstructed),
  );

  const rawImages = await runStep(5, "raw_images", "Raw image extraction", () => extractRawImages(renderedDom));

  const normalizedContent = await runStep(6, "normalized_content", "AI content mapping and classification", () =>
    mapContentWithAI({
      leadName: params.enriched.lead.businessName,
      rawContent,
      reconstructed,
    }),
  );

  const selectedImages = await runStep(7, "selected_images", "AI image selection and classification", () =>
    classifyImagesWithAI({ rawImages, category: params.category }),
  );

  const brandProfile = await runStep(8, "brand_profile", "AI brand analysis", () =>
    analyzeBrandWithAI({
      reconstructed,
      normalizedContent,
      selectedImages,
      renderedDom,
    }),
  );

  const sourceQuality = await runStep(9, "source_quality_score", "AI source quality scoring", () =>
    scoreSourceQualityWithAI({
      normalizedContent,
      selectedImages,
      brandProfile,
    }),
  );

  const redesignPlan = await runStep(10, "redesign_plan", "Adaptive redesign strategy generation", () =>
    buildRedesignPlanWithAI({
      normalizedContent,
      selectedImages,
      brandProfile,
      sourceQuality,
      category: params.category,
    }),
  );

  const completedContent = await runStep(11, "completed_content", "Content completion and fallback generation", () =>
    completeMissingContentWithAI({ normalizedContent, redesignPlan }),
  );

  const translatedContent = await runStep(12, "translated_content", "Translation generation", () =>
    translateContentWithAI({
      completedContent: completedContent.completedContent,
      city: params.enriched.lead.city,
      country: params.enriched.lead.country,
    }),
  );

  const finalWebsite = await runStep(13, "final_render_data", "Final premium website generation", () =>
    generateFinalWebsite({
      lead: params.enriched.lead,
      category: params.category,
      style: params.style,
      reconstructed,
      completedContent,
      selectedImages,
      brandProfile,
      qualityScore: sourceQuality,
      redesignPlan,
      translatedContent,
    }),
  );

  const siteQualityAudit = await runStep(14, "ai_quality_audit", "AI quality audit of generated website", () =>
    auditGeneratedSiteWithAI({
      content: finalWebsite.content,
      context: {
        sourceData: reconstructed as unknown as Record<string, unknown>,
        normalizedContent: normalizedContent as unknown as Record<string, unknown>,
        multilingual: translatedContent as unknown as Record<string, unknown>,
        category: params.category,
      },
    }),
  );

  const correctionPlan = await runStep(15, "correction_plan", "Section-aware correction plan generation", async () =>
    buildCorrectionPlanFromAudit({
      content: finalWebsite.content,
      audit: siteQualityAudit,
    }),
  );

  const correctedSite = await runStep(16, "correction_pass", "AI correction pass", () =>
    correctGeneratedSiteWithAI({
      content: finalWebsite.content,
      audit: siteQualityAudit,
      correctionPlan,
      context: {
        sourceData: reconstructed as unknown as Record<string, unknown>,
        normalizedContent: normalizedContent as unknown as Record<string, unknown>,
        multilingual: translatedContent as unknown as Record<string, unknown>,
        category: params.category,
      },
    }),
  );

  const validation = await runStep(17, "validation_status", "Final post-correction validation", () =>
    validateSiteAfterCorrection({
      correctedContent: correctedSite,
      context: {
        sourceData: reconstructed as unknown as Record<string, unknown>,
        normalizedContent: normalizedContent as unknown as Record<string, unknown>,
        multilingual: translatedContent as unknown as Record<string, unknown>,
        category: params.category,
      },
    }),
  );

  const artifacts: SequentialPipelineArtifacts = {
    crawlResult: crawl as unknown as Record<string, unknown>,
    renderedDom: renderedDom as unknown as Record<string, unknown>,
    reconstructedSource: {
      reconstructedHtml: reconstructed.reconstructedHtml,
      structureSummary: reconstructed.structureSummary,
      sourceBrandSignals: reconstructed.sourceBrandSignals,
    },
    rawContent: rawContent as unknown as Record<string, unknown>,
    rawImages: rawImages as unknown as Record<string, unknown>,
    normalizedContent: normalizedContent as unknown as Record<string, unknown>,
    selectedImages: selectedImages as unknown as Record<string, unknown>,
    brandProfile: brandProfile as unknown as Record<string, unknown>,
    sourceQualityScore: sourceQuality as unknown as Record<string, unknown>,
    redesignPlan: redesignPlan as unknown as Record<string, unknown>,
    completedContent: completedContent as unknown as Record<string, unknown>,
    translatedContent: translatedContent as unknown as Record<string, unknown>,
    finalRenderData: finalWebsite as unknown as Record<string, unknown>,
    aiReview: siteQualityAudit as unknown as Record<string, unknown>,
    correctionPass: {
      correctedAt: new Date().toISOString(),
      status: validation.status,
    },
    siteQualityAudit: siteQualityAudit as unknown as Record<string, unknown>,
    correctionPlan: correctionPlan as unknown as Record<string, unknown>,
    correctedSite: correctedSite as unknown as Record<string, unknown>,
    validationStatus: validation.status,
    auditScore: siteQualityAudit.overallScore,
    mustFixFlags: validation.mustFixFlags,
    pipelineRun: {
      executedAt: new Date().toISOString(),
      mode: "strict-sequential",
      stageLogs: logs,
      finalPreviewOutput: {
        previewReady: validation.passed,
        locales: translatedContent.supportedLocales,
        correctedAt: new Date().toISOString(),
        validationStatus: validation.status,
      },
    },
  };

  return {
    content: correctedSite,
    artifacts,
  };
}

export interface SequentialPipelineRuntimeState {
  enriched?: EnrichedCommerceLead;
  crawl?: Record<string, unknown>;
  renderedDom?: Record<string, unknown>;
  reconstructed?: Record<string, unknown>;
  rawContent?: Record<string, unknown>;
  rawImages?: Record<string, unknown>;
  normalizedContent?: Record<string, unknown>;
  selectedImages?: Record<string, unknown>;
  brandProfile?: Record<string, unknown>;
  sourceQuality?: Record<string, unknown>;
  redesignPlan?: Record<string, unknown>;
  completedContent?: Record<string, unknown>;
  translatedContent?: Record<string, unknown>;
  finalWebsite?: Record<string, unknown>;
  siteQualityAudit?: Record<string, unknown>;
  correctionPlan?: Record<string, unknown>;
  correctedSite?: Record<string, unknown>;
  aiReview?: Record<string, unknown>;
  correctionPass?: Record<string, unknown>;
  logs?: PipelineStageLog[];
}

function createPhaseStepRunner(logs: PipelineStageLog[]) {
  return async function runStep<T>(
    step: number,
    key: string,
    summary: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    const startedAt = new Date().toISOString();
    try {
      const result = await execute();
      logs.push({
        step,
        key,
        status: "completed",
        startedAt,
        completedAt: new Date().toISOString(),
        summary,
      });
      return result;
    } catch (error) {
      logs.push({
        step,
        key,
        status: "failed",
        startedAt,
        completedAt: new Date().toISOString(),
        summary: `${summary} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      });
      throw error;
    }
  };
}

export async function runSequentialRedesignPipelinePhase(params: {
  phase: 1 | 2 | 3;
  category: BusinessCategory;
  style: DemoSiteStyle;
  state?: SequentialPipelineRuntimeState;
  enriched?: EnrichedCommerceLead;
}): Promise<{ state: SequentialPipelineRuntimeState; content?: DemoSiteContent; artifacts?: SequentialPipelineArtifacts }> {
  const state: SequentialPipelineRuntimeState = {
    ...(params.state ?? {}),
    logs: [...(params.state?.logs ?? [])],
  };

  if (!state.enriched) {
    state.enriched = params.enriched;
  }

  const enriched = state.enriched;
  if (!enriched) {
    throw new Error("Missing enriched lead context for phased pipeline.");
  }

  const runStep = createPhaseStepRunner(state.logs as PipelineStageLog[]);

  if (params.phase === 1) {
    const crawl = await runStep(1, "crawl_result", "Source website crawl", () =>
      crawlWebsitePages({ enriched, category: params.category }),
    );

    const renderedDom = await runStep(2, "rendered_dom", "Rendered DOM extraction", () =>
      extractRenderedDom(crawl),
    );

    const reconstructed = await runStep(3, "reconstructed_source", "Semantic source reconstruction", () =>
      reconstructSourceWebsiteHtml(renderedDom),
    );

    const rawContent = await runStep(4, "raw_content", "Raw content extraction", () =>
      extractRawContent(reconstructed),
    );

    const rawImages = await runStep(5, "raw_images", "Raw image extraction", () => extractRawImages(renderedDom));

    state.crawl = crawl as unknown as Record<string, unknown>;
    state.renderedDom = renderedDom as unknown as Record<string, unknown>;
    state.reconstructed = reconstructed as unknown as Record<string, unknown>;
    state.rawContent = rawContent as unknown as Record<string, unknown>;
    state.rawImages = rawImages as unknown as Record<string, unknown>;

    return { state };
  }

  if (params.phase === 2) {
    const reconstructed = state.reconstructed as unknown as ReconstructedSource | undefined;
    const rawContent = state.rawContent as unknown as RawContentExtraction | undefined;
    const rawImages = state.rawImages as unknown as RawImageExtraction | undefined;
    const renderedDom = state.renderedDom as unknown as RenderedDomResult | undefined;

    if (!reconstructed || !rawContent || !rawImages || !renderedDom) {
      throw new Error("Phase 2 requires steps 1-5 artifacts.");
    }

    const normalizedContent = await runStep(6, "normalized_content", "AI content mapping and classification", () =>
      mapContentWithAI({
        leadName: enriched.lead.businessName,
        rawContent,
        reconstructed,
      }),
    );

    const selectedImages = await runStep(7, "selected_images", "AI image selection and classification", () =>
      classifyImagesWithAI({ rawImages, category: params.category }),
    );

    const brandProfile = await runStep(8, "brand_profile", "AI brand analysis", () =>
      analyzeBrandWithAI({
        reconstructed,
        normalizedContent,
        selectedImages,
        renderedDom,
      }),
    );

    const sourceQuality = await runStep(9, "source_quality_score", "AI source quality scoring", () =>
      scoreSourceQualityWithAI({
        normalizedContent,
        selectedImages,
        brandProfile,
      }),
    );

    const redesignPlan = await runStep(10, "redesign_plan", "Adaptive redesign strategy generation", () =>
      buildRedesignPlanWithAI({
        normalizedContent,
        selectedImages,
        brandProfile,
        sourceQuality,
        category: params.category,
      }),
    );

    state.normalizedContent = normalizedContent as unknown as Record<string, unknown>;
    state.selectedImages = selectedImages as unknown as Record<string, unknown>;
    state.brandProfile = brandProfile as unknown as Record<string, unknown>;
    state.sourceQuality = sourceQuality as unknown as Record<string, unknown>;
    state.redesignPlan = redesignPlan as unknown as Record<string, unknown>;

    return { state };
  }

  const reconstructed = state.reconstructed as unknown as ReconstructedSource | undefined;
  const normalizedContent = state.normalizedContent as unknown as NormalizedBusinessContent | undefined;
  const selectedImages = state.selectedImages as unknown as SelectedImagesOutput | undefined;
  const brandProfile = state.brandProfile as unknown as BrandProfile | undefined;
  const sourceQuality = state.sourceQuality as unknown as SourceQualityScore | undefined;
  const redesignPlan = state.redesignPlan as unknown as RedesignPlanStep | undefined;

  if (!reconstructed || !normalizedContent || !selectedImages || !brandProfile || !sourceQuality || !redesignPlan) {
    throw new Error("Phase 3 requires steps 1-10 artifacts.");
  }

  const completedContent = await runStep(11, "completed_content", "Content completion and fallback generation", () =>
    completeMissingContentWithAI({ normalizedContent, redesignPlan }),
  );

  const translatedContent = await runStep(12, "translated_content", "Translation generation", () =>
    translateContentWithAI({
      completedContent: completedContent.completedContent,
      city: enriched.lead.city,
      country: enriched.lead.country,
    }),
  );

  const finalWebsite = await runStep(13, "final_render_data", "Final premium website generation", () =>
    generateFinalWebsite({
      lead: enriched.lead,
      category: params.category,
      style: params.style,
      reconstructed,
      completedContent,
      selectedImages,
      brandProfile,
      qualityScore: sourceQuality,
      redesignPlan,
      translatedContent,
    }),
  );

  const siteQualityAudit = await runStep(14, "ai_quality_audit", "AI quality audit of generated website", () =>
    auditGeneratedSiteWithAI({
      content: finalWebsite.content,
      context: {
        sourceData: reconstructed as unknown as Record<string, unknown>,
        normalizedContent: normalizedContent as unknown as Record<string, unknown>,
        multilingual: translatedContent as unknown as Record<string, unknown>,
        category: params.category,
      },
    }),
  );

  const correctionPlan = await runStep(15, "correction_plan", "Section-aware correction plan generation", async () =>
    buildCorrectionPlanFromAudit({
      content: finalWebsite.content,
      audit: siteQualityAudit,
    }),
  );

  const correctedSite = await runStep(16, "correction_pass", "AI correction pass", () =>
    correctGeneratedSiteWithAI({
      content: finalWebsite.content,
      audit: siteQualityAudit,
      correctionPlan,
      context: {
        sourceData: reconstructed as unknown as Record<string, unknown>,
        normalizedContent: normalizedContent as unknown as Record<string, unknown>,
        multilingual: translatedContent as unknown as Record<string, unknown>,
        category: params.category,
      },
    }),
  );

  const validation = await runStep(17, "validation_status", "Final post-correction validation", () =>
    validateSiteAfterCorrection({
      correctedContent: correctedSite,
      context: {
        sourceData: reconstructed as unknown as Record<string, unknown>,
        normalizedContent: normalizedContent as unknown as Record<string, unknown>,
        multilingual: translatedContent as unknown as Record<string, unknown>,
        category: params.category,
      },
    }),
  );

  const artifacts: SequentialPipelineArtifacts = {
    crawlResult: state.crawl,
    renderedDom: state.renderedDom,
    reconstructedSource: {
      reconstructedHtml: reconstructed.reconstructedHtml,
      structureSummary: reconstructed.structureSummary,
      sourceBrandSignals: reconstructed.sourceBrandSignals,
    },
    rawContent: state.rawContent,
    rawImages: state.rawImages,
    normalizedContent: normalizedContent as unknown as Record<string, unknown>,
    selectedImages: selectedImages as unknown as Record<string, unknown>,
    brandProfile: brandProfile as unknown as Record<string, unknown>,
    sourceQualityScore: sourceQuality as unknown as Record<string, unknown>,
    redesignPlan: redesignPlan as unknown as Record<string, unknown>,
    completedContent: completedContent as unknown as Record<string, unknown>,
    translatedContent: translatedContent as unknown as Record<string, unknown>,
    finalRenderData: finalWebsite as unknown as Record<string, unknown>,
    aiReview: siteQualityAudit as unknown as Record<string, unknown>,
    correctionPass: {
      correctedAt: new Date().toISOString(),
      status: validation.status,
    },
    siteQualityAudit: siteQualityAudit as unknown as Record<string, unknown>,
    correctionPlan: correctionPlan as unknown as Record<string, unknown>,
    correctedSite: correctedSite as unknown as Record<string, unknown>,
    validationStatus: validation.status,
    auditScore: siteQualityAudit.overallScore,
    mustFixFlags: validation.mustFixFlags,
    pipelineRun: {
      executedAt: new Date().toISOString(),
      mode: "strict-sequential-phased",
      stageLogs: state.logs,
      finalPreviewOutput: {
        previewReady: validation.passed,
        locales: translatedContent.supportedLocales,
        correctedAt: new Date().toISOString(),
        validationStatus: validation.status,
      },
    },
  };

  state.completedContent = completedContent as unknown as Record<string, unknown>;
  state.translatedContent = translatedContent as unknown as Record<string, unknown>;
  state.finalWebsite = finalWebsite as unknown as Record<string, unknown>;
  state.siteQualityAudit = siteQualityAudit as unknown as Record<string, unknown>;
  state.correctionPlan = correctionPlan as unknown as Record<string, unknown>;
  state.correctedSite = correctedSite as unknown as Record<string, unknown>;
  state.aiReview = siteQualityAudit as unknown as Record<string, unknown>;
  state.correctionPass = {
    correctedAt: new Date().toISOString(),
    status: validation.status,
    mustFixFlags: validation.mustFixFlags,
  };

  return {
    state,
    content: correctedSite,
    artifacts,
  };
}
