import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import {
  getProspectById,
  listOutboundEmails,
  listProspects,
  listMockups,
  getSettings,
  updateProspectStatus,
  createActivityLog
} from "@/lib/listingboost/repository";
import { createEmailDraft, sendDraftEmail } from "@/lib/listingboost/email";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await requireAdminAuth();
  const [outbound, prospects, mockups, settings] = await Promise.all([
    listOutboundEmails(),
    listProspects(),
    listMockups(),
    getSettings()
  ]);

  async function draftAction(formData: FormData) {
    "use server";
    const prospectId = String(formData.get("prospectId") || "");
    const variant = String(formData.get("variant") || "standard") as "short" | "standard" | "premium";
    const prospect = await getProspectById(prospectId);
    const mockup = mockups.find((item) => item.property_id === String(formData.get("propertyId") || "")) || mockups[0];
    if (!prospect || !mockup) return;

    const previewLink = `${process.env.NEXT_PUBLIC_APP_URL}/mockups/share/${mockup.public_token}`;
    await createEmailDraft({
      prospectId,
      businessName: prospect.business_name,
      city: prospect.city || undefined,
      senderEmail: settings.sender_email,
      previewLink,
      variant
    });

    await updateProspectStatus(prospectId, "email_drafted");
    await createActivityLog({ prospect_id: prospectId, type: "email_drafted", payload: { variant, previewLink } });

    revalidatePath("/emails");
    revalidatePath("/prospects");
  }

  async function sendAction(formData: FormData) {
    "use server";
    const outboundEmailId = String(formData.get("outboundEmailId") || "");
    const prospectId = String(formData.get("prospectId") || "");
    const toEmail = String(formData.get("toEmail") || "");
    const subject = String(formData.get("subject") || "");
    const body = String(formData.get("body") || "");

    await sendDraftEmail({
      outboundEmailId,
      toEmail,
      subject,
      body,
      fromEmail: settings.sender_email
    });

    await updateProspectStatus(prospectId, "sent");
    await createActivityLog({ prospect_id: prospectId, type: "email_sent", payload: { outboundEmailId, toEmail } });

    revalidatePath("/emails");
    revalidatePath("/prospects");
  }

  return (
    <AppShell title="Emails">
      <form action={draftAction} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-base font-semibold">Generate draft</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <select required name="prospectId" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="">Prospect</option>
            {prospects.map((item) => (
              <option key={item.id} value={item.id}>{item.business_name}</option>
            ))}
          </select>
          <select required name="propertyId" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="">Property for preview link</option>
            {mockups.map((item) => (
              <option key={item.id} value={item.property_id}>{item.property_id}</option>
            ))}
          </select>
          <select name="variant" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="short">short</option>
            <option value="standard">standard</option>
            <option value="premium">premium</option>
          </select>
          <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Generate draft</button>
        </div>
      </form>

      <section className="space-y-3">
        {outbound.map((email) => {
          const prospect = prospects.find((item) => item.id === email.prospect_id);
          return (
            <form key={email.id} action={sendAction} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <input type="hidden" name="outboundEmailId" value={email.id} />
              <input type="hidden" name="prospectId" value={email.prospect_id} />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>To</span>
                  <input name="toEmail" defaultValue={prospect?.public_email || ""} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
                </label>
                <label className="space-y-1 text-sm">
                  <span>Subject</span>
                  <input name="subject" defaultValue={email.subject} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
                </label>
              </div>
              <label className="mt-2 block space-y-1 text-sm">
                <span>Body</span>
                <textarea name="body" defaultValue={email.body} className="h-36 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Status: {email.status}</span>
                <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" type="submit">Send via Resend</button>
              </div>
            </form>
          );
        })}
        {!outbound.length && <p className="text-sm text-zinc-500">No email drafts yet.</p>}
      </section>
    </AppShell>
  );
}
