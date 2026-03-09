/* eslint-disable @next/next/no-img-element */
import type { DemoSiteRecord } from "@/lib/demo-sites/types";

interface PremiumRestaurantTemplateProps {
  site: DemoSiteRecord;
}

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  return values.find((value) => Boolean(value && value.trim()));
}

export function PremiumRestaurantTemplate({ site }: PremiumRestaurantTemplateProps) {
  const restaurant = site.generatedContent.restaurantContent;
  if (!restaurant) {
    return null;
  }

  const heroImage = firstNonEmpty([restaurant.heroImages[0], restaurant.galleryImages[0]]);
  const gallery = restaurant.galleryImages.slice(0, 8);
  const menuSections = restaurant.menuSections.slice(0, 4);
  const hasMenu = menuSections.length > 0;
  const primary = restaurant.brandColors.primary ?? "#1f130d";
  const secondary = restaurant.brandColors.secondary ?? "#f7efe6";
  const accent = restaurant.brandColors.accent ?? "#b8833f";
  const signatureHighlights = restaurant.signatureHighlights.slice(0, 6);
  const testimonials = restaurant.testimonials.slice(0, 4);

  return (
    <main
      className="restaurant-luxe min-h-screen text-[#1e1814]"
      style={{
        ["--restaurant-primary" as string]: primary,
        ["--restaurant-secondary" as string]: secondary,
        ["--restaurant-accent" as string]: accent,
      }}
    >
      <section className="relative min-h-[88vh] overflow-hidden sm:min-h-[92vh]">
        {heroImage ? <img src={heroImage} alt={restaurant.restaurantName} className="h-[88vh] w-full object-cover object-center sm:h-[92vh]" /> : <div className="h-[88vh] w-full bg-[color:var(--restaurant-primary)] sm:h-[92vh]" />}
        <div className="restaurant-hero-overlay absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-6 sm:px-8 lg:px-12">
          <p className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
            {site.generatedContent.businessInfo.city}
          </p>
          {restaurant.reservation?.url ? (
            <a href={restaurant.reservation.url} className="restaurant-ghost-btn text-xs sm:text-sm">
              {restaurant.reservation.label ?? "Reserve"}
            </a>
          ) : null}
        </div>

        <div className="absolute inset-0 z-10 mx-auto flex max-w-7xl flex-col justify-end px-6 pb-12 pt-24 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
          <div className="restaurant-fade-up max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--restaurant-accent)] sm:text-xs">Fine Dining Experience</p>
            <h1 className="mt-4 text-balance font-[var(--font-heading)] text-5xl leading-[0.9] text-white drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-8xl">
              {restaurant.restaurantName}
            </h1>
            {restaurant.tagline ? <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/90 sm:text-lg">{restaurant.tagline}</p> : null}
            {restaurant.shortDescription ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">{restaurant.shortDescription}</p> : null}
          </div>

          <div className="restaurant-fade-up mt-8 flex flex-wrap gap-3 sm:mt-10">
            {restaurant.reservation?.url ? (
              <a href={restaurant.reservation.url} className="restaurant-cta-btn">
                {restaurant.reservation.label ?? "Reserve a table"}
              </a>
            ) : (
              <a href="#contact" className="restaurant-cta-btn">
                Contact us
              </a>
            )}
            <a href="#menu" className="restaurant-ghost-btn">
              {hasMenu ? "View menu" : "Discover highlights"}
            </a>
          </div>

          <div className="restaurant-fade-up mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="restaurant-stat-chip">Curated Cuisine</div>
            <div className="restaurant-stat-chip">Seasonal Selection</div>
            <div className="restaurant-stat-chip">Premium Atmosphere</div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-24">
        <div className="restaurant-fade-up">
          <p className="restaurant-kicker">About</p>
          <h2 className="mt-3 max-w-2xl font-[var(--font-heading)] text-4xl leading-[1.02] text-[color:var(--restaurant-primary)] sm:text-5xl">
            A culinary house shaped by atmosphere and precision
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">{restaurant.aboutText ?? restaurant.shortDescription ?? "Restaurant presentation unavailable from source."}</p>
          {signatureHighlights.length ? (
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {signatureHighlights.map((highlight) => (
                <p key={highlight} className="rounded-xl border border-zinc-200/90 bg-white/85 px-4 py-2 text-sm text-zinc-700 shadow-[0_12px_30px_rgba(20,14,10,0.05)]">
                  {highlight}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="restaurant-fade-up rounded-[1.8rem] border border-zinc-200/90 bg-white/90 p-6 shadow-[0_22px_65px_rgba(19,13,10,0.12)] backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Details</p>
          <div className="mt-4 space-y-3 text-sm text-zinc-700 sm:text-[15px]">
            {restaurant.contact.phone ? <p><span className="font-semibold text-zinc-900">Phone:</span> {restaurant.contact.phone}</p> : null}
            {restaurant.contact.email ? <p><span className="font-semibold text-zinc-900">Email:</span> {restaurant.contact.email}</p> : null}
            {restaurant.contact.address ? <p><span className="font-semibold text-zinc-900">Address:</span> {restaurant.contact.address}</p> : null}
            {restaurant.openingHours?.length ? (
              <div>
                <p className="font-semibold text-zinc-900">Opening hours</p>
                <ul className="mt-1 space-y-1">
                  {restaurant.openingHours.slice(0, 7).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {restaurant.reservation?.url ? (
            <a href={restaurant.reservation.url} className="mt-6 inline-flex items-center rounded-full border border-[color:var(--restaurant-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--restaurant-primary)] transition hover:bg-[color:var(--restaurant-primary)] hover:text-white">
              Reserve now
            </a>
          ) : null}
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <div className="restaurant-fade-up mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="restaurant-kicker">Menu</p>
            <h2 className="mt-3 font-[var(--font-heading)] text-4xl leading-tight text-[color:var(--restaurant-primary)] sm:text-5xl">
              {hasMenu ? "Selected menu sections" : "Signature highlights"}
            </h2>
          </div>
          {restaurant.menuPdfUrls[0] ? (
            <a href={restaurant.menuPdfUrls[0]} className="restaurant-ghost-dark-btn">
              Open full menu
            </a>
          ) : null}
        </div>

        {hasMenu ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {menuSections.map((section, sectionIndex) => (
              <article key={section.title} className="restaurant-fade-up rounded-[1.8rem] border border-zinc-200/90 bg-white/95 p-6 shadow-[0_20px_55px_rgba(25,18,12,0.1)] sm:p-7" style={{ animationDelay: `${sectionIndex * 90}ms` }}>
                <h3 className="font-[var(--font-heading)] text-2xl text-[color:var(--restaurant-primary)] sm:text-3xl">{section.title}</h3>
                <div className="mt-5 space-y-3">
                  {section.items.slice(0, 8).map((item) => (
                    <div key={`${section.title}-${item.name}`} className="border-b border-zinc-200/75 pb-3.5 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-900 sm:text-[15px]">{item.name}</p>
                        {item.price ? <p className="rounded-full bg-[color:var(--restaurant-accent)]/14 px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--restaurant-primary)] sm:text-xs">{item.price}</p> : null}
                      </div>
                      {item.description ? <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.description}</p> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="restaurant-fade-up rounded-[1.8rem] border border-zinc-200/90 bg-white/95 p-6 shadow-[0_20px_55px_rgba(25,18,12,0.1)] sm:p-8">
            <p className="text-sm text-zinc-700">Public menu items were not accessible on the source website.</p>
            {signatureHighlights.length ? (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {signatureHighlights.slice(0, 8).map((highlight) => (
                  <li key={highlight} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">{highlight}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      {gallery.length ? (
        <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
          <div className="restaurant-fade-up">
            <p className="restaurant-kicker">Gallery</p>
            <h2 className="mt-3 font-[var(--font-heading)] text-4xl leading-tight text-[color:var(--restaurant-primary)] sm:text-5xl">Atmosphere and dishes</h2>
          </div>
          <div className="mt-7 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4 md:gap-4">
            {gallery.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className={`restaurant-fade-up group relative overflow-hidden rounded-2xl ${
                  index % 5 === 0 ? "col-span-2 row-span-2" : index % 3 === 0 ? "row-span-2" : ""
                }`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <img
                  src={image}
                  alt={`${restaurant.restaurantName} gallery ${index + 1}`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70 transition group-hover:opacity-85" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {testimonials.length ? (
        <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24">
          <div className="restaurant-fade-up">
            <p className="restaurant-kicker">Testimonials</p>
            <h2 className="mt-3 font-[var(--font-heading)] text-4xl leading-tight text-[color:var(--restaurant-primary)] sm:text-5xl">Guest impressions</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {testimonials.map((item, index) => (
              <blockquote key={`${item.text}-${index}`} className="restaurant-fade-up rounded-2xl border border-zinc-200/90 bg-white/95 p-5 text-sm leading-relaxed text-zinc-700 shadow-[0_20px_45px_rgba(20,12,8,0.08)]" style={{ animationDelay: `${index * 80}ms` }}>
                <p>&quot;{item.text}&quot;</p>
                {item.author ? <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{item.author}</footer> : null}
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      <section id="contact" className="mx-auto max-w-7xl px-6 pb-20 sm:px-8 lg:px-12">
        <div className="restaurant-fade-up relative overflow-hidden rounded-[2rem] bg-[color:var(--restaurant-primary)] p-8 text-white shadow-[0_35px_70px_rgba(20,12,8,0.38)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_90%_85%,rgba(184,131,63,0.22),transparent_42%)]" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--restaurant-accent)]">Reservation</p>
            <h2 className="mt-3 font-[var(--font-heading)] text-4xl leading-[1] sm:text-5xl">Book your table today</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
            {restaurant.shortDescription ?? `Plan your next dinner at ${restaurant.restaurantName}.`}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {restaurant.reservation?.url ? (
                <a href={restaurant.reservation.url} className="restaurant-cta-btn">
                  {restaurant.reservation.label ?? "Reserve now"}
                </a>
              ) : null}
              {restaurant.contact.phone ? (
                <a href={`tel:${restaurant.contact.phone}`} className="restaurant-ghost-btn">
                  Call {restaurant.contact.phone}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
