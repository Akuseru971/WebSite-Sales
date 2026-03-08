import type { BusinessCategory, DemoSiteContent, DemoSiteStyle, DemoSection } from "./types";
import { SEEDED_DEMO_SITES } from "./defaults";
import { updateDemoSiteJsonWithAI } from "./ai-edit";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import { validateDemoSiteContent } from "./validation";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBaseTemplate(category: BusinessCategory): DemoSiteContent {
  const fallback = SEEDED_DEMO_SITES.find((site) => site.templateType === category) ?? SEEDED_DEMO_SITES[0];
  return deepClone(fallback.generatedContent);
}

function findSection<TType extends DemoSection["type"]>(
  content: DemoSiteContent,
  type: TType
): Extract<DemoSection, { type: TType }> | undefined {
  return content.sections.find((section) => section.type === type) as
    | Extract<DemoSection, { type: TType }>
    | undefined;
}

function applyLeadFacts(content: DemoSiteContent, params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  enriched: EnrichedCommerceLead;
}): DemoSiteContent {
  const { enriched, category } = params;
  const lead = enriched.lead;
  const next = deepClone(content);

  next.businessInfo.name = lead.businessName;
  next.businessInfo.category = category;
  next.businessInfo.city = lead.city;
  next.businessInfo.country = lead.country ?? "France";
  next.businessInfo.address = lead.address;
  next.businessInfo.phone = lead.phone;
  next.businessInfo.email = lead.email;
  next.businessInfo.shortDescription = enriched.inferredDescription;
  next.businessInfo.tagline = enriched.inferredDescription;

  next.contact.contactName = lead.businessName;
  next.contact.phone = lead.phone;
  next.contact.email = lead.email;
  next.contact.openingHours = lead.openingHours ? [lead.openingHours] : next.contact.openingHours;

  const hero = findSection(next, "hero");
  if (hero) {
    hero.content.title = lead.businessName;
    hero.content.subtitle = enriched.inferredDescription ?? hero.content.subtitle;
    hero.content.badge = `${lead.city} ${category.replace("_", " ")}`;

    const firstImage = enriched.suggestedImages[0];
    if (firstImage) {
      hero.content.image = firstImage;
    }
  }

  const contact = findSection(next, "contact");
  if (contact) {
    contact.content.title = `Contact ${lead.businessName}`;
    contact.content.address = lead.address ?? contact.content.address;
    contact.content.phone = lead.phone ?? contact.content.phone;
    contact.content.email = lead.email ?? contact.content.email;
    contact.content.hours = lead.openingHours ? [lead.openingHours] : contact.content.hours;
    if (lead.latitude && lead.longitude) {
      contact.content.mapsUrl = `https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`;
    }
  }

  const gallery = findSection(next, "gallery");
  if (gallery && enriched.suggestedImages.length) {
    gallery.content.items = enriched.suggestedImages.slice(0, 6).map((image, index) => ({
      image,
      alt: `${lead.businessName} image ${index + 1}`
    }));
  }

  const menu = findSection(next, "menu_highlights");
  if (menu && enriched.inferredMenuItems.length) {
    menu.content.items = enriched.inferredMenuItems.slice(0, 6).map((line, index) => ({
      name: `Selection ${index + 1}`,
      description: line,
      priceHint: undefined,
      image: enriched.suggestedImages[index] ?? enriched.suggestedImages[0]
    }));
  }

  return validateDemoSiteContent(next);
}

function buildPrompt(params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  siteLabel: string;
  enriched: EnrichedCommerceLead;
}): string {
  const { category, style, siteLabel, enriched } = params;
  const lead = enriched.lead;

  return [
    `Remodel this website content for a real business using verified facts only.`,
    `Target category: ${category}`,
    `Design style: ${style}`,
    `Variant label: ${siteLabel}`,
    `Business name: ${lead.businessName}`,
    `City: ${lead.city}`,
    `Address: ${lead.address ?? "unknown"}`,
    `Phone: ${lead.phone ?? "unknown"}`,
    `Email: ${lead.email ?? "unknown"}`,
    `Website: ${lead.website ?? "unknown"}`,
    `Opening hours: ${lead.openingHours ?? "unknown"}`,
    `Description hints: ${enriched.inferredDescription ?? "none"}`,
    `Menu hints: ${enriched.inferredMenuItems.join(" | ") || "none"}`,
    `Image candidates: ${enriched.suggestedImages.join(" | ") || "none"}`,
    `Requirements:`,
    `- Keep all JSON schema fields valid.`,
    `- Make copy persuasive and local to the city.`,
    `- Use menu hints when category is restaurant.`,
    `- Use images provided when relevant sections exist.`,
    `- Keep CTA focused on lead conversion.`,
    `- Do not invent hard facts not present above.`
  ].join("\n");
}

export async function generateDemoSiteContentWithAI(params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  siteLabel: string;
  enriched: EnrichedCommerceLead;
}): Promise<DemoSiteContent> {
  const baseTemplate = getBaseTemplate(params.category);
  const baseContent = applyLeadFacts(baseTemplate, {
    category: params.category,
    style: params.style,
    enriched: params.enriched
  });

  try {
    const instruction = buildPrompt(params);
    const result = await updateDemoSiteJsonWithAI({
      currentContent: baseContent,
      instruction
    });

    return validateDemoSiteContent(result.suggestedContent);
  } catch {
    // Fallback to deterministic remodeling if AI response fails.
    return baseContent;
  }
}
