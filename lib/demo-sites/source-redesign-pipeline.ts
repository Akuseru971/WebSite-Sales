import OpenAI from "openai";
import type {
  DemoSiteContent,
  GeneratedHtmlPreview,
  RedesignPlan,
  SourceAssetsJson,
  SourceBrandSignals,
  SourceContentJson,
  SourceStructureJson,
} from "@/lib/demo-sites/types";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import { extractBrandDNA, generateAdaptiveDemoSiteJson } from "@/lib/demo-sites/redesign-intelligence";
import { updateDemoSiteJsonWithAI } from "@/lib/demo-sites/ai-edit";

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

function inferSectionKey(value: string): string {
  const normalized = value.toLowerCase();
  if (/hero|home|welcome/.test(normalized)) return "hero";
  if (/about|story|mission|team/.test(normalized)) return "about";
  if (/service|offer|solution|menu|dish/.test(normalized)) return "services";
  if (/gallery|image|photo/.test(normalized)) return "gallery";
  if (/review|testimonial/.test(normalized)) return "testimonials";
  if (/faq|question/.test(normalized)) return "faq";
  if (/contact|book|reserve|call/.test(normalized)) return "contact";
  return "content";
}

export function crawlWebsitePages(enriched: EnrichedCommerceLead) {
  const pages = enriched.extractedWebsite?.pages ?? [];
  if (!pages.length) {
    throw new Error("No source pages available for reconstruction.");
  }

  return pages;
}

export function reconstructSourceWebsiteHtml(input: { pages: ReturnType<typeof crawlWebsitePages> }): string {
  const chunks: string[] = ["<site>"];

  input.pages.forEach((page, pageIndex) => {
    chunks.push(`  <page index=\"${pageIndex}\" url=\"${page.url}\">`);
    chunks.push(`    <title>${page.title || "Untitled"}</title>`);
    if (page.description) {
      chunks.push(`    <description>${page.description}</description>`);
    }

    page.headings.slice(0, 10).forEach((heading, headingIndex) => {
      const sectionKey = inferSectionKey(heading);
      chunks.push(`    <section key=\"${sectionKey}\" order=\"${headingIndex}\">`);
      chunks.push(`      <heading>${heading}</heading>`);

      const sectionParagraphs = page.paragraphs
        .filter((paragraph) => paragraph.toLowerCase().includes(heading.split(" ")[0]?.toLowerCase() ?? ""))
        .slice(0, 3);
      sectionParagraphs.forEach((paragraph) => {
        chunks.push(`      <paragraph>${paragraph}</paragraph>`);
      });

      const sectionCtas = page.ctaPhrases.slice(0, 3);
      sectionCtas.forEach((cta) => {
        chunks.push(`      <cta>${cta}</cta>`);
      });

      page.images.slice(0, 4).forEach((image) => {
        chunks.push(`      <image src=\"${image.url}\" alt=\"${image.alt || "image"}\" />`);
      });

      chunks.push("    </section>");
    });

    if (page.headings.length === 0) {
      chunks.push("    <section key=\"content\" order=\"0\">");
      page.paragraphs.slice(0, 8).forEach((paragraph) => {
        chunks.push(`      <paragraph>${paragraph}</paragraph>`);
      });
      page.ctaPhrases.slice(0, 4).forEach((cta) => {
        chunks.push(`      <cta>${cta}</cta>`);
      });
      page.images.slice(0, 6).forEach((image) => {
        chunks.push(`      <image src=\"${image.url}\" alt=\"${image.alt || "image"}\" />`);
      });
      chunks.push("    </section>");
    }

    chunks.push("  </page>");
  });

  chunks.push("</site>");
  return chunks.join("\n");
}

export function extractStructuredSourceContent(input: {
  enriched: EnrichedCommerceLead;
  pages: ReturnType<typeof crawlWebsitePages>;
}): SourceContentJson {
  const headings = uniqueStrings(input.pages.flatMap((page) => page.headings), 60);
  const paragraphs = uniqueStrings(input.pages.flatMap((page) => page.paragraphs), 120);
  const ctas = uniqueStrings(input.pages.flatMap((page) => page.ctaPhrases), 40);

  return {
    headings,
    paragraphs,
    ctas,
    services: uniqueStrings(
      paragraphs.filter((line) => /service|offer|solution|menu|dish|package|treatment|experience/i.test(line)),
      40,
    ),
    menuItems: uniqueStrings(
      [...input.enriched.inferredMenuItems, ...paragraphs.filter((line) => /menu|dish|starter|dessert|wine|cocktail|pizza|pasta/i.test(line))],
      40,
    ),
    testimonials: uniqueStrings(
      paragraphs.filter((line) => /review|testimonial|client|customer|"/i.test(line)),
      24,
    ),
    contacts: {
      phones: uniqueStrings(input.enriched.extractedWebsite?.contact.phones ?? [], 10),
      emails: uniqueStrings(input.enriched.extractedWebsite?.contact.emails ?? [], 10),
      addresses: uniqueStrings(input.enriched.extractedWebsite?.contact.addresses ?? [], 8),
    },
  };
}

export function extractSourceAssets(enriched: EnrichedCommerceLead): SourceAssetsJson {
  const extracted = enriched.extractedWebsite;
  const heroImages = uniqueStrings(extracted?.heroImages.map((image) => image.url) ?? [], 16);
  const galleryImages = uniqueStrings(extracted?.galleryImages.map((image) => image.url) ?? [], 30);
  const allImages = uniqueStrings([
    ...(enriched.suggestedImages ?? []),
    ...heroImages,
    ...galleryImages,
  ], 40);

  return {
    logoUrl: extracted?.logo?.url,
    heroImages,
    galleryImages,
    allImages,
  };
}

export function extractSourceBrandSignals(enriched: EnrichedCommerceLead): SourceBrandSignals {
  return extractBrandDNA(enriched);
}

export function buildSourceStructureJson(input: { pages: ReturnType<typeof crawlWebsitePages> }): SourceStructureJson {
  const nodes: SourceStructureJson["nodes"] = [];

  input.pages.forEach((page) => {
    page.headings.slice(0, 12).forEach((heading, index) => {
      nodes.push({
        pageUrl: page.url,
        sectionKey: inferSectionKey(heading),
        heading,
        paragraphs: page.paragraphs.slice(index * 2, index * 2 + 2),
        ctas: page.ctaPhrases.slice(0, 3),
        imageUrls: page.images.slice(0, 4).map((image) => image.url),
        order: nodes.length,
      });
    });

    if (page.headings.length === 0) {
      nodes.push({
        pageUrl: page.url,
        sectionKey: "content",
        paragraphs: page.paragraphs.slice(0, 8),
        ctas: page.ctaPhrases.slice(0, 4),
        imageUrls: page.images.slice(0, 6).map((image) => image.url),
        order: nodes.length,
      });
    }
  });

  return {
    pages: input.pages.map((page) => ({
      url: page.url,
      title: page.title,
      navItems: uniqueStrings(page.headings.slice(0, 8), 8),
      sectionKeys: uniqueStrings(page.headings.map((heading) => inferSectionKey(heading)), 12),
    })),
    nodes,
  };
}

export function buildRedesignPromptFromSource(params: {
  sourceReconstructedHtml: string;
  sourceStructureJson: SourceStructureJson;
  sourceContentJson: SourceContentJson;
  sourceAssetsJson: SourceAssetsJson;
  sourceBrandSignals: SourceBrandSignals;
  redesignPlan: RedesignPlan;
  category: string;
  style: string;
  languageLabel: string;
  languageCode: string;
}): string {
  return [
    "You are a premium website redesign strategist and UX director.",
    "Redesign from source reconstruction first. Do not use generic category template thinking.",
    `Category (context only): ${params.category}`,
    `Design direction seed: ${params.style}`,
    `Output language: ${params.languageLabel} (${params.languageCode})`,
    "SOURCE_RECONSTRUCTED_HTML:",
    params.sourceReconstructedHtml,
    "SOURCE_STRUCTURE_JSON:",
    JSON.stringify(params.sourceStructureJson, null, 2),
    "SOURCE_CONTENT_JSON:",
    JSON.stringify(params.sourceContentJson, null, 2),
    "SOURCE_ASSETS_JSON:",
    JSON.stringify(params.sourceAssetsJson, null, 2),
    "SOURCE_BRAND_SIGNALS:",
    JSON.stringify(params.sourceBrandSignals, null, 2),
    "REDESIGN_PLAN:",
    JSON.stringify(params.redesignPlan, null, 2),
    "MANDATORY RULES:",
    "- Preserve recognizable structure where valuable.",
    "- Preserve as much authentic business text as possible.",
    "- Preserve real images and CTA language when useful.",
    "- Improve hierarchy, spacing, readability, trust flow, and conversion.",
    "- If content is too long for homepage, summarize and relocate details to deeper sections.",
    "- Do not output generic template structure reused across businesses.",
    "- Keep schema valid.",
  ].join("\n");
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  return new OpenAI({ apiKey });
}

function stripUnsafeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function ensureHtmlBodyOnly(value: string): string {
  const bodyMatch = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    return bodyMatch[1].trim();
  }

  return value.trim();
}

export async function generateRedesignedHtmlFromSource(params: {
  redesignPrompt: string;
  businessName: string;
  languageLabel: string;
}): Promise<GeneratedHtmlPreview> {
  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: "gpt-5.1-mini",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a premium web designer and frontend engineer. Output JSON only with keys: html, css, metadata. html must represent BODY content only (no html/head/body tags). Preserve source structure and authentic content where possible. Do not use scripts.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Business: ${params.businessName}`,
              `Language: ${params.languageLabel}`,
              "Goal: produce a finished premium redesigned website document derived from source reconstruction.",
              "Return JSON object only.",
              params.redesignPrompt,
            ].join("\n\n"),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error("OpenAI did not return HTML output.");
  }

  const parsed = JSON.parse(outputText) as { html?: string; css?: string; metadata?: Record<string, unknown> };
  const rawHtml = parsed.html?.trim();
  if (!rawHtml) {
    throw new Error("OpenAI returned empty redesigned HTML.");
  }

  return {
    html: stripUnsafeHtml(ensureHtmlBodyOnly(rawHtml)),
    css: parsed.css ? stripUnsafeHtml(parsed.css) : undefined,
    metadata: parsed.metadata,
  };
}

export async function generateRedesignedSiteFromSource(params: {
  currentContent: DemoSiteContent;
  prompt: string;
}): Promise<DemoSiteContent> {
  const result = await updateDemoSiteJsonWithAI({
    currentContent: params.currentContent,
    instruction: params.prompt,
  });

  return result.suggestedContent;
}

export function applyPremiumVisualLayer(params: {
  content: DemoSiteContent;
  redesignPlan: RedesignPlan;
}): DemoSiteContent {
  const adaptive = generateAdaptiveDemoSiteJson(params.redesignPlan, params.content);

  return {
    ...params.content,
    adaptiveSiteJson: adaptive,
    sections: params.content.sections.map((section, index) => ({
      ...section,
      order: index,
      styleVariant: params.redesignPlan.visualMood,
    })),
  };
}
