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
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,.08),transparent_35%),radial-gradient(circle_at_85%_5%,rgba(245,158,11,.1),transparent_42%),var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Internal Tool</p>
            <h1 className="text-lg font-semibold">ListingBoost AI</h1>
          </div>
          <form action={logoutAction}>
            <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900" type="submit">
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8">
        <aside className="rounded-2xl border border-zinc-200 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <nav className="space-y-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
