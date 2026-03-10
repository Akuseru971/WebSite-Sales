import OpenAI from "openai";
import { z } from "zod";
import type { DemoSection, DemoSiteContent } from "@/lib/demo-sites/types";
import { validateDemoSiteContent } from "@/lib/demo-sites/validation";
import { createResponseWithModelFallback } from "@/lib/openai/model-fallback";

const recommendedActionSchema = z.enum([
  "keep",
  "rewrite",
  "remove",
  "merge",
  "remap",
  "fill_missing_data",
]);

const sectionAuditSchema = z.object({
  sectionId: z.string().min(1),
  sectionType: z.string().min(1),
  score: z.number().min(0).max(100),
  issues: z.array(z.string().min(1)).default([]),
  recommendedAction: recommendedActionSchema,
  correctionNotes: z.string().optional(),
});

export const siteQualityAuditSchema = z.object({
  overallScore: z.number().min(0).max(100),
  sourceFidelityScore: z.number().min(0).max(100),
  semanticCoherenceScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  premiumQualityScore: z.number().min(0).max(100),
  sections: z.array(sectionAuditSchema),
  globalIssues: z.array(z.string().min(1)).default([]),
  missingCriticalFields: z.array(z.string().min(1)).default([]),
  mustFixBeforePreview: z.array(z.string().min(1)).default([]),
});

export type SiteQualityAudit = z.infer<typeof siteQualityAuditSchema>;

const correctionPlanItemSchema = z.object({
  sectionId: z.string().min(1),
  sectionType: z.string().min(1),
  action: recommendedActionSchema,
  reason: z.string().min(1),
  priority: z.enum(["critical", "high", "medium", "low"]),
  notes: z.array(z.string()).default([]),
});

export const correctionPlanSchema = z.object({
  globalActions: z.array(z.string()).default([]),
  sectionActions: z.array(correctionPlanItemSchema),
  preserveSectionIds: z.array(z.string()).default([]),
  mustFixFlags: z.array(z.string()).default([]),
});

export type SiteCorrectionPlan = z.infer<typeof correctionPlanSchema>;

export const validationStatusSchema = z.enum([
  "passed",
  "needs_correction",
  "corrected_pending_review",
  "approved",
  "rejected",
]);

export type SiteValidationStatus = z.infer<typeof validationStatusSchema>;

export interface PostCorrectionValidation {
  status: SiteValidationStatus;
  passed: boolean;
  audit: SiteQualityAudit;
  mustFixFlags: string[];
}

interface AuditContext {
  sourceData?: Record<string, unknown>;
  normalizedContent?: Record<string, unknown>;
  multilingual?: Record<string, unknown>;
  category?: string;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function asText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function sectionTextDensity(section: DemoSection): number {
  const raw = JSON.stringify(section.content);
  return raw.replace(/[{}\[\]",:]/g, " ").trim().length;
}

function detectHoursInText(value: string): boolean {
  return /(lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun|\d{1,2}\s*[:h]\s*\d{0,2}|am|pm|ferme|ouvert)/i.test(
    value,
  );
}

function detectAddressInText(value: string): boolean {
  return /(rue|avenue|av\.|boulevard|bd|street|road|rd|city|zip|\d{4,6})/i.test(value);
}

function hasGenericPremiumText(value: string): boolean {
  return /(premium experience|crafted excellence|culinary precision|curated atmosphere|exceptional journey|luxury lifestyle)/i.test(
    value.toLowerCase(),
  );
}

function contentTitleFromSection(section: DemoSection): string {
  const content = section.content as unknown as Record<string, unknown>;
  return asText(content.title) || asText(content.badge) || section.type;
}

function inferRecommendedAction(issues: string[], section: DemoSection): z.infer<typeof recommendedActionSchema> {
  if (issues.some((issue) => issue.includes("empty") || issue.includes("almost empty"))) {
    return "remove";
  }

  if (issues.some((issue) => issue.includes("misplaced") || issue.includes("wrong block"))) {
    return "remap";
  }

  if (issues.some((issue) => issue.includes("missing"))) {
    return "fill_missing_data";
  }

  if (section.type === "stats" && issues.length > 0) {
    return "merge";
  }

  return issues.length > 0 ? "rewrite" : "keep";
}

function safeParseAiAudit(value: unknown, fallback: SiteQualityAudit): SiteQualityAudit {
  const result = siteQualityAuditSchema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  return fallback;
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

export function detectSectionQualityIssues(input: {
  content: DemoSiteContent;
  sourceData?: Record<string, unknown>;
}): Array<{ sectionId: string; sectionType: string; issues: string[] }> {
  const sourceText = JSON.stringify(input.sourceData ?? {}).toLowerCase();

  return input.content.sections
    .filter((section) => section.enabled)
    .map((section) => {
      const issues: string[] = [];
      const text = JSON.stringify(section.content);
      const density = sectionTextDensity(section);

      if (density < 40) {
        issues.push("section appears empty or almost empty");
      }

      if (hasGenericPremiumText(text)) {
        issues.push("section uses generic premium filler not grounded in source");
      }

      if (section.type === "hero") {
        const hero = section.content as unknown as Record<string, unknown>;
        if (!asText(hero.title) || !asText(hero.subtitle)) {
          issues.push("hero lacks meaningful visual or textual completeness");
        }
      }

      if (section.type === "contact") {
        const contact = section.content as unknown as Record<string, unknown>;
        const phone = asText(contact.phone);
        const email = asText(contact.email);
        const address = asText(contact.address);
        const hours = Array.isArray(contact.hours)
          ? (contact.hours as unknown[]).map((value) => asText(value)).filter(Boolean)
          : [];

        if (!phone && /phone|tel|\+\d/.test(sourceText)) {
          issues.push("contact block misses major contact info that exists in source");
        }

        if (!email && sourceText.includes("@")) {
          issues.push("contact block misses major contact info that exists in source");
        }

        if (!address && detectAddressInText(sourceText)) {
          issues.push("address block is missing while address exists in source");
        }

        if (hours.length > 0 && !hours.some((line) => detectHoursInText(line))) {
          issues.push("opening hours block does not contain actual opening hours");
        }
      }

      return {
        sectionId: section.id,
        sectionType: section.type,
        issues,
      };
    })
    .filter((result) => result.issues.length > 0);
}

export function detectSemanticMisplacements(input: {
  content: DemoSiteContent;
  sourceData?: Record<string, unknown>;
  category?: string;
}): Array<{ sectionId: string; sectionType: string; issue: string }> {
  const out: Array<{ sectionId: string; sectionType: string; issue: string }> = [];

  for (const section of input.content.sections.filter((item) => item.enabled)) {
    const text = JSON.stringify(section.content).toLowerCase();
    const title = contentTitleFromSection(section).toLowerCase();

    if (section.type === "services" && /(menu|plat|entree|dessert|cocktail)/i.test(text)) {
      out.push({
        sectionId: section.id,
        sectionType: section.type,
        issue: "menu content is wrongly mapped as generic services",
      });
    }

    if (section.type === "menu_highlights" && /(consulting|audit|strategy|service package)/i.test(text)) {
      out.push({
        sectionId: section.id,
        sectionType: section.type,
        issue: "service content is misplaced inside menu section",
      });
    }

    if (section.type !== "contact" && /\b(opening hours|horaires|lundi|mardi|mercredi|thursday|friday)\b/i.test(text)) {
      out.push({
        sectionId: section.id,
        sectionType: section.type,
        issue: "opening hours are placed in the wrong block",
      });
    }

    if (section.type === "cta" && /book now|learn more|discover now/.test(text) && input.category === "restaurant") {
      out.push({
        sectionId: section.id,
        sectionType: section.type,
        issue: "generic English CTA is used on a French local restaurant without reason",
      });
    }

    if (section.type === "contact" && title.includes("menu")) {
      out.push({
        sectionId: section.id,
        sectionType: section.type,
        issue: "a section title does not match the content it contains",
      });
    }
  }

  return out;
}

export async function auditGeneratedSiteWithAI(input: {
  content: DemoSiteContent;
  context?: AuditContext;
}): Promise<SiteQualityAudit> {
  const sectionIssues = detectSectionQualityIssues({
    content: input.content,
    sourceData: input.context?.sourceData,
  });
  const misplacements = detectSemanticMisplacements({
    content: input.content,
    sourceData: input.context?.sourceData,
    category: input.context?.category,
  });

  const sectionAudit = input.content.sections
    .filter((section) => section.enabled)
    .map((section) => {
      const issues = [
        ...sectionIssues.find((entry) => entry.sectionId === section.id)?.issues ?? [],
        ...misplacements.filter((entry) => entry.sectionId === section.id).map((entry) => entry.issue),
      ];
      const score = Math.max(0, 100 - issues.length * 22);
      return {
        sectionId: section.id,
        sectionType: section.type,
        score,
        issues,
        recommendedAction: inferRecommendedAction(issues, section),
        correctionNotes: issues.length > 0 ? "Strict final editor: correct semantic mismatch before preview." : undefined,
      };
    });

  const missingCriticalFields: string[] = [];
  const sourceText = JSON.stringify(input.context?.sourceData ?? {}).toLowerCase();
  const contactText = JSON.stringify(input.content.contact ?? {}).toLowerCase();

  if (sourceText.includes("@") && !contactText.includes("@")) {
    missingCriticalFields.push("email");
  }

  if (/\+\d|\b0\d/.test(sourceText) && !/\+\d|\b0\d/.test(contactText)) {
    missingCriticalFields.push("phone");
  }

  if (detectAddressInText(sourceText) && !detectAddressInText(contactText)) {
    missingCriticalFields.push("address");
  }

  const mustFixBeforePreview = [
    ...sectionAudit.flatMap((section) => section.issues),
    ...missingCriticalFields.map((field) => `missing critical field: ${field}`),
  ].filter((issue) =>
    /empty|almost empty|opening hours|address block|contact block|wrongly mapped|generic english cta|title does not match|incoherent|filler|hero lacks/i.test(
      issue,
    ),
  );

  const fallbackAudit: SiteQualityAudit = {
    overallScore: Math.max(0, 100 - mustFixBeforePreview.length * 8),
    sourceFidelityScore: Math.max(0, 100 - missingCriticalFields.length * 18),
    semanticCoherenceScore: Math.max(0, 100 - misplacements.length * 20),
    completenessScore: Math.max(0, 100 - missingCriticalFields.length * 20),
    premiumQualityScore: Math.max(0, 100 - sectionAudit.filter((section) => section.issues.length > 0).length * 10),
    sections: sectionAudit,
    globalIssues: mustFixBeforePreview,
    missingCriticalFields,
    mustFixBeforePreview,
  };

  const aiCandidate = await runAiJson<SiteQualityAudit>({
    systemPrompt: [
      "You are a strict final editor before client delivery, not a supportive assistant.",
      "A visually beautiful section is NOT valid if content is semantically wrong.",
      "Prioritize semantic correctness, source fidelity, and business usefulness over premium wording.",
      "Never let a polished section pass if misplaced, generic, empty, or not grounded in source truth.",
      "Return JSON that exactly matches SiteQualityAudit shape.",
    ].join(" "),
    userPrompt: JSON.stringify({
      sourceData: input.context?.sourceData ?? {},
      normalizedContent: input.context?.normalizedContent ?? {},
      finalSiteJson: input.content,
      multilingual: input.context?.multilingual ?? {},
      fallbackAudit,
    }),
    fallback: fallbackAudit,
  });

  return safeParseAiAudit(aiCandidate, fallbackAudit);
}

export function buildCorrectionPlanFromAudit(input: {
  content: DemoSiteContent;
  audit: SiteQualityAudit;
}): SiteCorrectionPlan {
  const sectionActions: SiteCorrectionPlan["sectionActions"] = input.audit.sections
    .filter((section) => section.recommendedAction !== "keep")
    .map((section) => ({
      sectionId: section.sectionId,
      sectionType: section.sectionType,
      action: section.recommendedAction,
      reason: section.issues.join("; ") || "Quality correction required",
      priority: section.issues.some((issue) => /empty|hours|address|contact|wrongly mapped|incoherent/i.test(issue))
        ? "critical"
        : "high",
      notes: section.issues,
    }));

  const preserveSectionIds = input.audit.sections
    .filter((section) => section.recommendedAction === "keep")
    .map((section) => section.sectionId);

  const plan: SiteCorrectionPlan = {
    globalActions: [
      "Preserve sections marked keep.",
      "Remove semantically wrong or empty sections.",
      "Inject missing critical source fields in contact and hero as needed.",
    ],
    sectionActions,
    preserveSectionIds,
    mustFixFlags: [...input.audit.mustFixBeforePreview],
  };

  return correctionPlanSchema.parse(plan);
}

function replaceGenericPhrases(value: string, businessName: string): string {
  return value
    .replace(/premium experience/gi, `${businessName} experience`)
    .replace(/crafted excellence/gi, "faits maison et detail concret")
    .replace(/culinary precision/gi, "cuisine maison")
    .replace(/curated atmosphere/gi, "ambiance du lieu");
}

export async function correctGeneratedSiteWithAI(input: {
  content: DemoSiteContent;
  audit: SiteQualityAudit;
  correctionPlan: SiteCorrectionPlan;
  context?: AuditContext;
}): Promise<DemoSiteContent> {
  const next = JSON.parse(JSON.stringify(input.content)) as DemoSiteContent;
  const actionsBySection = new Map(input.correctionPlan.sectionActions.map((action) => [action.sectionId, action]));

  const correctedSections = next.sections
    .filter((section) => {
      const action = actionsBySection.get(section.id);
      return action?.action !== "remove";
    })
    .map((section) => {
      const action = actionsBySection.get(section.id);
      if (!action) {
        return section;
      }

      const content = section.content as unknown as Record<string, unknown>;

      if (action.action === "rewrite" || action.action === "fill_missing_data") {
        const rewritten = { ...content };
        for (const [key, value] of Object.entries(rewritten)) {
          if (typeof value === "string") {
            rewritten[key] = replaceGenericPhrases(value, next.businessInfo.name);
          }
        }

        if (section.type === "contact") {
          rewritten.address = asText(rewritten.address) || next.businessInfo.address || asText(input.context?.sourceData?.address);
          rewritten.phone = asText(rewritten.phone) || next.businessInfo.phone || asText(input.context?.sourceData?.phone);
          rewritten.email = asText(rewritten.email) || next.businessInfo.email || asText(input.context?.sourceData?.email);
          const hours = Array.isArray(rewritten.hours) ? (rewritten.hours as unknown[]) : [];
          if (hours.length === 0 && Array.isArray(input.context?.sourceData?.openingHours)) {
            rewritten.hours = (input.context?.sourceData?.openingHours as unknown[])
              .map((value) => asText(value))
              .filter(Boolean)
              .slice(0, 7);
          }
        }

        return {
          ...section,
          content: rewritten,
        };
      }

      return section;
    })
    .map((section, index) => ({ ...section, order: index }));

  next.sections = correctedSections as unknown as DemoSection[];

  const contactSection = next.sections.find((section) => section.type === "contact");
  if (!contactSection && (next.businessInfo.phone || next.businessInfo.email || next.businessInfo.address)) {
    next.sections.push({
      id: `contact-auto-${Date.now()}`,
      type: "contact",
      enabled: true,
      order: next.sections.length,
      content: {
        title: "Contact",
        address: next.businessInfo.address,
        phone: next.businessInfo.phone,
        email: next.businessInfo.email,
        hours: next.contact.openingHours ?? [],
      },
    } as DemoSection);
  }

  const validated = validateDemoSiteContent(next);

  // Optional AI rewrite pass constrained to problematic sections only.
  const aiPatch = await runAiJson<{ sectionPatches: Array<{ sectionId: string; content: Record<string, unknown> }> }>({
    systemPrompt:
      "Rewrite only problematic section content with source-faithful, concrete copy. Do not invent facts. Return JSON with sectionPatches.",
    userPrompt: JSON.stringify({
      sourceData: input.context?.sourceData ?? {},
      mustFix: input.audit.mustFixBeforePreview,
      correctionPlan: input.correctionPlan,
      sections: validated.sections,
    }),
    fallback: { sectionPatches: [] },
  });

  if (Array.isArray(aiPatch.sectionPatches) && aiPatch.sectionPatches.length > 0) {
    const byId = new Map(aiPatch.sectionPatches.map((patch) => [patch.sectionId, patch.content]));
    validated.sections = validated.sections.map((section) => {
      const patch = byId.get(section.id);
      if (!patch) {
        return section;
      }
      return {
        ...section,
        content: {
          ...(section.content as unknown as Record<string, unknown>),
          ...patch,
        },
      };
    }) as DemoSection[];
  }

  return validateDemoSiteContent(validated);
}

export async function validateSiteAfterCorrection(input: {
  correctedContent: DemoSiteContent;
  context?: AuditContext;
}): Promise<PostCorrectionValidation> {
  const audit = await auditGeneratedSiteWithAI({
    content: input.correctedContent,
    context: input.context,
  });

  const mustFixFlags = audit.mustFixBeforePreview;
  const passed = mustFixFlags.length === 0;

  return {
    status: passed ? "passed" : "needs_correction",
    passed,
    audit,
    mustFixFlags,
  };
}
