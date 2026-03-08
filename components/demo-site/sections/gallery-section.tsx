import { ImageCard } from "@/components/demo-site/shared/image-card";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { GallerySectionContent } from "@/lib/demo-sites/types";

interface GallerySectionProps {
  content: GallerySectionContent;
}

export function GallerySection({ content }: GallerySectionProps) {
  return (
    <SectionContainer id="gallery">
      <SectionHeading title={content.title} align="center" />
      <div className="mt-12 grid gap-4 md:grid-cols-12 md:gap-5">
        {content.items.map((item, index) => (
          <ImageCard
            key={`${item.alt}-${index}`}
            src={item.image}
            alt={item.alt}
            className={index === 0 ? "aspect-[4/3] md:col-span-6" : "aspect-[4/3] md:col-span-3"}
          />
        ))}
      </div>
    </SectionContainer>
  );
}
