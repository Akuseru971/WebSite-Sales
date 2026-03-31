import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/listingboost/auth";

export default async function HomePage() {
  const authenticated = await isAdminAuthenticated();
  redirect(authenticated ? "/dashboard" : "/login");
}
