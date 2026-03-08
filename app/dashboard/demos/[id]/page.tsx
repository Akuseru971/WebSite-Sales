import { redirect } from "next/navigation";

interface DemoSitePageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoSitePage({ params }: DemoSitePageProps) {
  const { id } = await params;
  redirect(`/dashboard/demos/${id}/editor`);
}
