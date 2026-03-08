import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { AboutSectionContent } from "@/lib/demo-sites/types";

interface AboutSectionProps {
  content: AboutSectionContent;
}

export function AboutSection({ content }: AboutSectionProps) {
  return (
    <SectionContainer id="about">
      <div className="grid gap-8 rounded-3xl border border-zinc-200/70 bg-white/75 p-8 shadow-soft md:grid-cols-[1fr_0.9fr] md:p-10">
        <SectionHeading title={content.title} />
        <div>
          <p className="text-sm leading-relaxed text-zinc-700 md:text-base">{content.body}</p>
          {content.bullets?.length ? (
            <ul className="mt-6 space-y-3 text-sm text-zinc-700 md:text-base">
              {content.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </SectionContainer>
  );
}
