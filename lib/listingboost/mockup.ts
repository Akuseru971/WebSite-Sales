import crypto from "node:crypto";
import { chromium } from "playwright";
import { createMockup } from "@/lib/listingboost/repository";
import { STORAGE_BUCKETS, uploadBufferToStorage, getPublicStorageUrl } from "@/lib/listingboost/storage";
import { getListingBoostEnv } from "@/lib/listingboost/env";

function token() {
  return crypto.randomBytes(20).toString("hex");
}

export function buildMockupHtml(params: {
  businessName: string;
  category?: string;
  address?: string;
  rating?: number;
  description?: string;
  imageUrls: string[];
  theme: "light" | "dark";
}) {
  const bg = params.theme === "dark" ? "#0f172a" : "#f8fafc";
  const fg = params.theme === "dark" ? "#e2e8f0" : "#0f172a";
  const card = params.theme === "dark" ? "#111827" : "#ffffff";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${params.businessName} - ListingBoost Preview</title>
<style>
  body { margin:0; font-family: ui-sans-serif,system-ui; background:${bg}; color:${fg}; }
  .shell { max-width:960px; margin:0 auto; padding:20px; }
  .card { background:${card}; border-radius:18px; padding:18px; box-shadow: 0 18px 46px rgba(2,6,23,.22); }
  .hero { width:100%; border-radius:14px; aspect-ratio: 16/9; object-fit:cover; }
  .row { display:flex; gap:10px; overflow:auto; margin-top:14px; }
  .thumb { width:180px; height:120px; border-radius:10px; object-fit:cover; }
  .meta { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:10px; }
  .badge { background:#10b98122; border:1px solid #10b98155; color:#10b981; padding:6px 10px; border-radius:999px; font-size:12px; }
  .actions { display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
  .btn { text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:600; display:inline-block; }
  .btn-primary { background:#2563eb; color:white; }
  .btn-alt { background:#22c55e; color:white; }
</style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <div class="meta">
        <div>
          <h1 style="margin:0 0 4px;">${params.businessName}</h1>
          <p style="margin:0; opacity:.78;">${params.category ?? "Accommodation"} • ${params.address ?? "Address not provided"}</p>
        </div>
        <span class="badge">Improved visuals preview</span>
      </div>
      <p style="margin:0 0 12px;">⭐ ${params.rating?.toFixed(1) ?? "4.7"} Google-style showcase</p>
      <img class="hero" src="${params.imageUrls[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"}" alt="Hero" />
      <div class="row">
        ${params.imageUrls.slice(0, 8).map((url) => `<img class="thumb" src="${url}" alt="Preview image" />`).join("")}
      </div>
      <p style="line-height:1.6;">${params.description ?? "We refined your existing listing visuals while preserving the same rooms, same furniture, same angle and same layout to improve perceived quality and conversion."}</p>
      <div class="actions">
        <a class="btn btn-primary" href="#">Website</a>
        <a class="btn btn-alt" href="https://wa.me/33659059286">WhatsApp</a>
        <a class="btn" style="background:#0ea5e9;color:white;" href="tel:+33000000000">Call</a>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export async function generateMockup(params: {
  propertyId: string;
  businessName: string;
  imageUrls: string[];
  category?: string;
  address?: string;
  description?: string;
  theme: "light" | "dark";
}) {
  const html = buildMockupHtml({
    businessName: params.businessName,
    category: params.category,
    address: params.address,
    description: params.description,
    imageUrls: params.imageUrls,
    theme: params.theme,
    rating: 4.7
  });

  const now = Date.now();
  const htmlPath = `${params.propertyId}/mockup-${now}.html`;
  const pngPath = `${params.propertyId}/mockup-${now}.png`;
  const publicToken = token();

  await uploadBufferToStorage({
    bucket: STORAGE_BUCKETS.mockups,
    path: htmlPath,
    buffer: Buffer.from(html, "utf-8"),
    contentType: "text/html; charset=utf-8"
  });

  const browser = await chromium.launch({ headless: true });
  let pngBuffer: Buffer;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    pngBuffer = await page.screenshot({ type: "png", fullPage: true });
  } finally {
    await browser.close();
  }

  await uploadBufferToStorage({
    bucket: STORAGE_BUCKETS.mockups,
    path: pngPath,
    buffer: pngBuffer,
    contentType: "image/png"
  });

  const row = await createMockup({
    property_id: params.propertyId,
    html_storage_path: htmlPath,
    png_storage_path: pngPath,
    public_token: publicToken,
    theme: params.theme
  });

  const env = getListingBoostEnv();
  return {
    ...row,
    publicPreviewLink: `${env.NEXT_PUBLIC_APP_URL}/mockups/share/${publicToken}`,
    htmlPublicUrl: getPublicStorageUrl({ bucket: STORAGE_BUCKETS.mockups, path: htmlPath }),
    pngPublicUrl: getPublicStorageUrl({ bucket: STORAGE_BUCKETS.mockups, path: pngPath })
  };
}
