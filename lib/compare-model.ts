import {
  buildUICompareUserPrompt,
  UI_COMPARE_SYSTEM_PROMPT,
} from "./compare-prompt";

const ZHIPU_CHAT_URL =
  "https://open.bigmodel.cn/api/paas/v4/chat/completions";

type ZhipuMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

type ChatResponse = {
  error?: { message?: string; code?: string };
  choices?: Array<{
    message?: { content?: string | ZhipuMessageContent };
  }>;
};

export function extractMessageText(
  content: string | ZhipuMessageContent | undefined,
): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (p): p is { type: "text"; text: string } =>
        p != null && typeof p === "object" && p.type === "text" && "text" in p,
    )
    .map((p) => p.text)
    .join("");
}

type CompareArgs = {
  designDataUrl: string;
  devDataUrl: string;
};

export async function compareWithZhipu(
  apiKey: string,
  model: string,
  { designDataUrl, devDataUrl }: CompareArgs,
): Promise<string> {
  const body = {
    model,
    temperature: 0.25,
    max_tokens: 4096,
    messages: [
      { role: "system" as const, content: UI_COMPARE_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: [
          { type: "image_url" as const, image_url: { url: designDataUrl } },
          { type: "image_url" as const, image_url: { url: devDataUrl } },
          {
            type: "text" as const,
            text: buildUICompareUserPrompt(),
          },
        ],
      },
    ],
  };

  const res = await fetch(ZHIPU_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = (await res.json()) as ChatResponse;

  if (!res.ok) {
    const msg =
      raw.error?.message ||
      `HTTP ${res.status}`;
    throw new Error(`智谱 API：${msg}`);
  }

  const text = extractMessageText(raw.choices?.[0]?.message?.content);
  if (!text.trim()) throw new Error("智谱未返回有效内容。");
  return text;
}

export async function compareWithOpenAI(
  apiKey: string,
  model: string,
  { designDataUrl, devDataUrl }: CompareArgs,
): Promise<string> {
  const body = {
    model,
    temperature: 0.25,
    max_tokens: 4096,
    messages: [
      { role: "system", content: UI_COMPARE_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildUICompareUserPrompt(),
          },
          {
            type: "image_url",
            image_url: { url: designDataUrl },
          },
          {
            type: "image_url",
            image_url: { url: devDataUrl },
          },
        ],
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = (await res.json()) as ChatResponse & {
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = raw.error?.message || `HTTP ${res.status}`;
    throw new Error(`OpenAI API：${msg}`);
  }

  const text = extractMessageText(raw.choices?.[0]?.message?.content);
  if (!text.trim()) throw new Error("OpenAI 未返回有效内容。");
  return text;
}

export function pickVisionProvider(): "openai" | "zhipu" | null {
  const prefer = process.env.COMPARE_VISION_PROVIDER?.trim().toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const zhipuKey = process.env.ZHIPU_API_KEY?.trim();

  if (prefer === "openai" && openaiKey) return "openai";
  if (prefer === "zhipu" && zhipuKey) return "zhipu";
  if (openaiKey) return "openai";
  if (zhipuKey) return "zhipu";
  return null;
}
