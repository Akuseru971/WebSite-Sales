import { createListingBoostAdmin } from "@/lib/listingboost/supabase";
import type {
  ExtractedImageRow,
  ImprovedImageRow,
  MockupRow,
  OutboundEmailRow,
  PropertyRow,
  ProspectRow,
  SettingsRow
} from "@/lib/listingboost/types";

const SETTINGS_SINGLETON_ID = "00000000-0000-0000-0000-000000000001";

export async function listProspects(filters?: {
  city?: string;
  country?: string;
  niche?: string;
  status?: string;
  hasEmail?: boolean;
  hasImages?: boolean;
  source?: string;
}) {
  const supabase = createListingBoostAdmin();
  let query = supabase.from("prospects").select("*").order("created_at", { ascending: false });

  if (filters?.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters?.country) query = query.ilike("country", `%${filters.country}%`);
  if (filters?.niche) query = query.ilike("niche", `%${filters.niche}%`);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.source) query = query.eq("source", filters.source);
  if (filters?.hasEmail) query = query.not("public_email", "is", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let prospects = (data ?? []) as ProspectRow[];

  if (filters?.hasImages) {
    const prospectIds = prospects.map((item) => item.id);
    if (!prospectIds.length) return [];

    const { data: props, error: propsError } = await supabase
      .from("properties")
      .select("id,prospect_id")
      .in("prospect_id", prospectIds);

    if (propsError) throw new Error(propsError.message);

    const propertyIds = (props ?? []).map((item) => item.id);
    if (!propertyIds.length) return [];

    const { data: imgs, error: imgsError } = await supabase
      .from("extracted_images")
      .select("property_id")
      .in("property_id", propertyIds);

    if (imgsError) throw new Error(imgsError.message);

    const hasImageProspectIds = new Set(
      (props ?? [])
        .filter((prop) => (imgs ?? []).some((img) => img.property_id === prop.id))
        .map((prop) => prop.prospect_id)
    );

    prospects = prospects.filter((item) => hasImageProspectIds.has(item.id));
  }

  return prospects;
}

export async function createProspect(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("prospects")
    .insert(input)
    .select("*")
    .single<ProspectRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to create prospect");
  return data;
}

export async function getProspectById(id: string) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("prospects").select("*").eq("id", id).single<ProspectRow>();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProspectStatus(id: string, status: string) {
  const supabase = createListingBoostAdmin();
  const { error } = await supabase.from("prospects").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createProperty(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("properties")
    .insert(input)
    .select("*")
    .single<PropertyRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to create property");
  return data;
}

export async function listProperties() {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PropertyRow[];
}

export async function getPropertyById(id: string) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("properties").select("*").eq("id", id).single<PropertyRow>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listPropertyImages(propertyId: string) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("extracted_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExtractedImageRow[];
}

export async function createExtractedImage(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("extracted_images")
    .insert(input)
    .select("*")
    .single<ExtractedImageRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to create extracted image");
  return data;
}

export async function createImprovedImage(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("improved_images")
    .insert(input)
    .select("*")
    .single<ImprovedImageRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to create improved image");
  return data;
}

export async function listImprovedImages(propertyId: string) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("improved_images")
    .select("*, extracted_images!inner(property_id)")
    .eq("extracted_images.property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ImprovedImageRow[];
}

export async function createMockup(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("mockups")
    .insert(input)
    .select("*")
    .single<MockupRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to create mockup");
  return data;
}

export async function getMockupByToken(token: string) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("mockups").select("*").eq("public_token", token).single<MockupRow>();
  if (error) throw new Error(error.message);
  return data;
}

export async function listMockups() {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("mockups").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MockupRow[];
}

export async function createOutboundEmail(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("outbound_emails")
    .insert(input)
    .select("*")
    .single<OutboundEmailRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to create outbound email");
  return data;
}

export async function updateOutboundEmail(id: string, patch: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("outbound_emails")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single<OutboundEmailRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to update outbound email");
  return data;
}

export async function listOutboundEmails() {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("outbound_emails").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OutboundEmailRow[];
}

export async function listCampaigns() {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCampaign(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.from("campaigns").insert(input).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create campaign");
  return data;
}

export async function createActivityLog(input: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { error } = await supabase.from("activity_logs").insert(input);
  if (error) throw new Error(error.message);
}

export async function getSettings() {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", SETTINGS_SINGLETON_ID)
    .single<SettingsRow>();
  if (error || !data) throw new Error(error?.message ?? "Settings not found");
  return data;
}

export async function updateSettings(patch: Record<string, unknown>) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase
    .from("settings")
    .update(patch)
    .eq("id", SETTINGS_SINGLETON_ID)
    .select("*")
    .single<SettingsRow>();

  if (error || !data) throw new Error(error?.message ?? "Failed to update settings");
  return data;
}

export async function getDashboardKpis() {
  const supabase = createListingBoostAdmin();
  const [prospects, properties, extracted, improved, mockups, outbound] = await Promise.all([
    supabase.from("prospects").select("id, public_email, status", { count: "exact", head: false }),
    supabase.from("properties").select("id", { count: "exact", head: false }),
    supabase.from("extracted_images").select("id", { count: "exact", head: false }),
    supabase.from("improved_images").select("id", { count: "exact", head: false }),
    supabase.from("mockups").select("id", { count: "exact", head: false }),
    supabase.from("outbound_emails").select("id, open_count, click_count, status", { count: "exact", head: false })
  ]);

  if (prospects.error) throw new Error(prospects.error.message);
  if (properties.error) throw new Error(properties.error.message);
  if (extracted.error) throw new Error(extracted.error.message);
  if (improved.error) throw new Error(improved.error.message);
  if (mockups.error) throw new Error(mockups.error.message);
  if (outbound.error) throw new Error(outbound.error.message);

  const prospectRows = (prospects.data ?? []) as Array<{ public_email: string | null; status: string }>;
  const outboundRows = (outbound.data ?? []) as Array<{ open_count: number; click_count: number; status: string }>;

  return {
    prospectsFound: prospects.count ?? 0,
    prospectsWithPublicEmails: prospectRows.filter((item) => Boolean(item.public_email)).length,
    propertiesWithExtractedImages: properties.count ?? 0,
    improvedImagesGenerated: improved.count ?? 0,
    mockupsGenerated: mockups.count ?? 0,
    emailsDrafted: outboundRows.filter((item) => item.status === "draft").length,
    emailsSent: outboundRows.filter((item) => item.status === "sent").length,
    opens: outboundRows.reduce((acc, item) => acc + (item.open_count || 0), 0),
    clicks: outboundRows.reduce((acc, item) => acc + (item.click_count || 0), 0),
    replies: prospectRows.filter((item) => item.status === "replied").length
  };
}
