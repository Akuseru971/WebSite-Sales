import crypto from "node:crypto";
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { createExtractedImage, createProperty } from "@/lib/listingboost/repository";
import { STORAGE_BUCKETS, uploadBufferToStorage } from "@/lib/listingboost/storage";

interface ExtractImageResult {
  imageUrl: string;
  altText?: string;
  width?: number;
  height?: number;
}

interface ExtractionOutput {
  blocked: boolean;
  message?: string;
  propertyId?: string;
  extractedCount: number;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

function hashBuffer(buffer: Buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

function guessRoomType(input: string): string {
  const value = input.toLowerCase();
  if (value.includes("bed")) return "bedroom";
  if (value.includes("living") || value.includes("lounge")) return "living_room";
  if (value.includes("kitchen")) return "kitchen";
  if (value.includes("bath")) return "bathroom";
  if (value.includes("exterior") || value.includes("outside") || value.includes("facade")) return "exterior";
  if (value.includes("shared") || value.includes("common")) return "shared_area";
  return "unknown";
}

async function robotsBlocks(url: string): Promise<boolean> {
  try {
    const base = new URL(url);
    const robotsUrl = `${base.origin}/robots.txt`;
    const response = await fetch(robotsUrl, { cache: "no-store" });
    if (!response.ok) return false;
    const text = (await response.text()).toLowerCase();
    return text.includes("user-agent: *") && text.includes("disallow: /");
  } catch {
    return false;
  }
}

function normalizeImageUrl(src: string, pageUrl: string): string | null {
  if (!src) return null;
  if (src.startsWith("data:")) return null;

  try {
    const resolved = new URL(src, pageUrl).toString();
    const lower = resolved.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => lower.includes(ext))) {
      return null;
    }
    return resolved;
  } catch {
    return null;
  }
}

async function scrapeWithPlaywright(pageUrl: string): Promise<ExtractImageResult[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(1200);

    const html = await page.content();
    const $ = cheerio.load(html);
    const images: ExtractImageResult[] = [];

    $("meta[property='og:image']").each((_idx, el) => {
      const content = $(el).attr("content");
      if (content) images.push({ imageUrl: content });
    });

    $("img").each((_idx, el) => {
      const src =
        $(el).attr("src") ||
        $(el).attr("data-src") ||
        $(el).attr("data-original") ||
        $(el).attr("data-lazy-src") ||
        "";

      const srcset = $(el).attr("srcset") || "";
      const altText = $(el).attr("alt") || undefined;
      const width = Number($(el).attr("width") || "") || undefined;
      const height = Number($(el).attr("height") || "") || undefined;

      const normalizedSrc = normalizeImageUrl(src, pageUrl);
      if (normalizedSrc) {
        images.push({ imageUrl: normalizedSrc, altText, width, height });
      }

      if (srcset) {
        const srcsetCandidates = srcset
          .split(",")
          .map((entry) => entry.trim().split(" ")[0])
          .filter(Boolean);

        for (const candidate of srcsetCandidates) {
          const normalizedSrcset = normalizeImageUrl(candidate, pageUrl);
          if (normalizedSrcset) {
            images.push({ imageUrl: normalizedSrcset, altText, width, height });
          }
        }
      }
    });

    return images;
  } finally {
    await browser.close();
  }
}

export async function extractPropertyImages(params: {
  prospectId: string;
  propertyName: string;
  propertyUrl: string;
}) : Promise<ExtractionOutput> {
  if (await robotsBlocks(params.propertyUrl)) {
    return {
      blocked: true,
      message: "Source restricted — manual URL or screenshot upload required.",
      extractedCount: 0
    };
  }

  const property = await createProperty({
    prospect_id: params.prospectId,
    property_name: params.propertyName,
    property_url: params.propertyUrl,
    extracted_at: new Date().toISOString(),
    mockup_status: "pending"
  });

  const scraped = await scrapeWithPlaywright(params.propertyUrl);
  const dedup = new Set<string>();

  for (const item of scraped) {
    if (dedup.has(item.imageUrl)) continue;
    dedup.add(item.imageUrl);

    try {
      const response = await fetch(item.imageUrl, { cache: "no-store" });
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length) continue;

      const phash = hashBuffer(buffer);
      const extension = item.imageUrl.toLowerCase().includes(".png") ? "png" : "jpg";
      const storagePath = `${property.id}/${phash}.${extension}`;

      await uploadBufferToStorage({
        bucket: STORAGE_BUCKETS.originals,
        path: storagePath,
        buffer,
        contentType: extension === "png" ? "image/png" : "image/jpeg"
      });

      await createExtractedImage({
        property_id: property.id,
        source_page_url: params.propertyUrl,
        original_url: item.imageUrl,
        storage_path: storagePath,
        alt_text: item.altText ?? null,
        room_type: guessRoomType(`${item.altText ?? ""} ${item.imageUrl}`),
        width: item.width ?? null,
        height: item.height ?? null,
        phash,
        extraction_metadata: {
          extractedAt: new Date().toISOString(),
          via: "playwright_cheerio"
        },
        approved: false
      });
    } catch {
      // Keep extraction resilient; individual image failures should not fail the full run.
    }
  }

  return {
    blocked: false,
    propertyId: property.id,
    extractedCount: dedup.size
  };
}

export async function saveManualImageUpload(params: {
  propertyId: string;
  file: File;
  roomType?: string;
}) {
  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const phash = hashBuffer(buffer);
  const extension = params.file.type.includes("png") ? "png" : "jpg";
  const storagePath = `${params.propertyId}/manual-${phash}.${extension}`;

  await uploadBufferToStorage({
    bucket: STORAGE_BUCKETS.originals,
    path: storagePath,
    buffer,
    contentType: params.file.type || (extension === "png" ? "image/png" : "image/jpeg")
  });

  return createExtractedImage({
    property_id: params.propertyId,
    source_page_url: "manual_upload",
    original_url: null,
    storage_path: storagePath,
    alt_text: params.file.name,
    room_type: params.roomType ?? guessRoomType(params.file.name),
    width: null,
    height: null,
    phash,
    extraction_metadata: {
      extractedAt: new Date().toISOString(),
      via: "manual_upload"
    },
    approved: true
  });
}
