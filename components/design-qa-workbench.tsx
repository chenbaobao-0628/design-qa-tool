"use client";

import { useCallback, useMemo, useState } from "react";
import { ImageUploadPanel } from "@/components/design-qa/ImageUploadPanel";
import { PixelDiffResultsPanel } from "@/components/design-qa/PixelDiffResultsPanel";
import type { DesignQARegion } from "@/lib/design-qa-types";
import type {
  PixelDiffBox,
  PixelDiffImageSize,
  PixelDiffOptions,
  PixelDiffResult,
  PixelDiffStatus,
} from "@/lib/pixel-diff-types";

const MAX_EDGE = 1280;
const MAX_RATIO_DELTA = 0.1;
const RATIO_MISMATCH_MESSAGE =
  "两张图片比例差异较大，请上传同一页面、同一设备尺寸的设计稿和开发截图。";
const DEFAULT_DIFF_OPTIONS: PixelDiffOptions = {
  pixelThreshold: 8,
  minRegionArea: 20,
  maxRegions: 20,
};

type CompareStatus = PixelDiffStatus | "idle";

function boxToRegion(box: PixelDiffBox, result: PixelDiffResult): DesignQARegion {
  return {
    x: box.x / result.width,
    y: box.y / result.height,
    width: box.width / result.width,
    height: box.height / result.height,
  };
}

function getImageSize(file: File): Promise<PixelDiffImageSize> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片尺寸。"));
    };
    image.src = url;
  });
}

function aspectRatioDelta(
  designSize: PixelDiffImageSize,
  devSize: PixelDiffImageSize,
) {
  const designRatio = designSize.width / designSize.height;
  const devRatio = devSize.width / devSize.height;

  return Math.abs(designRatio - devRatio) / Math.max(designRatio, devRatio);
}

function getAlignedSize(
  designSize: PixelDiffImageSize | null,
  devSize: PixelDiffImageSize | null,
): PixelDiffImageSize | null {
  if (!designSize || !devSize) return null;

  const naturalWidth = Math.max(designSize.width, devSize.width);
  const naturalHeight = Math.max(designSize.height, devSize.height);
  const scale = Math.min(1, MAX_EDGE / Math.max(naturalWidth, naturalHeight));

  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  };
}

export function DesignQAWorkbench() {
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [devFile, setDevFile] = useState<File | null>(null);
  const [designSize, setDesignSize] = useState<PixelDiffImageSize | null>(null);
  const [devSize, setDevSize] = useState<PixelDiffImageSize | null>(null);
  const [diffOptions, setDiffOptions] =
    useState<PixelDiffOptions>(DEFAULT_DIFF_OPTIONS);
  const [result, setResult] = useState<PixelDiffResult | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = Boolean(designFile && devFile);
  const alignedSize = useMemo(
    () => result?.alignedSize ?? getAlignedSize(designSize, devSize),
    [designSize, devSize, result?.alignedSize],
  );
  const ratioMismatch = useMemo(() => {
    if (!designSize || !devSize) return false;
    return aspectRatioDelta(designSize, devSize) > MAX_RATIO_DELTA;
  }, [designSize, devSize]);
  const compareStatus: CompareStatus = result?.status
    ? result.status
    : ratioMismatch
      ? "ratio-mismatch"
      : canRun
        ? "comparable"
        : "idle";
  const statusMessage =
    compareStatus === "ratio-mismatch"
      ? RATIO_MISMATCH_MESSAGE
      : result?.message;

  const selectedBox = useMemo(() => {
    if (!result || selectedBoxId == null) return undefined;
    return result.boxes.find((box) => box.id === selectedBoxId);
  }, [result, selectedBoxId]);

  const selectedRegion = useMemo(() => {
    if (!result || !selectedBox) return undefined;
    return boxToRegion(selectedBox, result);
  }, [result, selectedBox]);

  const resetResult = useCallback(() => {
    setResult(null);
    setSelectedBoxId(null);
    setError(null);
  }, []);

  const handleDesignFileChange = useCallback(
    (file: File | null) => {
      setDesignFile(file);
      setDesignSize(null);
      resetResult();
      if (!file) return;

      void getImageSize(file)
        .then(setDesignSize)
        .catch((reason: Error) => setError(reason.message));
    },
    [resetResult],
  );

  const handleDevFileChange = useCallback(
    (file: File | null) => {
      setDevFile(file);
      setDevSize(null);
      resetResult();
      if (!file) return;

      void getImageSize(file)
        .then(setDevSize)
        .catch((reason: Error) => setError(reason.message));
    },
    [resetResult],
  );

  const handleDiffOptionsChange = useCallback((options: PixelDiffOptions) => {
    setDiffOptions(options);
    setResult(null);
    setSelectedBoxId(null);
  }, []);

  const runPixelDiff = useCallback(async () => {
    if (loading) return;
    if (!designFile || !devFile) {
      setError("请先上传设计稿图片和开发截图。");
      return;
    }
    if (
      designSize &&
      devSize &&
      aspectRatioDelta(designSize, devSize) > MAX_RATIO_DELTA
    ) {
      setResult(null);
      setSelectedBoxId(null);
      setError(RATIO_MISMATCH_MESSAGE);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedBoxId(null);

    try {
      const formData = new FormData();
      formData.append("design", designFile);
      formData.append("dev", devFile);
      formData.append("pixelThreshold", String(diffOptions.pixelThreshold));
      formData.append("minRegionArea", String(diffOptions.minRegionArea));
      formData.append("maxRegions", String(diffOptions.maxRegions));

      const response = await fetch("/api/pixel-diff", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as PixelDiffResult & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? `像素检测失败（${response.status}）`);
        return;
      }

      setResult(payload);
    } catch {
      setError("无法完成像素检测，请确认开发服务正在运行。");
    } finally {
      setLoading(false);
    }
  }, [designFile, designSize, devFile, devSize, diffOptions, loading]);

  const handleSelectBox = useCallback((id: number) => {
    setSelectedBoxId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="min-h-screen bg-[#080a0f] text-zinc-100">
      <header className="border-b border-zinc-800 bg-[#0b0e14]/95 px-6 py-4">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-400">
              Design QA System
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
              图片像素差异检测
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
              Real pixel diff
            </span>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
              No AI explanation
            </span>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
              PNG / JPG
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_420px]">
        <ImageUploadPanel
          eyebrow="Design source"
          title="设计稿"
          description="上传设计稿导出的 PNG/JPG，作为像素差异检测基准。"
          file={designFile}
          originalSize={result?.originalDesignSize ?? designSize}
          alignedSize={alignedSize}
          alignedPreviewUrl={result?.alignedDesignDataUrl}
          onFileChange={handleDesignFileChange}
          highlightRegion={selectedRegion}
        />

        <ImageUploadPanel
          eyebrow="Implementation"
          title="开发截图"
          description="上传当前页面真实渲染截图，系统会统一尺寸并居中对齐。"
          file={devFile}
          originalSize={result?.originalDevSize ?? devSize}
          alignedSize={alignedSize}
          alignedPreviewUrl={result?.alignedDevDataUrl}
          onFileChange={handleDevFileChange}
          highlightRegion={selectedRegion}
        />

        <PixelDiffResultsPanel
          result={result}
          loading={loading}
          error={error}
          canRun={canRun}
          compareStatus={compareStatus}
          statusMessage={statusMessage}
          diffOptions={diffOptions}
          selectedBoxId={selectedBoxId}
          onRun={runPixelDiff}
          onSelectBox={handleSelectBox}
          onDiffOptionsChange={handleDiffOptionsChange}
        />
      </main>
    </div>
  );
}
