import OpenAI from "openai";
import { downloadStorageFile, STORAGE_BUCKETS, uploadBufferToStorage } from "@/lib/listingboost/storage";
import { createImprovedImage } from "@/lib/listingboost/repository";
import { getListingBoostEnv } from "@/lib/listingboost/env";

const defaultRoomPrompts: Record<string, string> = {
  bedroom:
    "Preserve the exact same room, same furniture, same architecture, same camera angle and perspective. Improve only brightness, lighting balance, white balance, texture clarity and realistic daylight for premium real estate photography.",
  living_room:
    "Keep the exact same living room layout, furniture identity and camera perspective. Improve only clarity, contrast, color harmony, clean presentation and realistic daylight.",
  kitchen:
    "Keep this exact kitchen unchanged in structure and composition. Improve only lighting, white balance, sharpness and cleanliness perception while preserving all objects.",
  bathroom:
    "Preserve same bathroom layout, tiles, fixtures and perspective. Improve only brightness, clean crisp rendering, color balance and detail clarity.",
  exterior:
    "Preserve exact same building exterior, geometry and perspective. Improve only daylight realism, sky balance, sharpness and contrast.",
  shared_area:
    "Preserve exact same common area architecture, furniture placement and perspective. Improve only natural lighting, balance, clarity and premium photo feel.",
  unknown:
    "Preserve same room, same layout, same furniture, same architecture and same perspective. Improve only brightness, white balance, sharpness, realistic daylight and clean premium listing presentation."
};

function toFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || "image.jpg";
}

async function improveWithOpenAI(params: {
  inputBuffer: Buffer;
  roomType: string;
  customPrompt?: string;
}) {
  const env = getListingBoostEnv();
  if (!env.OPENAI_API_KEY) {
    return params.inputBuffer;
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const finalPrompt = `${params.customPrompt ?? defaultRoomPrompts[params.roomType] ?? defaultRoomPrompts.unknown}\n\nStrictly forbidden: generating unrelated interiors or changing layout/furniture identity.`;

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: new File([new Uint8Array(params.inputBuffer)], "listing-original.jpg", { type: "image/jpeg" }),
    prompt: finalPrompt,
    size: "1536x1024"
  });

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    return params.inputBuffer;
  }

  return Buffer.from(base64, "base64");
}

export async function enhanceExtractedImage(params: {
  extractedImageId: string;
  originalStoragePath: string;
  roomType: string;
  customPrompt?: string;
  version: number;
}) {
  const originalBuffer = await downloadStorageFile({
    bucket: STORAGE_BUCKETS.originals,
    path: params.originalStoragePath
  });

  const improvedBuffer = await improveWithOpenAI({
    inputBuffer: originalBuffer,
    roomType: params.roomType,
    customPrompt: params.customPrompt
  });

  const improvedPath = `${params.extractedImageId}/v${params.version}-${toFileName(params.originalStoragePath)}`;

  await uploadBufferToStorage({
    bucket: STORAGE_BUCKETS.improved,
    path: improvedPath,
    buffer: improvedBuffer,
    contentType: "image/jpeg"
  });

  return createImprovedImage({
    extracted_image_id: params.extractedImageId,
    storage_path: improvedPath,
    prompt_used: params.customPrompt ?? defaultRoomPrompts[params.roomType] ?? defaultRoomPrompts.unknown,
    version: params.version,
    approved: false,
    provider: process.env.OPENAI_API_KEY ? "openai" : "passthrough"
  });
}

export function getDefaultRoomPrompts() {
  return { ...defaultRoomPrompts };
}
