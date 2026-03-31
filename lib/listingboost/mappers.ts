import { prospectCreateSchema, propertyCreateSchema, settingsSchema } from "@/lib/listingboost/types";

export function toProspectInsert(input: unknown) {
  const parsed = prospectCreateSchema.parse(input);
  return {
    business_name: parsed.businessName,
    niche: parsed.niche || null,
    city: parsed.city || null,
    country: parsed.country || null,
    website: parsed.website || null,
    public_email: parsed.publicEmail || null,
    phone: parsed.phone || null,
    linkedin_url: parsed.linkedinUrl || null,
    instagram_url: parsed.instagramUrl || null,
    contact_page_url: parsed.contactPageUrl || null,
    source_query: parsed.sourceQuery || null,
    source_url: parsed.sourceUrl || null,
    source: parsed.source,
    confidence_score: parsed.confidenceScore ?? 0,
    status: parsed.status ?? "new",
    notes: parsed.notes || null
  };
}

export function toPropertyInsert(input: unknown) {
  const parsed = propertyCreateSchema.parse(input);
  return {
    prospect_id: parsed.prospectId,
    property_name: parsed.propertyName,
    property_url: parsed.propertyUrl || null,
    address: parsed.address || null,
    category: parsed.category || null
  };
}

export function toSettingsUpdate(input: unknown) {
  const parsed = settingsSchema.parse(input);
  return {
    sender_name: parsed.senderName,
    sender_email: parsed.senderEmail,
    sender_linkedin: parsed.senderLinkedin,
    sender_whatsapp: parsed.senderWhatsapp,
    signature_name: parsed.signatureName,
    preferred_tone: parsed.preferredTone,
    default_subject_style: parsed.defaultSubjectStyle,
    default_cta: parsed.defaultCta,
    branding_primary_color: parsed.brandingPrimaryColor,
    branding_accent_color: parsed.brandingAccentColor,
    default_mockup_rating: parsed.defaultMockupRating,
    daily_sending_cap: parsed.dailySendingCap,
    room_prompt_templates: parsed.roomPromptTemplates,
    provider_config: parsed.providerConfig ?? {}
  };
}
