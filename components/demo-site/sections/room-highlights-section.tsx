import { ImageCard } from "@/components/demo-site/shared/image-card";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { RoomHighlightsContent } from "@/lib/demo-sites/types";

interface RoomHighlightsSectionProps {
  content: RoomHighlightsContent;
}

export function RoomHighlightsSection({ content }: RoomHighlightsSectionProps) {
  return (
    <SectionContainer id="rooms">
      <SectionHeading title={content.title} />
      <div className="mt-12 space-y-6">
        {content.items.map((item) => (
          <article key={item.name} className="card-premium grid gap-4 overflow-hidden md:grid-cols-[0.92fr_1.08fr]">
            <ImageCard src={item.image} alt={item.name} className="aspect-[4/3] rounded-none border-none shadow-none" />
            <div className="p-6 md:p-9">
              <h3 className="font-[var(--font-heading)] text-4xl leading-tight text-ink">{item.name}</h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-700 md:text-base">{item.description}</p>
              {item.capacityHint ? (
                <p className="mt-6 inline-flex rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-700">
                  {item.capacityHint}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
}
