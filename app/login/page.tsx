import { redirect } from "next/navigation";
import { createAdminSession, isAdminAuthenticated } from "@/lib/listingboost/auth";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/dashboard");
  }

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const ok = await createAdminSession(email, password);
    if (!ok) {
      redirect("/login?error=invalid");
    }
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,.14),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(245,158,11,.15),transparent_36%),#f8fafc] p-5 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-zinc-200 bg-white/85 p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">ListingBoost AI</p>
        <h1 className="mt-2 text-3xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Single-operator protected internal workspace.</p>

        <form action={loginAction} className="mt-8 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm">Admin email</span>
            <input className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="email" type="email" required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Password</span>
            <input className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="password" type="password" required />
          </label>
          <button className="w-full rounded-xl bg-sky-600 px-3 py-2 font-semibold text-white transition hover:bg-sky-700" type="submit">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
