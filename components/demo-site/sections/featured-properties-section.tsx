import { ImageCard } from "@/components/demo-site/shared/image-card";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { FeaturedPropertiesContent } from "@/lib/demo-sites/types";

interface FeaturedPropertiesSectionProps {
  content: FeaturedPropertiesContent;
}

export function FeaturedPropertiesSection({ content }: FeaturedPropertiesSectionProps) {
  return (
    <SectionContainer id="featured">
      <SectionHeading title={content.title} subtitle={content.subtitle} />
      <div className="mt-11 grid gap-5 md:grid-cols-3 md:gap-6">
        {content.items.map((item) => (
          <article key={item.title} className="card-premium overflow-hidden">
            <ImageCard src={item.image} alt={item.title} className="aspect-[4/3] rounded-none border-none shadow-none" />
            <div className="p-5 md:p-6">
              <h3 className="font-[var(--font-heading)] text-3xl leading-tight text-ink">{item.title}</h3>
              <p className="mt-3 text-sm text-zinc-700 md:text-base">{item.location}</p>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                <span>{item.type}</span>
                <span>{item.priceHint}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
}
