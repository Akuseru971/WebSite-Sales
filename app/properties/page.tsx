import Link from "next/link";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import { listProperties } from "@/lib/listingboost/repository";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  await requireAdminAuth();
  const properties = await listProperties();

  return (
    <AppShell title="Properties">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/70">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100/80 text-left text-xs uppercase tracking-[0.08em] text-zinc-500 dark:bg-zinc-800/70">
            <tr>
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">URL</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Extracted</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((item) => (
              <tr className="border-t border-zinc-200 dark:border-zinc-800" key={item.id}>
                <td className="px-3 py-2">
                  <Link className="font-medium text-sky-600 hover:underline" href={`/properties/${item.id}`}>
                    {item.property_name}
                  </Link>
                </td>
                <td className="max-w-sm truncate px-3 py-2">{item.property_url || "-"}</td>
                <td className="px-3 py-2">{item.mockup_status}</td>
                <td className="px-3 py-2">{item.extracted_at ? new Date(item.extracted_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
