import OpenAI from "openai";
import { z } from "zod";
import type { DemoSection, DemoSiteContent } from "@/lib/demo-sites/types";
import { validateDemoSiteContent } from "@/lib/demo-sites/validation";
import { createResponseWithModelFallback } from "@/lib/openai/model-fallback";

const optimizationIssueCategorySchema = z.enum([
  "image_quality",
  "image_relevance",
  "layout",
  "spacing",
  "semantic_mapping",
  "source_fidelity",
  "cta",
  "premium_quality",
]);

const optimizationSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

const optimizationIssueSchema = z.object({
  id: z.string().min(1),
  category: optimizationIssueCategorySchema,
  severity: optimizationSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  affectedSectionId: z.string().optional(),
  recommendedFix: z.string().min(1),
});

const optimizationActionSchema = z.object({
  actionType: z.enum([
    "replace_image",
    "reassign_image",
    "add_fallback_image",
    "rewrite_copy",
    "remap_section",
    "reorder_sections",
    "adjust_spacing",
    "strengthen_hero",
    "improve_cta",
    "remove_section",
    "merge_section",
  ]),
  targetSectionId: z.string().optional(),
  notes: z.string().min(1),
});

export const optimizationReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  imageQualityScore: z.number().min(0).max(100),
  sourceFidelityScore: z.number().min(0).max(100),
  layoutQualityScore: z.number().min(0).max(100),
  premiumScore: z.number().min(0).max(100),
  conversionScore: z.number().min(0).max(100),
  issues: z.array(optimizationIssueSchema),
  recommendedActions: z.array(optimizationActionSchema),
});

export type OptimizationReport = z.infer<typeof optimizationReportSchema>;

export const optimizationPlanSchema = z.object({
  actionQueue: z.array(optimizationActionSchema),
  preserveSectionIds: z.array(z.string()),
  weakImageUrls: z.array(z.string()),
  notes: z.array(z.string()),
});

export type OptimizationPlan = z.infer<typeof optimizationPlanSchema>;

export interface OptimizationSourceContext {
  sourceUrl?: string;
  sourceReconstructedHtml?: string;
  sourceScreenshots?: string[];
  sourceExtractedContent?: Record<string, unknown>;
  sourceSelectedImages?: Array<Record<string, unknown>>;
  sourceBrandProfile?: Record<string, unknown>;
  currentSelectedImages?: Array<Record<string, unknown>>;
  currentPreviewScreenshots?: string[];
}

export interface OptimizationAuditOutput {
  report: OptimizationReport;
  plan: OptimizationPlan;
  screenshotSignal: {
    compared: boolean;
    notes: string[];
  };
}

export interface ApplyOptimizationOutput {
  optimizedContent: DemoSiteContent;
  optimizedImageSelection: Array<Record<string, unknown>>;
  appliedActions: string[];
  unchangedSectionIds: string[];
}

interface ImageUsage {
  sectionId: string;
  sectionType: DemoSection["type"];
  field: string;
  url: string;
  role: "hero" | "gallery" | "content";
  estimatedRenderedWidth: number;
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

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function flattenSelectedImages(input?: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (!input) {
    return [];
  }
  return input;
}

function extractImageUsages(content: DemoSiteContent): ImageUsage[] {
  const usages: ImageUsage[] = [];

  for (const section of content.sections.filter((value) => value.enabled)) {
    const raw = section.content as unknown as Record<string, unknown>;
    if (section.type === "hero") {
      const heroUrl = asText(raw.image);
      if (heroUrl) {
        usages.push({
          sectionId: section.id,
          sectionType: section.type,
          field: "image",
          url: heroUrl,
          role: "hero",
          estimatedRenderedWidth: 1400,
        });
      }
    }

    if (section.type === "gallery") {
      const items = Array.isArray(raw.items) ? (raw.items as Array<Record<string, unknown>>) : [];
      items.forEach((item, index) => {
        const url = asText(item.image);
        if (!url) {
          return;
        }
        usages.push({
          sectionId: section.id,
          sectionType: section.type,
          field: `items.${index}.image`,
          url,
          role: "gallery",
          estimatedRenderedWidth: 720,
        });
      });
    }

    const itemList = Array.isArray(raw.items) ? (raw.items as Array<Record<string, unknown>>) : [];
    itemList.forEach((item, index) => {
      const url = asText(item.image);
      if (!url) {
        return;
      }
      usages.push({
        sectionId: section.id,
        sectionType: section.type,
        field: `items.${index}.image`,
        url,
        role: section.type === "menu_highlights" ? "content" : "gallery",
        estimatedRenderedWidth: 640,
      });
    });
  }

  return usages;
}

function getImageMeta(url: string, selected: Array<Record<string, unknown>>): Record<string, unknown> | undefined {
  return selected.find((item) => asText(item.url) === url);
}

export function detectWeakImages(input: {
  content: DemoSiteContent;
  sourceContext: OptimizationSourceContext;
}): {
  issues: OptimizationReport["issues"];
  flaggedImageUrls: string[];
  recommendedActions: OptimizationReport["recommendedActions"];
} {
  const selectedImages = flattenSelectedImages(input.sourceContext.currentSelectedImages);
  const usages = extractImageUsages(input.content);
  const issues: OptimizationReport["issues"] = [];
  const actions: OptimizationReport["recommendedActions"] = [];
  const flaggedImageUrls: string[] = [];

  const usageCountByUrl = usages.reduce<Record<string, number>>((acc, usage) => {
    acc[usage.url] = (acc[usage.url] ?? 0) + 1;
    return acc;
  }, {});

  for (const usage of usages) {
    const meta = getImageMeta(usage.url, selectedImages);
    const width = typeof meta?.width === "number" ? meta.width : 0;
    const height = typeof meta?.height === "number" ? meta.height : 0;
    const qualityScore = typeof meta?.qualityScore === "number" ? meta.qualityScore : 0;
    const url = usage.url;
    const isPotentialFallback = /placeholder|unsplash|pexels|images\/photo/i.test(url);

    if (width > 0 && width < usage.estimatedRenderedWidth * 0.72) {
      flaggedImageUrls.push(url);
      issues.push({
        id: `img-size-${usage.sectionId}-${usage.field}`,
        category: "image_quality",
        severity: usage.role === "hero" ? "critical" : "high",
        title: "Image resolution is too weak for displayed size",
        description: `Rendered width expectation (${usage.estimatedRenderedWidth}px) exceeds intrinsic width (${width}px).`,
        affectedSectionId: usage.sectionId,
        recommendedFix: "Replace with higher-resolution source image or downgrade visual prominence.",
      });
      actions.push({
        actionType: "replace_image",
        targetSectionId: usage.sectionId,
        notes: "Replace weak image with stronger source/fallback asset.",
      });
    }

    if (width > 0 && height > 0 && width / height > 3.2) {
      flaggedImageUrls.push(url);
      issues.push({
        id: `img-crop-${usage.sectionId}-${usage.field}`,
        category: "image_quality",
        severity: "medium",
        title: "Image aspect ratio risk",
        description: "Image may be stretched or cropped awkwardly for premium layout.",
        affectedSectionId: usage.sectionId,
        recommendedFix: "Reassign this image to a more suitable section or crop-safe role.",
      });
      actions.push({
        actionType: "reassign_image",
        targetSectionId: usage.sectionId,
        notes: "Move image to a section where its ratio fits better.",
      });
    }

    if (usage.role === "hero" && (qualityScore > 0 && qualityScore < 70 || isPotentialFallback)) {
      flaggedImageUrls.push(url);
      issues.push({
        id: `hero-weak-${usage.sectionId}`,
        category: "image_quality",
        severity: "critical",
        title: "Hero image is visually weak for premium delivery",
        description: "Blurry/weak hero assets are unacceptable in optimization phase.",
        affectedSectionId: usage.sectionId,
        recommendedFix: "Replace hero with strongest source image and keep weak image only in low-prominence role.",
      });
      actions.push({
        actionType: "replace_image",
        targetSectionId: usage.sectionId,
        notes: "Promote strongest source image to hero role.",
      });
    }

    if ((usageCountByUrl[url] ?? 0) >= 3) {
      issues.push({
        id: `img-repeat-${usage.sectionId}-${usage.field}`,
        category: "image_relevance",
        severity: "medium",
        title: "Repeated low-value image usage",
        description: "The same image is reused too often across sections, weakening premium rhythm.",
        affectedSectionId: usage.sectionId,
        recommendedFix: "Use alternative source/fallback visuals and rebalance gallery rhythm.",
      });
      actions.push({
        actionType: "add_fallback_image",
        targetSectionId: usage.sectionId,
        notes: "Inject additional relevant images to avoid repetition.",
      });
    }
  }

  const hasHeroImage = usages.some((usage) => usage.role === "hero");
  if (!hasHeroImage) {
    issues.push({
      id: "hero-missing-image",
      category: "image_quality",
      severity: "critical",
      title: "Missing hero-quality image",
      description: "Hero section has no image, reducing premium impact and conversion confidence.",
      recommendedFix: "Assign strongest source hero candidate.",
    });
    actions.push({
      actionType: "add_fallback_image",
      notes: "Set hero image using best available source asset.",
    });
  }

  return {
    issues,
    flaggedImageUrls: unique(flaggedImageUrls),
    recommendedActions: actions,
  };
}

export function detectLayoutWeaknesses(input: {
  content: DemoSiteContent;
}): { issues: OptimizationReport["issues"]; recommendedActions: OptimizationReport["recommendedActions"] } {
  const issues: OptimizationReport["issues"] = [];
  const actions: OptimizationReport["recommendedActions"] = [];

  const enabled = input.content.sections.filter((section) => section.enabled).sort((a, b) => a.order - b.order);
  if (enabled.length < 6) {
    issues.push({
      id: "layout-thin-flow",
      category: "layout",
      severity: "high",
      title: "Section composition feels thin",
      description: "The page has too few sections to create strong premium storytelling.",
      recommendedFix: "Merge weak blocks and enrich key sections rather than adding generic filler.",
    });
  }

  const ctaIndex = enabled.findIndex((section) => section.type === "cta");
  const contactIndex = enabled.findIndex((section) => section.type === "contact");
  if (ctaIndex === -1 || (contactIndex !== -1 && ctaIndex > contactIndex)) {
    issues.push({
      id: "cta-placement-weak",
      category: "cta",
      severity: "high",
      title: "CTA placement is weak",
      description: "CTA should support conversion before final contact block.",
      recommendedFix: "Reorder sections and improve CTA prominence.",
    });
    actions.push({
      actionType: "reorder_sections",
      notes: "Move CTA before contact and strengthen hierarchy.",
    });
    actions.push({
      actionType: "improve_cta",
      notes: "Use action copy grounded in source business intent.",
    });
  }

  for (const section of enabled) {
    const density = JSON.stringify(section.content).replace(/[{}\[\]",:]/g, " ").trim().length;
    if (density < 55) {
      issues.push({
        id: `layout-empty-${section.id}`,
        category: "spacing",
        severity: "high",
        title: "Section appears visually empty",
        description: "Empty-looking premium blocks are not acceptable for final delivery.",
        affectedSectionId: section.id,
        recommendedFix: "Tighten spacing, enrich with concrete source details, or remove section.",
      });
      actions.push({
        actionType: "adjust_spacing",
        targetSectionId: section.id,
        notes: "Reduce oversized spacing and improve content/image balance.",
      });
    }
  }

  return { issues, recommendedActions: actions };
}

export function detectSourceFidelityIssues(input: {
  content: DemoSiteContent;
  sourceContext: OptimizationSourceContext;
}): { issues: OptimizationReport["issues"]; recommendedActions: OptimizationReport["recommendedActions"] } {
  const issues: OptimizationReport["issues"] = [];
  const actions: OptimizationReport["recommendedActions"] = [];
  const sourceText = JSON.stringify(input.sourceContext.sourceExtractedContent ?? {}).toLowerCase();
  const generatedText = JSON.stringify(input.content).toLowerCase();

  const businessName = input.content.businessInfo.name.toLowerCase();
  if (businessName && sourceText && !sourceText.includes(businessName)) {
    issues.push({
      id: "source-name-drift",
      category: "source_fidelity",
      severity: "high",
      title: "Business identity drift detected",
      description: "Generated business identity is weakly grounded in extracted source content.",
      recommendedFix: "Re-inject source identity elements and concrete details.",
    });
    actions.push({
      actionType: "rewrite_copy",
      notes: "Align headline and intro copy to source business identity.",
    });
  }

  if (sourceText.includes("@") && !generatedText.includes("@")) {
    issues.push({
      id: "source-missing-email",
      category: "source_fidelity",
      severity: "critical",
      title: "Missing contact email from source",
      description: "Source appears to contain email but generated output does not expose it.",
      recommendedFix: "Inject missing contact fields into contact section.",
    });
    actions.push({
      actionType: "rewrite_copy",
      notes: "Inject source contact details in contact block.",
    });
  }

  if (/(premium experience|crafted excellence|culinary precision|curated atmosphere)/i.test(generatedText)) {
    issues.push({
      id: "source-generic-premium-copy",
      category: "premium_quality",
      severity: "high",
      title: "Generic premium filler detected",
      description: "Premium wording is generic and not source-faithful.",
      recommendedFix: "Rewrite with concrete source-backed language.",
    });
    actions.push({
      actionType: "rewrite_copy",
      notes: "Replace generic premium phrases with source-grounded statements.",
    });
  }

  return { issues, recommendedActions: actions };
}

export function analyzeGeneratedVsSource(input: {
  content: DemoSiteContent;
  sourceContext: OptimizationSourceContext;
}): {
  issues: OptimizationReport["issues"];
  recommendedActions: OptimizationReport["recommendedActions"];
  weakImageUrls: string[];
} {
  const weakImages = detectWeakImages(input);
  const layout = detectLayoutWeaknesses({ content: input.content });
  const source = detectSourceFidelityIssues(input);

  return {
    issues: [...weakImages.issues, ...layout.issues, ...source.issues],
    recommendedActions: [...weakImages.recommendedActions, ...layout.recommendedActions, ...source.recommendedActions],
    weakImageUrls: weakImages.flaggedImageUrls,
  };
}

export function buildOptimizationPlan(input: {
  content: DemoSiteContent;
  report: OptimizationReport;
  weakImageUrls: string[];
}): OptimizationPlan {
  const weakSectionIds = new Set(
    input.report.issues
      .filter((issue) => issue.severity === "critical" || issue.severity === "high")
      .map((issue) => issue.affectedSectionId)
      .filter(Boolean) as string[],
  );

  const preserveSectionIds = input.content.sections
    .filter((section) => !weakSectionIds.has(section.id))
    .map((section) => section.id);

  return optimizationPlanSchema.parse({
    actionQueue: input.report.recommendedActions,
    preserveSectionIds,
    weakImageUrls: input.weakImageUrls,
    notes: [
      "Optimization is surgical: preserve strong sections and improve weak areas only.",
      "Do not regenerate whole site blindly.",
      "Source fidelity remains mandatory during all fixes.",
    ],
  });
}

export async function capturePreviewScreenshotIfNeeded(input: {
  sourceContext: OptimizationSourceContext;
}): Promise<{ compared: boolean; notes: string[] }> {
  const notes: string[] = [];
  const hasSource = (input.sourceContext.sourceScreenshots ?? []).length > 0;
  const hasGenerated = (input.sourceContext.currentPreviewScreenshots ?? []).length > 0;

  if (hasSource && hasGenerated) {
    notes.push("Source and generated screenshots available for visual comparison signal.");
    return { compared: true, notes };
  }

  notes.push("Screenshot comparison unavailable: one or both screenshots are missing.");
  return { compared: false, notes };
}

function replaceGenericPremiumCopy(value: string, businessName: string): string {
  return value
    .replace(/premium experience/gi, `${businessName} authentique`)
    .replace(/crafted excellence/gi, "details concrets du lieu")
    .replace(/culinary precision/gi, "specialites maison")
    .replace(/curated atmosphere/gi, "ambiance reelle de l'etablissement");
}

function replaceImageInSection(section: DemoSection, replacementUrl: string): DemoSection {
  const cloned = JSON.parse(JSON.stringify(section)) as DemoSection;
  const content = cloned.content as unknown as Record<string, unknown>;

  if (cloned.type === "hero") {
    content.image = replacementUrl;
  }

  const items = Array.isArray(content.items) ? (content.items as Array<Record<string, unknown>>) : [];
  if (items.length > 0) {
    const firstWithImage = items.find((item) => typeof item.image === "string");
    if (firstWithImage) {
      firstWithImage.image = replacementUrl;
    }
  }

  return cloned;
}

export function replaceWeakImages(input: {
  content: DemoSiteContent;
  plan: OptimizationPlan;
  sourceContext: OptimizationSourceContext;
}): { content: DemoSiteContent; optimizedImageSelection: Array<Record<string, unknown>>; applied: string[] } {
  const next = JSON.parse(JSON.stringify(input.content)) as DemoSiteContent;
  const selected = flattenSelectedImages(input.sourceContext.currentSelectedImages);
  const sourceImagePool = unique([
    ...((input.sourceContext.sourceSelectedImages ?? []).map((item) => asText(item.url))),
    ...((Array.isArray(input.sourceContext.sourceExtractedContent?.heroImages)
      ? (input.sourceContext.sourceExtractedContent?.heroImages as unknown[])
      : [])
      .map((value) => asText(value))),
    ...((Array.isArray(input.sourceContext.sourceExtractedContent?.galleryImages)
      ? (input.sourceContext.sourceExtractedContent?.galleryImages as unknown[])
      : [])
      .map((value) => asText(value))),
  ]);

  const applied: string[] = [];
  if (sourceImagePool.length === 0) {
    return { content: next, optimizedImageSelection: selected, applied };
  }

  for (const section of next.sections) {
    const shouldReplace = input.plan.actionQueue.some(
      (action) => action.actionType === "replace_image" && (!action.targetSectionId || action.targetSectionId === section.id),
    );
    if (!shouldReplace) {
      continue;
    }

    const replacement = sourceImagePool[(section.order + sourceImagePool.length) % sourceImagePool.length];
    const replaced = replaceImageInSection(section, replacement);
    Object.assign(section, replaced);
    applied.push(`image_replaced:${section.id}`);
  }

  const optimizedImageSelection = [
    ...selected,
    ...sourceImagePool.slice(0, 3).map((url) => ({
      url,
      role: "optimization_candidate",
      source: "source_pool",
    })),
  ];

  return {
    content: validateDemoSiteContent(next),
    optimizedImageSelection,
    applied,
  };
}

export function regenerateWeakSectionsOnly(input: {
  content: DemoSiteContent;
  plan: OptimizationPlan;
  sourceContext: OptimizationSourceContext;
}): { content: DemoSiteContent; applied: string[] } {
  const next = JSON.parse(JSON.stringify(input.content)) as DemoSiteContent;
  const applied: string[] = [];

  const removeTargets = new Set(
    input.plan.actionQueue.filter((action) => action.actionType === "remove_section").map((action) => action.targetSectionId).filter(Boolean) as string[],
  );

  next.sections = next.sections.filter((section) => !removeTargets.has(section.id));

  next.sections = next.sections.map((section, index) => {
    const shouldRewrite = input.plan.actionQueue.some(
      (action) => action.actionType === "rewrite_copy" && (!action.targetSectionId || action.targetSectionId === section.id),
    );

    const shouldStrengthenHero = input.plan.actionQueue.some(
      (action) => action.actionType === "strengthen_hero" && (!action.targetSectionId || action.targetSectionId === section.id),
    );

    const updated = { ...section, order: index } as DemoSection;
    if (shouldRewrite) {
      const content = updated.content as unknown as Record<string, unknown>;
      Object.keys(content).forEach((key) => {
        if (typeof content[key] === "string") {
          content[key] = replaceGenericPremiumCopy(String(content[key]), next.businessInfo.name);
        }
      });
      applied.push(`copy_rewritten:${section.id}`);
    }

    if (updated.type === "hero" && shouldStrengthenHero) {
      const content = updated.content as unknown as Record<string, unknown>;
      const title = asText(content.title);
      if (title.length < 20) {
        content.title = `${next.businessInfo.name} - ${next.businessInfo.city}`;
      }
      const cta = content.primaryCta as Record<string, unknown> | undefined;
      if (cta && /learn more|discover/i.test(asText(cta.label))) {
        cta.label = "Reserver ou contacter";
      }
      applied.push(`hero_strengthened:${section.id}`);
    }

    return updated;
  });

  const shouldReorder = input.plan.actionQueue.some((action) => action.actionType === "reorder_sections");
  if (shouldReorder) {
    const ctaIndex = next.sections.findIndex((section) => section.type === "cta");
    const contactIndex = next.sections.findIndex((section) => section.type === "contact");
    if (ctaIndex !== -1 && contactIndex !== -1 && ctaIndex > contactIndex) {
      const [cta] = next.sections.splice(ctaIndex, 1);
      next.sections.splice(contactIndex, 0, cta);
      applied.push("sections_reordered:cta_before_contact");
    }
    next.sections = next.sections.map((section, index) => ({ ...section, order: index }));
  }

  return {
    content: validateDemoSiteContent(next),
    applied,
  };
}

export async function runOptimizationAudit(input: {
  content: DemoSiteContent;
  sourceContext: OptimizationSourceContext;
}): Promise<OptimizationAuditOutput> {
  const screenshotSignal = await capturePreviewScreenshotIfNeeded({ sourceContext: input.sourceContext });
  const baseline = analyzeGeneratedVsSource(input);

  const severityPenalty = baseline.issues.reduce((acc, issue) => {
    if (issue.severity === "critical") return acc + 18;
    if (issue.severity === "high") return acc + 10;
    if (issue.severity === "medium") return acc + 5;
    return acc + 2;
  }, 0);

  const fallbackReport: OptimizationReport = {
    overallScore: Math.max(0, 100 - severityPenalty),
    imageQualityScore: Math.max(0, 100 - baseline.issues.filter((issue) => issue.category === "image_quality" || issue.category === "image_relevance").length * 12),
    sourceFidelityScore: Math.max(0, 100 - baseline.issues.filter((issue) => issue.category === "source_fidelity" || issue.category === "semantic_mapping").length * 12),
    layoutQualityScore: Math.max(0, 100 - baseline.issues.filter((issue) => issue.category === "layout" || issue.category === "spacing").length * 12),
    premiumScore: Math.max(0, 100 - baseline.issues.filter((issue) => issue.category === "premium_quality").length * 12),
    conversionScore: Math.max(0, 100 - baseline.issues.filter((issue) => issue.category === "cta").length * 12),
    issues: baseline.issues,
    recommendedActions: baseline.recommendedActions,
  };

  const aiCandidate = await runAiJson<OptimizationReport>({
    systemPrompt: [
      "You are a strict optimization director for premium websites.",
      "The optimization phase must not regenerate the whole site blindly.",
      "Blurry images are unacceptable for premium delivery and must be replaced or downgraded in role.",
      "Compare generated output against source website fidelity, not abstract premium criteria only.",
      "Return valid OptimizationReport JSON only.",
    ].join(" "),
    userPrompt: JSON.stringify({
      source: input.sourceContext,
      generated: input.content,
      screenshotSignal,
      fallbackReport,
    }),
    fallback: fallbackReport,
  });

  const report = optimizationReportSchema.safeParse(aiCandidate).success
    ? optimizationReportSchema.parse(aiCandidate)
    : fallbackReport;

  const plan = buildOptimizationPlan({
    content: input.content,
    report,
    weakImageUrls: baseline.weakImageUrls,
  });

  return {
    report,
    plan,
    screenshotSignal,
  };
}

export async function applyOptimizationFixes(input: {
  content: DemoSiteContent;
  sourceContext: OptimizationSourceContext;
  report: OptimizationReport;
  plan: OptimizationPlan;
}): Promise<ApplyOptimizationOutput> {
  const imagePass = replaceWeakImages({
    content: input.content,
    plan: input.plan,
    sourceContext: input.sourceContext,
  });

  const sectionPass = regenerateWeakSectionsOnly({
    content: imagePass.content,
    plan: input.plan,
    sourceContext: input.sourceContext,
  });

  const optimizedContent = validateDemoSiteContent(sectionPass.content);
  const appliedActions = [...imagePass.applied, ...sectionPass.applied];
  const unchangedSectionIds = optimizedContent.sections
    .map((section) => section.id)
    .filter((sectionId) => input.plan.preserveSectionIds.includes(sectionId));

  return {
    optimizedContent,
    optimizedImageSelection: imagePass.optimizedImageSelection,
    appliedActions,
    unchangedSectionIds,
  };
}
