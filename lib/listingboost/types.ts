import { z } from "zod";

export const prospectStatusValues = [
  "new",
  "researched",
  "images_extracted",
  "mockup_generated",
  "email_drafted",
  "sent",
  "opened",
  "replied",
  "interested",
  "closed",
  "ignored"
] as const;

export const roomTypeValues = [
  "bedroom",
  "living_room",
  "kitchen",
  "bathroom",
  "exterior",
  "shared_area",
  "unknown"
] as const;

export const emailVariantValues = ["short", "standard", "premium"] as const;
export const mockupThemeValues = ["light", "dark"] as const;

export const prospectStatusSchema = z.enum(prospectStatusValues);
export const roomTypeSchema = z.enum(roomTypeValues);
export const emailVariantSchema = z.enum(emailVariantValues);
export const mockupThemeSchema = z.enum(mockupThemeValues);

export const prospectCreateSchema = z.object({
  businessName: z.string().min(2),
  niche: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().url().optional().or(z.literal("")),
  contactPageUrl: z.string().url().optional().or(z.literal("")),
  sourceQuery: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  source: z.string().default("manual"),
  confidenceScore: z.number().min(0).max(1).optional(),
  status: prospectStatusSchema.optional(),
  notes: z.string().optional()
});

export const propertyCreateSchema = z.object({
  prospectId: z.string().uuid(),
  propertyName: z.string().min(2),
  propertyUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  category: z.string().optional()
});

export const settingsSchema = z.object({
  senderName: z.string().min(2),
  senderEmail: z.string().email(),
  senderLinkedin: z.string().url(),
  senderWhatsapp: z.string().url(),
  signatureName: z.string().min(2),
  preferredTone: z.string().min(2),
  defaultSubjectStyle: z.string().min(2),
  defaultCta: z.string().min(2),
  brandingPrimaryColor: z.string().min(4),
  brandingAccentColor: z.string().min(4),
  defaultMockupRating: z.number().min(1).max(5),
  dailySendingCap: z.number().int().min(1).max(1000),
  roomPromptTemplates: z.record(z.string()),
  providerConfig: z.record(z.any()).optional()
});

export const discoverySchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  niche: z.string().optional(),
  query: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  limit: z.number().int().min(1).max(100).default(20)
});

export interface ProspectRow {
  id: string;
  business_name: string;
  niche: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  public_email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  contact_page_url: string | null;
  source_query: string | null;
  source_url: string | null;
  source: string;
  confidence_score: number;
  status: (typeof prospectStatusValues)[number];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyRow {
  id: string;
  prospect_id: string;
  property_name: string;
  property_url: string | null;
  address: string | null;
  category: string | null;
  extracted_at: string | null;
  mockup_status: string;
  extraction_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedImageRow {
  id: string;
  property_id: string;
  source_page_url: string;
  original_url: string | null;
  storage_path: string;
  alt_text: string | null;
  room_type: (typeof roomTypeValues)[number];
  width: number | null;
  height: number | null;
  phash: string | null;
  extraction_metadata: Record<string, unknown>;
  approved: boolean;
  created_at: string;
}

export interface ImprovedImageRow {
  id: string;
  extracted_image_id: string;
  storage_path: string;
  prompt_used: string;
  version: number;
  approved: boolean;
  provider: string;
  created_at: string;
}

export interface MockupRow {
  id: string;
  property_id: string;
  html_storage_path: string;
  png_storage_path: string | null;
  public_token: string;
  theme: (typeof mockupThemeValues)[number];
  created_at: string;
}

export interface OutboundEmailRow {
  id: string;
  prospect_id: string;
  campaign_id: string | null;
  subject: string;
  body: string;
  variant: (typeof emailVariantValues)[number];
  sender_email: string;
  provider: string;
  provider_message_id: string | null;
  sent_at: string | null;
  open_count: number;
  click_count: number;
  reply_status: string;
  status: string;
  created_at: string;
}

export interface SettingsRow {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_linkedin: string;
  sender_whatsapp: string;
  signature_name: string;
  preferred_tone: string;
  default_subject_style: string;
  default_cta: string;
  branding_primary_color: string;
  branding_accent_color: string;
  default_mockup_rating: number;
  daily_sending_cap: number;
  room_prompt_templates: Record<string, string>;
  provider_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
