import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { StatsSectionContent } from "@/lib/demo-sites/types";

interface StatsSectionProps {
  content: StatsSectionContent;
}

export function StatsSection({ content }: StatsSectionProps) {
  return (
    <SectionContainer>
      {content.title ? <SectionHeading title={content.title} /> : null}
      <div className="mt-10 grid gap-4 rounded-[2rem] border border-zinc-200/70 bg-white/90 p-6 shadow-soft sm:grid-cols-3 md:p-8">
        {content.items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-200/70 bg-gradient-to-b from-white to-zinc-50 p-5">
            <p className="font-[var(--font-heading)] text-4xl leading-none text-ink md:text-5xl">{item.value}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{item.label}</p>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
