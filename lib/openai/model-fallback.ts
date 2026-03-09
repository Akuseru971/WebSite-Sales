import OpenAI from "openai";

const DEFAULT_MODEL_CANDIDATES = ["gpt-5-mini", "gpt-4.1-mini", "gpt-4o-mini"];

type ResponseCreateInput = Omit<Parameters<OpenAI["responses"]["create"]>[0], "model">;
type NonStreamingResponse = Awaited<ReturnType<OpenAI["responses"]["create"]>> & {
  output_text?: string;
};

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    output.push(normalized);
  });

  return output;
}

export function getOpenAiModelCandidates(): string[] {
  const fromEnv = (process.env.OPENAI_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const preferred = process.env.OPENAI_MODEL?.trim();

  return uniqueStrings([
    ...(preferred ? [preferred] : []),
    ...fromEnv,
    ...DEFAULT_MODEL_CANDIDATES,
  ]);
}

function isModelNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /does not exist|model.*not found|invalid model/i.test(message);
}

export async function createResponseWithModelFallback(
  openai: OpenAI,
  request: ResponseCreateInput,
): Promise<NonStreamingResponse> {
  const candidates = getOpenAiModelCandidates();
  let lastError: unknown;

  for (const model of candidates) {
    try {
      return await openai.responses.create({
        ...request,
        model,
        stream: false,
      }) as NonStreamingResponse;
    } catch (error) {
      lastError = error;
      if (!isModelNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `No compatible OpenAI model available. Tried: ${candidates.join(", ")}. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
