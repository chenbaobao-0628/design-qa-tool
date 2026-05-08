import { NextResponse } from "next/server";
import { alignImagePair } from "@/lib/align-images";
import {
  compareWithOpenAI,
  compareWithZhipu,
  pickVisionProvider,
} from "@/lib/compare-model";
import { buildDesignQASummary } from "@/lib/design-qa-summary";
import { parseDesignQAJson } from "@/lib/parse-design-qa";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const PERFECT_SUMMARY = {
  consistencyPercent: 100,
  mustFix: 0,
  suggestFix: 0,
  canIgnore: 0,
  mainIssues: ["✅ 页面与设计稿一致（像素对齐后无差异）。"],
};

export async function POST(request: Request) {
  const provider = pickVisionProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error:
          "请配置 OPENAI_API_KEY 或 ZHIPU_API_KEY（二选一即可，优先使用已配置的 OpenAI）。可选 COMPARE_VISION_PROVIDER=openai|zhipu 强制指定。",
      },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析表单数据。" }, { status: 400 });
  }

  const designBlob = formData.get("design");
  const devBlob = formData.get("dev");

  if (!(designBlob instanceof Blob) || !(devBlob instanceof Blob)) {
    return NextResponse.json(
      { error: "请同时上传 design 与 dev 两个图片字段。" },
      { status: 400 },
    );
  }

  for (const [label, blob] of [
    ["design", designBlob],
    ["dev", devBlob],
  ] as const) {
    const mime = blob.type || "";
    if (!mime.startsWith("image/")) {
      return NextResponse.json(
        { error: `${label} 必须是图片文件。` },
        { status: 400 },
      );
    }
    if (blob.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `${label} 需小于 5MB。` },
        { status: 400 },
      );
    }
  }

  let designBuf: Buffer;
  let devBuf: Buffer;
  try {
    designBuf = Buffer.from(await designBlob.arrayBuffer());
    devBuf = Buffer.from(await devBlob.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "读取图片失败。" }, { status: 400 });
  }

  let aligned: Awaited<ReturnType<typeof alignImagePair>>;
  try {
    aligned = await alignImagePair(designBuf, devBuf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "图片处理失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const metaBase = {
    provider,
    alignedSize: { width: aligned.width, height: aligned.height },
  };

  if (Buffer.compare(aligned.designPng, aligned.devPng) === 0) {
    return NextResponse.json({
      has_diff: false,
      summary: PERFECT_SUMMARY,
      diffs: [],
      meta: { ...metaBase, identical: true },
    });
  }

  const designDataUrl = `data:image/png;base64,${aligned.designPng.toString("base64")}`;
  const devDataUrl = `data:image/png;base64,${aligned.devPng.toString("base64")}`;

  let rawText: string;
  try {
    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY!.trim();
      const model =
        process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
      rawText = await compareWithOpenAI(key, model, {
        designDataUrl,
        devDataUrl,
      });
    } else {
      const key = process.env.ZHIPU_API_KEY!.trim();
      const model = process.env.ZHIPU_MODEL?.trim() || "glm-4.5v";
      rawText = await compareWithZhipu(key, model, {
        designDataUrl,
        devDataUrl,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "模型调用失败";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  try {
    const parsed = parseDesignQAJson(rawText);
    const summary = buildDesignQASummary(
      parsed.diffs,
      parsed.modelMainIssues,
    );
    return NextResponse.json({
      has_diff: parsed.has_diff,
      summary,
      diffs: parsed.diffs,
      meta: metaBase,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "解析失败";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
