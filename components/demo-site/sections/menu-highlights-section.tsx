import { ImageCard } from "@/components/demo-site/shared/image-card";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { MenuHighlightsContent } from "@/lib/demo-sites/types";

interface MenuHighlightsSectionProps {
  content: MenuHighlightsContent;
}

export function MenuHighlightsSection({ content }: MenuHighlightsSectionProps) {
  return (
    <SectionContainer id="menu">
      <SectionHeading title={content.title} />
      <div className="mt-11 grid gap-5 md:grid-cols-3 md:gap-6">
        {content.items.map((item) => (
          <article key={item.name} className="card-premium overflow-hidden">
            <ImageCard src={item.image} alt={item.name} className="aspect-[4/3] rounded-none border-none shadow-none" />
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-[var(--font-heading)] text-3xl leading-tight text-ink">{item.name}</h3>
                {item.priceHint ? <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-700">{item.priceHint}</span> : null}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-700 md:text-base">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
}
