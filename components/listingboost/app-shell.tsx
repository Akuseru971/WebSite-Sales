import Link from "next/link";
import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/listingboost/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/prospects", label: "Prospects" },
  { href: "/properties", label: "Properties" },
  { href: "/mockups", label: "Mockups" },
  { href: "/emails", label: "Emails" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  async function logoutAction() {
    "use server";
    await clearAdminSession();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_-5%,rgba(16,185,129,.14),transparent_34%),radial-gradient(circle_at_96%_0%,rgba(251,146,60,.18),transparent_32%),linear-gradient(180deg,#f7f5f2_0%,#f1eee8_52%,#ece9e2_100%)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-[#cfc4b5]/70 bg-[#f8f4ee]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6e5a45]">Internal Studio</p>
            <h1 className="font-[var(--font-heading)] text-xl font-semibold text-[#20150b]">ListingBoost AI</h1>
          </div>
          <form action={logoutAction}>
            <button
              className="rounded-xl border border-[#b89a7a] bg-[#fff9f1] px-3 py-1.5 text-sm font-semibold text-[#5f4328] transition hover:-translate-y-0.5 hover:bg-[#fbeccf]"
              type="submit"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[250px_1fr] md:px-8">
        <aside className="fade-slide-in rounded-3xl border border-[#d6c7b3] bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(248,241,231,0.86))] p-3 shadow-[0_16px_40px_rgba(49,31,15,0.08)]">
          <nav className="space-y-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold text-[#5a4530] transition hover:bg-[#fff2df] hover:text-[#2d1c0f]"
              >
                <span>{item.label}</span>
                <span className="h-2 w-2 rounded-full bg-[#d7b089] opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </nav>
        </aside>

        <main className="space-y-5">
          <div className="fade-slide-in rounded-3xl border border-[#d7c7b1] bg-[linear-gradient(120deg,rgba(255,252,247,.95),rgba(253,244,233,.92))] px-5 py-4 shadow-[0_18px_45px_rgba(58,34,10,.09)]">
            <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight text-[#24180d]">{title}</h2>
            <p className="mt-1 text-sm text-[#7a6248]">Pilotage des performances acquisition et production visuelle.</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
