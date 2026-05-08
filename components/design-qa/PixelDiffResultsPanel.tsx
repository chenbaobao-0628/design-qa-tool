"use client";

import type {
  PixelDiffBox,
  PixelDiffOptions,
  PixelDiffResult,
  PixelDiffStatus,
} from "@/lib/pixel-diff-types";

type CompareStatus = PixelDiffStatus | "idle";

type PixelDiffResultsPanelProps = {
  result: PixelDiffResult | null;
  loading: boolean;
  error: string | null;
  canRun: boolean;
  compareStatus: CompareStatus;
  statusMessage?: string | null;
  diffOptions: PixelDiffOptions;
  selectedBoxId: number | null;
  onRun: () => void;
  onSelectBox: (id: number) => void;
  onDiffOptionsChange: (options: PixelDiffOptions) => void;
};

const statusCopy: Record<CompareStatus, { label: string; className: string }> = {
  idle: {
    label: "等待上传",
    className: "border-zinc-700 bg-zinc-800 text-zinc-300",
  },
  comparable: {
    label: "可比对",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  "ratio-mismatch": {
    label: "比例不一致",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  "too-different": {
    label: "整体差异过大",
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
};

function formatRect(box: PixelDiffBox) {
  return `x:${box.x} y:${box.y} w:${box.width} h:${box.height}`;
}

function NumericOption({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500"
      />
    </label>
  );
}

export function PixelDiffResultsPanel({
  result,
  loading,
  error,
  canRun,
  compareStatus,
  statusMessage,
  diffOptions,
  selectedBoxId,
  onRun,
  onSelectBox,
  onDiffOptionsChange,
}: PixelDiffResultsPanelProps) {
  const currentStatus = result?.status ?? compareStatus;
  const status = statusCopy[currentStatus];
  const blockingMessage =
    currentStatus === "ratio-mismatch" || currentStatus === "too-different"
      ? statusMessage ?? result?.message
      : null;

  return (
    <aside className="flex min-h-[620px] flex-col rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/20">
      <header className="border-b border-zinc-800 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Pixel Diff
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-100">真实差异区域</h2>
          <span
            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </header>

      <div className="border-b border-zinc-800 p-4">
        <button
          type="button"
          disabled={!canRun || loading || currentStatus === "ratio-mismatch"}
          onClick={onRun}
          className="w-full rounded-md bg-cyan-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {loading ? "检测中..." : "开始走查"}
        </button>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <NumericOption
            label="pixelThreshold"
            min={1}
            max={255}
            value={diffOptions.pixelThreshold}
            onChange={(pixelThreshold) =>
              onDiffOptionsChange({ ...diffOptions, pixelThreshold })
            }
          />
          <NumericOption
            label="minRegionArea"
            min={1}
            max={10000}
            value={diffOptions.minRegionArea}
            onChange={(minRegionArea) =>
              onDiffOptionsChange({ ...diffOptions, minRegionArea })
            }
          />
          <NumericOption
            label="maxRegions"
            min={1}
            max={200}
            value={diffOptions.maxRegions}
            onChange={(maxRegions) =>
              onDiffOptionsChange({ ...diffOptions, maxRegions })
            }
          />
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">
            {error}
          </p>
        ) : null}
        {blockingMessage ? (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
            {blockingMessage}
          </p>
        ) : null}
      </div>

      {result ? (
        <div className="border-b border-zinc-800 p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md bg-zinc-900 p-3">
              <p className="text-[10px] text-zinc-500">差异像素</p>
              <p className="mt-1 text-lg font-bold text-zinc-100">
                {result.diffPixelCount.toLocaleString("zh-CN")}
              </p>
            </div>
            <div className="rounded-md bg-zinc-900 p-3">
              <p className="text-[10px] text-zinc-500">占比</p>
              <p className="mt-1 text-lg font-bold text-cyan-200">
                {result.diffPercent}%
              </p>
            </div>
            <div className="rounded-md bg-zinc-900 p-3">
              <p className="text-[10px] text-zinc-500">展示区域</p>
              <p className="mt-1 text-lg font-bold text-zinc-100">
                {result.boxes.length}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            对齐画布：{result.alignedSize.width} x {result.alignedSize.height}
            {" · "}参数：阈值 {result.options.pixelThreshold} / 最小面积{" "}
            {result.options.minRegionArea}px / 最多 {result.options.maxRegions} 区域
          </p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {blockingMessage ? (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-5 text-center">
            <p className="text-sm leading-relaxed text-zinc-400">
              当前输入不可输出差异列表。请先上传同一页面、同一设备尺寸的设计稿和开发截图。
            </p>
          </div>
        ) : !result ? (
          <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-5 text-center">
            <p className="text-sm leading-relaxed text-zinc-500">
              上传两张图片后执行像素级检测。结果只来自真实像素差异，不包含 AI 解释。
            </p>
          </div>
        ) : !result.hasDiff || result.boxes.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 text-center">
            <div>
              <p className="text-sm font-semibold text-emerald-100">
                未发现差异
              </p>
              <p className="mt-2 text-xs text-emerald-200/70">
                当前像素检测阈值下未捕获该微差异。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {result.boxes.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => onSelectBox(box.id)}
                className={[
                  "w-full rounded-lg border p-4 text-left transition-colors",
                  selectedBoxId === box.id
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    差异区域 #{box.id}
                  </h3>
                  <span className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-300">
                    {box.areaPercent}%
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-zinc-950 p-2">
                    <dt className="text-zinc-600">面积</dt>
                    <dd className="mt-1 font-medium text-zinc-300">
                      {box.area.toLocaleString("zh-CN")} px
                    </dd>
                  </div>
                  <div className="rounded bg-zinc-950 p-2">
                    <dt className="text-zinc-600">位置 / 尺寸</dt>
                    <dd className="mt-1 font-medium text-zinc-300">
                      {formatRect(box)}
                    </dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
