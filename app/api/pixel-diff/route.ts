import { NextResponse } from "next/server";
import { detectPixelDiff } from "@/lib/pixel-diff";
import type { PixelDiffOptions } from "@/lib/pixel-diff-types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isImageBlob(value: FormDataEntryValue | null): value is File {
  return value instanceof Blob && value.type.startsWith("image/");
}

function readNumericOption(
  formData: FormData,
  key: keyof PixelDiffOptions,
): number | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析上传表单。" }, { status: 400 });
  }

  const design = formData.get("design");
  const dev = formData.get("dev");

  if (!isImageBlob(design) || !isImageBlob(dev)) {
    return NextResponse.json(
      { error: "请上传 design 和 dev 两个图片文件。" },
      { status: 400 },
    );
  }

  if (design.size > MAX_IMAGE_BYTES || dev.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "单张图片需小于 8MB。" },
      { status: 400 },
    );
  }

  try {
    const result = await detectPixelDiff(
      Buffer.from(await design.arrayBuffer()),
      Buffer.from(await dev.arrayBuffer()),
      {
        pixelThreshold: readNumericOption(formData, "pixelThreshold"),
        minRegionArea: readNumericOption(formData, "minRegionArea"),
        maxRegions: readNumericOption(formData, "maxRegions"),
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "像素差异检测失败。" },
      { status: 500 },
    );
  }
}
