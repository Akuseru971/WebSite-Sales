import Link from "next/link";
import { ImageCard } from "@/components/demo-site/shared/image-card";
import { SectionContainer } from "@/components/demo-site/shared/container";
import type { AdaptiveSiteComposition, HeroSectionContent } from "@/lib/demo-sites/types";

interface AdaptiveHeroProps {
  content: HeroSectionContent;
  composition?: AdaptiveSiteComposition;
}

export function AdaptiveHero({ content, composition }: AdaptiveHeroProps) {
  const variant = composition?.heroVariant ?? "split";

  if (variant === "centered") {
    return (
      <SectionContainer className="pt-14 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          {content.badge ? (
            <p className="inline-flex rounded-full border border-accent/30 bg-white/90 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              {content.badge}
            </p>
          ) : null}
          <h1 className="mt-6 text-balance font-[var(--font-heading)] text-5xl leading-[0.97] text-ink sm:text-6xl lg:text-7xl">
            {content.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">{content.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={content.primaryCta.href} className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-soft">
              {content.primaryCta.label}
            </Link>
            {content.secondaryCta ? (
              <Link href={content.secondaryCta.href} className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800">
                {content.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-10">
          <ImageCard src={content.image} alt={content.title} className="aspect-[16/8]" />
        </div>
      </SectionContainer>
    );
  }

  if (variant === "immersive" || variant === "showcase") {
    return (
      <SectionContainer className="pt-10 md:pt-14">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-zinc-950 text-white shadow-premium">
          <ImageCard src={content.image} alt={content.title} className="aspect-[16/9] opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" aria-hidden="true" />
          <div className="absolute inset-0 flex items-end p-8 md:p-12">
            <div className="max-w-3xl">
              {content.badge ? (
                <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-100">
                  {content.badge}
                </p>
              ) : null}
              <h1 className="mt-5 text-balance font-[var(--font-heading)] text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
                {content.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-200 md:text-lg">{content.subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={content.primaryCta.href} className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink shadow-soft">
                  {content.primaryCta.label}
                </Link>
                {content.secondaryCta ? (
                  <Link href={content.secondaryCta.href} className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-zinc-100">
                    {content.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
    );
  }

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
        </div>
        <ImageCard src={content.image} alt={content.title} className="aspect-[4/5] lg:aspect-[5/6]" />
      </div>
      <div className="section-divider" />
    </SectionContainer>
  );
}
