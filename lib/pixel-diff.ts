import sharp from "sharp";
import type {
  PixelDiffBox,
  PixelDiffImageSize,
  PixelDiffOptions,
  PixelDiffResult,
} from "./pixel-diff-types";

const MAX_EDGE = 1280;
const DEFAULT_OPTIONS: PixelDiffOptions = {
  pixelThreshold: 8,
  minRegionArea: 20,
  maxRegions: 20,
};
const MAX_RATIO_DELTA = 0.1;
const MAX_DIFF_PERCENT = 30;
const RATIO_MISMATCH_MESSAGE =
  "两张图片比例差异较大，请上传同一页面、同一设备尺寸的设计稿和开发截图。";
const TOO_DIFFERENT_MESSAGE =
  "两张图整体差异过大，可能不是同一页面，建议重新上传对应页面。";

type PreparedImage = {
  png: Buffer;
  raw: Buffer;
  width: number;
  height: number;
};

type PairMetadata = {
  designSize: PixelDiffImageSize;
  devSize: PixelDiffImageSize;
  canvasSize: PixelDiffImageSize;
};

function normalizeOptions(options?: Partial<PixelDiffOptions>): PixelDiffOptions {
  return {
    pixelThreshold: Math.max(
      1,
      Math.min(255, Math.round(options?.pixelThreshold ?? DEFAULT_OPTIONS.pixelThreshold)),
    ),
    minRegionArea: Math.max(
      1,
      Math.min(10000, Math.round(options?.minRegionArea ?? DEFAULT_OPTIONS.minRegionArea)),
    ),
    maxRegions: Math.max(
      1,
      Math.min(200, Math.round(options?.maxRegions ?? DEFAULT_OPTIONS.maxRegions)),
    ),
  };
}

function maxChannelDelta(a: Buffer, b: Buffer, offset: number) {
  return Math.max(
    Math.abs(a[offset] - b[offset]),
    Math.abs(a[offset + 1] - b[offset + 1]),
    Math.abs(a[offset + 2] - b[offset + 2]),
    Math.abs(a[offset + 3] - b[offset + 3]),
  );
}

async function readImageSize(input: Buffer): Promise<PixelDiffImageSize> {
  const metadata = await sharp(input).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new Error("无法读取图片尺寸。");
  }

  return { width, height };
}

function aspectRatioDelta(a: PixelDiffImageSize, b: PixelDiffImageSize) {
  const aRatio = a.width / a.height;
  const bRatio = b.width / b.height;

  return Math.abs(aRatio - bRatio) / Math.max(aRatio, bRatio);
}

function getCanvasSize(
  designSize: PixelDiffImageSize,
  devSize: PixelDiffImageSize,
): PixelDiffImageSize {
  const naturalWidth = Math.max(designSize.width, devSize.width);
  const naturalHeight = Math.max(designSize.height, devSize.height);
  const scale = Math.min(1, MAX_EDGE / Math.max(naturalWidth, naturalHeight));

  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  };
}

async function buildPairMetadata(
  designBuffer: Buffer,
  devBuffer: Buffer,
): Promise<PairMetadata> {
  const [designSize, devSize] = await Promise.all([
    readImageSize(designBuffer),
    readImageSize(devBuffer),
  ]);

  return {
    designSize,
    devSize,
    canvasSize: getCanvasSize(designSize, devSize),
  };
}

async function containOnCanvas(
  input: Buffer,
  originalSize: PixelDiffImageSize,
  canvasSize: PixelDiffImageSize,
) {
  const scale = Math.min(
    canvasSize.width / originalSize.width,
    canvasSize.height / originalSize.height,
  );
  const resizedWidth = Math.max(1, Math.round(originalSize.width * scale));
  const resizedHeight = Math.max(1, Math.round(originalSize.height * scale));
  const left = Math.round((canvasSize.width - resizedWidth) / 2);
  const top = Math.round((canvasSize.height - resizedHeight) / 2);
  const resized = await sharp(input)
    .resize(resizedWidth, resizedHeight, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvasSize.width,
      height: canvasSize.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function preparePair(
  designBuffer: Buffer,
  devBuffer: Buffer,
  metadata: PairMetadata,
) {
  const { canvasSize, designSize, devSize } = metadata;
  const [designPng, devPng] = await Promise.all([
    containOnCanvas(designBuffer, designSize, canvasSize),
    containOnCanvas(devBuffer, devSize, canvasSize),
  ]);

  const [designRaw, devRaw] = await Promise.all([
    sharp(designPng).ensureAlpha().raw().toBuffer(),
    sharp(devPng).ensureAlpha().raw().toBuffer(),
  ]);

  return {
    design: {
      png: designPng,
      raw: designRaw,
      width: canvasSize.width,
      height: canvasSize.height,
    },
    dev: {
      png: devPng,
      raw: devRaw,
      width: canvasSize.width,
      height: canvasSize.height,
    },
  } satisfies { design: PreparedImage; dev: PreparedImage };
}

function findConnectedBoxes(
  mask: Uint8Array,
  width: number,
  height: number,
  options: PixelDiffOptions,
) {
  const visited = new Uint8Array(mask.length);
  const boxes: Omit<PixelDiffBox, "id" | "areaPercent">[] = [];
  const queue = new Int32Array(mask.length);

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || visited[start] === 1) continue;

    let head = 0;
    let tail = 0;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);

      area++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];

      for (const next of neighbors) {
        if (next < 0 || mask[next] === 0 || visited[next] === 1) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }

    if (area >= options.minRegionArea) {
      boxes.push({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        area,
      });
    }
  }

  return boxes
    .sort((a, b) => b.area - a.area)
    .slice(0, options.maxRegions)
    .map((box, index) => ({
      ...box,
      id: index + 1,
      areaPercent: Math.round((box.area / (width * height)) * 10000) / 100,
    }));
}

export async function detectPixelDiff(
  designBuffer: Buffer,
  devBuffer: Buffer,
  rawOptions?: Partial<PixelDiffOptions>,
): Promise<PixelDiffResult> {
  const options = normalizeOptions(rawOptions);
  const metadata = await buildPairMetadata(designBuffer, devBuffer);
  const { designSize, devSize, canvasSize } = metadata;

  if (aspectRatioDelta(designSize, devSize) > MAX_RATIO_DELTA) {
    return {
      status: "ratio-mismatch",
      message: RATIO_MISMATCH_MESSAGE,
      hasDiff: false,
      width: canvasSize.width,
      height: canvasSize.height,
      originalDesignSize: designSize,
      originalDevSize: devSize,
      alignedSize: canvasSize,
      diffPixelCount: 0,
      diffPercent: 0,
      boxes: [],
      options,
      alignedDesignDataUrl: "",
      alignedDevDataUrl: "",
    };
  }

  const { design, dev } = await preparePair(designBuffer, devBuffer, metadata);
  const { width, height } = design;
  const mask = new Uint8Array(width * height);
  let diffPixelCount = 0;

  for (let pixel = 0; pixel < mask.length; pixel++) {
    const offset = pixel * 4;
    if (maxChannelDelta(design.raw, dev.raw, offset) > options.pixelThreshold) {
      mask[pixel] = 1;
      diffPixelCount++;
    }
  }

  const diffPercent =
    Math.round((diffPixelCount / (width * height)) * 10000) / 100;
  const alignedDesignDataUrl = `data:image/png;base64,${design.png.toString("base64")}`;
  const alignedDevDataUrl = `data:image/png;base64,${dev.png.toString("base64")}`;

  if (diffPercent > MAX_DIFF_PERCENT) {
    return {
      status: "too-different",
      message: TOO_DIFFERENT_MESSAGE,
      hasDiff: true,
      width,
      height,
      originalDesignSize: designSize,
      originalDevSize: devSize,
      alignedSize: canvasSize,
      diffPixelCount,
      diffPercent,
      boxes: [],
      options,
      alignedDesignDataUrl,
      alignedDevDataUrl,
    };
  }

  const boxes = findConnectedBoxes(mask, width, height, options);

  return {
    status: "comparable",
    hasDiff: diffPixelCount > 0,
    width,
    height,
    originalDesignSize: designSize,
    originalDevSize: devSize,
    alignedSize: canvasSize,
    diffPixelCount,
    diffPercent,
    boxes,
    options,
    alignedDesignDataUrl,
    alignedDevDataUrl,
  };
}
