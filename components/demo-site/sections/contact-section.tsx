import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { ContactSectionContent } from "@/lib/demo-sites/types";

interface ContactSectionProps {
  content: ContactSectionContent;
}

export function ContactSection({ content }: ContactSectionProps) {
  return (
    <SectionContainer id="contact" className="pb-20 md:pb-28">
      <div className="grid gap-8 rounded-[2rem] border border-zinc-200 bg-white/95 p-8 shadow-premium md:grid-cols-2 md:p-10">
        <SectionHeading title={content.title} />
        <div className="space-y-4 text-sm text-zinc-700 md:text-base">
          {content.address ? (
            <p className="flex gap-3 rounded-2xl bg-zinc-50 p-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span>{content.address}</span>
            </p>
          ) : null}
          {content.phone ? (
            <p className="flex gap-3 rounded-2xl bg-zinc-50 p-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span>{content.phone}</span>
            </p>
          ) : null}
          {content.email ? (
            <p className="flex gap-3 rounded-2xl bg-zinc-50 p-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span>{content.email}</span>
            </p>
          ) : null}
          {content.hours?.length ? (
            <div className="rounded-2xl bg-zinc-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Hours</p>
              <ul className="space-y-1">
                {content.hours.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {content.mapsUrl ? (
            <Link href={content.mapsUrl} target="_blank" className="inline-flex rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-zinc-400">
              Open in maps
            </Link>
          ) : null}
        </div>
      </div>
    </SectionContainer>
  );
}
