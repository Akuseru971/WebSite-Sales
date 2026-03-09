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

  return (
    <main
      className="min-h-screen bg-[#f6f1ea] text-[#1e1814]"
      style={{
        ["--restaurant-primary" as string]: primary,
        ["--restaurant-secondary" as string]: secondary,
        ["--restaurant-accent" as string]: accent,
      }}
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--restaurant-primary)]/95 via-[color:var(--restaurant-primary)]/80 to-black/45" aria-hidden="true" />
        {heroImage ? <img src={heroImage} alt={restaurant.restaurantName} className="h-[70vh] w-full object-cover" /> : <div className="h-[70vh] w-full bg-[color:var(--restaurant-primary)]" />}
        <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-14 pt-20 sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--restaurant-accent)]">{site.generatedContent.businessInfo.city}</p>
          <h1 className="mt-4 max-w-3xl font-[var(--font-heading)] text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">{restaurant.restaurantName}</h1>
          {restaurant.shortDescription ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-100 sm:text-lg">{restaurant.shortDescription}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            {restaurant.reservation?.url ? (
              <a href={restaurant.reservation.url} className="rounded-full bg-[color:var(--restaurant-accent)] px-6 py-3 text-sm font-semibold text-[#25180f] transition hover:opacity-90">
                {restaurant.reservation.label ?? "Reserve a table"}
              </a>
            ) : (
              <a href="#contact" className="rounded-full bg-[color:var(--restaurant-accent)] px-6 py-3 text-sm font-semibold text-[#25180f] transition hover:opacity-90">
                Contact us
              </a>
            )}
            <a href="#menu" className="rounded-full border border-white/50 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur">
              {hasMenu ? "View menu" : "Discover highlights"}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--restaurant-accent)]">About</p>
          <h2 className="mt-2 font-[var(--font-heading)] text-4xl leading-tight text-[color:var(--restaurant-primary)]">A refined dining experience</h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-700">{restaurant.aboutText ?? restaurant.shortDescription ?? "Restaurant presentation unavailable from source."}</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Details</p>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
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
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-6 pb-14 sm:px-8 lg:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--restaurant-accent)]">Menu</p>
            <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[color:var(--restaurant-primary)]">
              {hasMenu ? "Selected menu sections" : "Signature highlights"}
            </h2>
          </div>
          {restaurant.menuPdfUrls[0] ? (
            <a href={restaurant.menuPdfUrls[0]} className="rounded-full border border-[color:var(--restaurant-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--restaurant-primary)]">
              Open full menu
            </a>
          ) : null}
        </div>

        {hasMenu ? (
          <div className="grid gap-5 md:grid-cols-2">
            {menuSections.map((section) => (
              <article key={section.title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="font-[var(--font-heading)] text-2xl text-[color:var(--restaurant-primary)]">{section.title}</h3>
                <div className="mt-4 space-y-3">
                  {section.items.slice(0, 8).map((item) => (
                    <div key={`${section.title}-${item.name}`} className="border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                        {item.price ? <p className="text-xs font-semibold text-[color:var(--restaurant-accent)]">{item.price}</p> : null}
                      </div>
                      {item.description ? <p className="mt-1 text-sm text-zinc-600">{item.description}</p> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-700">Public menu items were not accessible on the source website.</p>
            {restaurant.signatureHighlights.length ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {restaurant.signatureHighlights.slice(0, 8).map((highlight) => (
                  <li key={highlight} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{highlight}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      {gallery.length ? (
        <section className="mx-auto max-w-6xl px-6 pb-14 sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--restaurant-accent)]">Gallery</p>
          <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[color:var(--restaurant-primary)]">Atmosphere and dishes</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((image, index) => (
              <img key={`${image}-${index}`} src={image} alt={`${restaurant.restaurantName} gallery ${index + 1}`} className="h-52 w-full rounded-2xl object-cover sm:h-56 lg:h-48" />
            ))}
          </div>
        </section>
      ) : null}

      {restaurant.testimonials.length ? (
        <section className="mx-auto max-w-6xl px-6 pb-14 sm:px-8 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--restaurant-accent)]">Testimonials</p>
          <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[color:var(--restaurant-primary)]">Guest impressions</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {restaurant.testimonials.slice(0, 3).map((item, index) => (
              <blockquote key={`${item.text}-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-700 shadow-sm">
                <p>&quot;{item.text}&quot;</p>
                {item.author ? <footer className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{item.author}</footer> : null}
              </blockquote>
            ))}
          </div>
        </section>
      ) : null}

      <section id="contact" className="mx-auto max-w-6xl px-6 pb-20 sm:px-8 lg:px-10">
        <div className="rounded-3xl bg-[color:var(--restaurant-primary)] p-8 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--restaurant-accent)]">Reservation</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-4xl leading-tight">Book your table today</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200">
            {restaurant.shortDescription ?? `Plan your next dinner at ${restaurant.restaurantName}.`}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {restaurant.reservation?.url ? (
              <a href={restaurant.reservation.url} className="rounded-full bg-[color:var(--restaurant-accent)] px-6 py-3 text-sm font-semibold text-[#24170f]">
                {restaurant.reservation.label ?? "Reserve now"}
              </a>
            ) : null}
            {restaurant.contact.phone ? (
              <a href={`tel:${restaurant.contact.phone}`} className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white">
                Call {restaurant.contact.phone}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
