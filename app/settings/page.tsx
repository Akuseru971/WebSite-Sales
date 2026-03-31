import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import { getDefaultRoomPrompts } from "@/lib/listingboost/image-enhancement";
import { getSettings, updateSettings } from "@/lib/listingboost/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdminAuth();
  const settings = await getSettings();
  const defaultRoomPrompts = getDefaultRoomPrompts();

  async function saveAction(formData: FormData) {
    "use server";

    const roomPromptTemplates = {
      bedroom: String(formData.get("prompt_bedroom") || ""),
      living_room: String(formData.get("prompt_living_room") || ""),
      kitchen: String(formData.get("prompt_kitchen") || ""),
      bathroom: String(formData.get("prompt_bathroom") || ""),
      exterior: String(formData.get("prompt_exterior") || ""),
      shared_area: String(formData.get("prompt_shared_area") || ""),
      unknown: String(formData.get("prompt_unknown") || "")
    };

    await updateSettings({
      sender_name: String(formData.get("senderName") || "Axell Valentino"),
      sender_email: String(formData.get("senderEmail") || ""),
      sender_linkedin: String(formData.get("senderLinkedin") || settings.sender_linkedin),
      sender_whatsapp: String(formData.get("senderWhatsapp") || settings.sender_whatsapp),
      signature_name: String(formData.get("signatureName") || "Axell Valentino"),
      preferred_tone: String(formData.get("preferredTone") || "friendly-professional"),
      default_subject_style: String(formData.get("defaultSubjectStyle") || "quick-idea"),
      default_cta: String(formData.get("defaultCta") || settings.default_cta),
      branding_primary_color: String(formData.get("brandingPrimaryColor") || settings.branding_primary_color),
      branding_accent_color: String(formData.get("brandingAccentColor") || settings.branding_accent_color),
      default_mockup_rating: Number(formData.get("defaultMockupRating") || 4.7),
      daily_sending_cap: Number(formData.get("dailySendingCap") || 40),
      room_prompt_templates: roomPromptTemplates,
      provider_config: {
        resendApiKey: String(formData.get("resendApiKey") || ""),
        openaiApiKey: String(formData.get("openaiApiKey") || "")
      }
    });

    revalidatePath("/settings");
  }

  return (
    <AppShell title="Settings">
      <form action={saveAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid gap-2 md:grid-cols-2">
          <input name="senderName" defaultValue={settings.sender_name} placeholder="Sender name" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="senderEmail" defaultValue={settings.sender_email} placeholder="Sender email" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="senderLinkedin" defaultValue={settings.sender_linkedin} placeholder="LinkedIn URL" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="senderWhatsapp" defaultValue={settings.sender_whatsapp} placeholder="WhatsApp URL" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="signatureName" defaultValue={settings.signature_name} placeholder="Signature name" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="preferredTone" defaultValue={settings.preferred_tone} placeholder="Preferred tone" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="defaultSubjectStyle" defaultValue={settings.default_subject_style} placeholder="Default subject style" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="defaultCta" defaultValue={settings.default_cta} placeholder="Default CTA" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="brandingPrimaryColor" defaultValue={settings.branding_primary_color} placeholder="Brand primary color" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="brandingAccentColor" defaultValue={settings.branding_accent_color} placeholder="Brand accent color" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="defaultMockupRating" type="number" step="0.1" min="1" max="5" defaultValue={settings.default_mockup_rating} placeholder="Default rating" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="dailySendingCap" type="number" min="1" max="1000" defaultValue={settings.daily_sending_cap} placeholder="Daily cap" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input name="resendApiKey" type="password" placeholder="Resend API key (stored in settings table for MVP)" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <input name="openaiApiKey" type="password" placeholder="OpenAI API key (stored in settings table for MVP)" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
        </div>

        <section>
          <h3 className="text-sm font-semibold">Room-type prompt templates</h3>
          <div className="mt-2 grid gap-2">
            {Object.keys(defaultRoomPrompts).map((key) => (
              <label key={key} className="space-y-1 text-xs">
                <span className="uppercase tracking-[0.08em] text-zinc-500">{key}</span>
                <textarea
                  className="h-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  name={`prompt_${key}`}
                  defaultValue={(settings.room_prompt_templates?.[key] as string | undefined) ?? defaultRoomPrompts[key]}
                />
              </label>
            ))}
          </div>
        </section>

        <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Save settings</button>
      </form>
    </AppShell>
  );
}
