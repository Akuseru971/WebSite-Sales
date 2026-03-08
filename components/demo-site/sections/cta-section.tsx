import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionContainer } from "@/components/demo-site/shared/container";
import type { CTASectionContent } from "@/lib/demo-sites/types";

interface CTASectionProps {
  content: CTASectionContent;
}

export function CTASection({ content }: CTASectionProps) {
  return (
    <SectionContainer id="cta">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-ink via-zinc-900 to-zinc-800 p-8 text-white shadow-premium md:p-12">
        <div className="pointer-events-none absolute -right-28 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative z-10">
          <h2 className="text-balance font-[var(--font-heading)] text-5xl leading-[1] md:text-6xl">{content.title}</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-200 md:text-lg">{content.body}</p>
        </div>
        <Link
          href={content.action.href}
          className="relative z-10 mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-zinc-100"
        >
          {content.action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </SectionContainer>
  );
}
