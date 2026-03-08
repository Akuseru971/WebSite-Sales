import { MapPinned } from "lucide-react";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { CoverageSectionContent } from "@/lib/demo-sites/types";

interface ServiceCoverageSectionProps {
  content: CoverageSectionContent;
}

export function ServiceCoverageSection({ content }: ServiceCoverageSectionProps) {
  return (
    <SectionContainer id="coverage">
      <SectionHeading title={content.title} />
      <div className="mt-7 rounded-3xl border border-zinc-200 bg-white p-7 shadow-soft md:p-9">
        <div className="flex flex-wrap gap-2">
          {content.areas.map((area) => (
            <span key={area} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-700">
              <MapPinned className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {area}
            </span>
          ))}
        </div>
        {content.note ? <p className="mt-5 text-sm leading-relaxed text-zinc-700">{content.note}</p> : null}
      </div>
    </SectionContainer>
  );
}
