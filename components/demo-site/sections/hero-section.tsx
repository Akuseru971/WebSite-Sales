import Link from "next/link";
import { ImageCard } from "@/components/demo-site/shared/image-card";
import { SectionContainer } from "@/components/demo-site/shared/container";
import type { HeroSectionContent } from "@/lib/demo-sites/types";

interface HeroSectionProps {
  content: HeroSectionContent;
}

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <SectionContainer className="pt-10 md:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-14">
        <div className="max-w-2xl">
          {content.badge ? (
            <p className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              {content.badge}
            </p>
          ) : null}
          <h1 className="mt-6 text-balance font-[var(--font-heading)] text-5xl leading-[0.98] text-ink sm:text-6xl lg:text-7xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-700 md:text-lg">{content.subtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={content.primaryCta.href}
              className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-soft ring-1 ring-ink/80 transition hover:-translate-y-0.5 hover:bg-zinc-800"
            >
              {content.primaryCta.label}
            </Link>
            {content.secondaryCta ? (
              <Link
                href={content.secondaryCta.href}
                className="inline-flex items-center rounded-full border border-zinc-300 bg-white/95 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:-translate-y-0.5 hover:border-zinc-400"
              >
                {content.secondaryCta.label}
              </Link>
            ) : null}
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Preview concept for sales outreach</p>
        </div>
        <ImageCard src={content.image} alt={content.title} className="aspect-[4/5] lg:aspect-[5/6]" />
      </div>
      <div className="section-divider" />
    </SectionContainer>
  );
}
