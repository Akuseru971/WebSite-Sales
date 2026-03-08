import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { FAQSectionContent } from "@/lib/demo-sites/types";

interface FAQSectionProps {
  content: FAQSectionContent;
}

export function FAQSection({ content }: FAQSectionProps) {
  return (
    <SectionContainer id="faq">
      <SectionHeading title={content.title} />
      <div className="mt-8 space-y-3">
        {content.items.map((item) => (
          <details key={item.question} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink md:text-base">{item.question}</summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">{item.answer}</p>
          </details>
        ))}
      </div>
    </SectionContainer>
  );
}
