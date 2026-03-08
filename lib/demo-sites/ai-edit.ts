import OpenAI from "openai";
import type { DemoSiteContent } from "./types";
import { validateDemoSiteContent } from "./validation";

interface AiEditResult {
  suggestedContent: DemoSiteContent;
  rawModelOutput: string;
}

const AI_EDIT_SYSTEM_PROMPT = `You are an expert web content architect editing structured JSON for demo business websites.
Return JSON only. Do not include markdown fences.
Rules:
1) Preserve factual business fields unless explicitly instructed to change them.
2) Do not invent specific business facts. If you need copy, keep it generic and clearly demo-oriented.
3) Keep schema shape valid and stable.
4) Prefer minimal changes that satisfy instruction.
5) Keep section IDs stable when possible.
6) Respect existing style/tone unless instruction asks otherwise.`;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  return new OpenAI({ apiKey });
}

export async function updateDemoSiteJsonWithAI(input: {
  currentContent: DemoSiteContent;
  instruction: string;
}): Promise<AiEditResult> {
  if (!input.instruction.trim()) {
    throw new Error("AI edit instruction cannot be empty.");
  }

  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: "gpt-5.1-mini",
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: AI_EDIT_SYSTEM_PROMPT }]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Instruction:\n${input.instruction}\n\nCurrent JSON:\n${JSON.stringify(input.currentContent, null, 2)}\n\nReturn ONLY updated JSON object.`
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_object"
      }
    }
  });

  const outputText = response.output_text?.trim();
  if (!outputText) {
    throw new Error("OpenAI did not return any JSON output.");
  }

  const parsed = JSON.parse(outputText);
  const validated = validateDemoSiteContent(parsed);

  return {
    suggestedContent: validated,
    rawModelOutput: outputText
  };
}
