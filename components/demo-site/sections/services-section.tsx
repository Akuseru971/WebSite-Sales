import { BriefcaseBusiness } from "lucide-react";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { ServicesSectionContent } from "@/lib/demo-sites/types";

interface ServicesSectionProps {
  content: ServicesSectionContent;
}

export function ServicesSection({ content }: ServicesSectionProps) {
  return (
    <SectionContainer id="services">
      <SectionHeading title={content.title} subtitle={content.subtitle} />
      <div className="mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
        {content.items.map((item) => (
          <article key={item.title} className="card-premium p-6 md:p-7">
            <div className="mb-5 inline-flex rounded-2xl bg-ink p-3 text-white">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 className="font-[var(--font-heading)] text-3xl leading-tight text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700 md:text-base">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
}
