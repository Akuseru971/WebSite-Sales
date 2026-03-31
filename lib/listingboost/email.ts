import OpenAI from "openai";
import { Resend } from "resend";
import { createOutboundEmail, getSettings, updateOutboundEmail } from "@/lib/listingboost/repository";
import { getListingBoostEnv } from "@/lib/listingboost/env";
import type { emailVariantValues } from "@/lib/listingboost/types";

const variantGuidance: Record<(typeof emailVariantValues)[number], string> = {
  short: "Maximum 90 words. Punchy and clean.",
  standard: "Around 120-160 words. Friendly and professional.",
  premium: "Around 180-230 words. Adds a strategic angle and value framing."
};

export async function generateOutreachEmail(params: {
  businessName: string;
  city?: string;
  previewLink: string;
  variant: (typeof emailVariantValues)[number];
}) {
  const settings = await getSettings();
  const env = getListingBoostEnv();

  if (!env.OPENAI_API_KEY) {
    return {
      subject: "Quick idea to improve your listing photos",
      body: `Hi,\n\nMy name is ${settings.sender_name}, and I help accommodation listings improve visual quality online.\nI created a quick preview from your current photos while preserving the same layout and furniture, and improving lighting, clarity and presentation.\nPreview: ${params.previewLink}\n\nIf useful, I can prepare a full upgraded set for the listing.\nWhatsApp: ${settings.sender_whatsapp}\nLinkedIn: ${settings.sender_linkedin}\n\nBest regards,\n${settings.signature_name}`
    };
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const prompt = `Write an outreach email in English.\nBusiness: ${params.businessName}\nCity: ${params.city ?? "N/A"}\nPreview link: ${params.previewLink}\nSender: ${settings.sender_name}\nLinkedIn: ${settings.sender_linkedin}\nWhatsApp: ${settings.sender_whatsapp}\nSignature: ${settings.signature_name}\nTone: concise, clean, friendly, professional, never spammy.\nMust mention same layout/furniture preserved and booking conversion angle.\nVariant instruction: ${variantGuidance[params.variant]}\nReturn JSON {\"subject\":\"...\",\"body\":\"...\"}.`;

  const completion = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "outreach_email",
        schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          },
          required: ["subject", "body"],
          additionalProperties: false
        }
      }
    }
  });

  const raw = completion.output_text;
  const parsed = JSON.parse(raw) as { subject: string; body: string };
  return parsed;
}

export async function createEmailDraft(params: {
  prospectId: string;
  businessName: string;
  city?: string;
  senderEmail: string;
  previewLink: string;
  variant: (typeof emailVariantValues)[number];
}) {
  const generated = await generateOutreachEmail({
    businessName: params.businessName,
    city: params.city,
    previewLink: params.previewLink,
    variant: params.variant
  });

  return createOutboundEmail({
    prospect_id: params.prospectId,
    subject: generated.subject,
    body: generated.body,
    variant: params.variant,
    sender_email: params.senderEmail,
    provider: "resend",
    status: "draft"
  });
}

export async function sendDraftEmail(params: {
  outboundEmailId: string;
  toEmail: string;
  subject: string;
  body: string;
  fromEmail: string;
}) {
  const env = getListingBoostEnv();
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const response = await resend.emails.send({
    from: params.fromEmail,
    to: [params.toEmail],
    subject: params.subject,
    text: params.body
  });

  if (response.error) {
    await updateOutboundEmail(params.outboundEmailId, {
      status: "failed"
    });
    throw new Error(response.error.message);
  }

  return updateOutboundEmail(params.outboundEmailId, {
    provider_message_id: response.data?.id ?? null,
    status: "sent",
    sent_at: new Date().toISOString()
  });
}
