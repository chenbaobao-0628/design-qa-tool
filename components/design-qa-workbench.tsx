"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DesignQAItem,
  DesignQAPriority,
  DesignQARegion,
  DesignQAResult,
  DesignQASummary,
} from "@/lib/design-qa-types";
import { buildDesignQAMarkdown } from "@/lib/design-qa-export";

const HISTORY_KEY = "design-qa-tool:runs:v1";
const MAX_HISTORY = 8;

type CompareMeta = {
  provider?: string;
  alignedSize?: { width: number; height: number };
  identical?: boolean;
};

type HistoryRun = {
  id: string;
  generatedAt: string;
  designFileName: string;
  devFileName: string;
  result: DesignQAResult;
  meta: CompareMeta | null;
};

function useObjectUrl(file: File | null) {
  const url = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}

type UploadColumnProps = {
  label: string;
  hint: string;
  file: File | null;
  onFile: (file: File | null) => void;
  footer?: ReactNode;
  panelClassName?: string;
  highlightRegion?: DesignQARegion;
};

function UploadColumn({
  label,
  hint,
  file,
  onFile,
  footer,
  panelClassName = "",
  highlightRegion,
}: UploadColumnProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const previewUrl = useObjectUrl(file);

  const pickFiles = useCallback(
    (list: FileList | null) => {
      const next = list?.[0];
      if (next && next.type.startsWith("image/")) onFile(next);
    },
    [onFile],
  );

  return (
    <section
      className={`flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-900/40 ${panelClassName}`}
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {label}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFiles(e.dataTransfer.files);
          }}
          className={[
            "flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950",
            dragOver
              ? "border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800/50"
              : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/30 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/60",
          ].join(" ")}
        >
          {previewUrl ? (
            <div className="relative mx-auto min-h-[140px] w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`${label} 预览`}
                className="mx-auto max-h-[min(320px,42vh)] w-auto max-w-full rounded-lg object-contain shadow-sm"
              />
              {highlightRegion ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute rounded-md border-2 border-blue-500 bg-blue-500/15 shadow-[0_0_0_9999px_rgba(24,24,27,0.08)]"
                  style={{
                    left: `${highlightRegion.x * 100}%`,
                    top: `${highlightRegion.y * 100}%`,
                    width: `${highlightRegion.width * 100}%`,
                    height: `${highlightRegion.height * 100}%`,
                  }}
                />
              ) : null}
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                点击或拖入图片
              </span>
              <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                PNG / JPG / WebP，单张 &lt; 5MB
              </span>
            </>
          )}
        </div>

        {file ? (
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate" title={file.name}>
              {file.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
              className="shrink-0 rounded-lg px-2 py-1 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              清除
            </button>
          </div>
        ) : null}

        {footer}
      </div>
    </section>
  );
}

const priorityVisual: Record<
  DesignQAPriority,
  { label: string; bar: string; badge: string }
> = {
  必须修复: {
    label: "必须修复",
    bar: "border-l-rose-500 bg-rose-50/90 dark:border-l-rose-400 dark:bg-rose-950/35",
    badge:
      "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-100",
  },
  建议修复: {
    label: "建议修复",
    bar: "border-l-amber-500 bg-amber-50/90 dark:border-l-amber-400 dark:bg-amber-950/30",
    badge:
      "bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100",
  },
  可忽略: {
    label: "可忽略",
    bar: "border-l-sky-500 bg-sky-50/80 dark:border-l-sky-400 dark:bg-sky-950/30",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-100",
  },
};

function priorityStyle(p: string) {
  if (p === "必须修复" || p === "建议修复" || p === "可忽略") {
    return priorityVisual[p];
  }
  return {
    label: p || "未分级",
    bar: "border-l-zinc-400 bg-zinc-50 dark:border-l-zinc-500 dark:bg-zinc-900/40",
    badge: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  };
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readHistory(): HistoryRun[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is HistoryRun => {
      return (
        item != null &&
        typeof item === "object" &&
        typeof (item as HistoryRun).id === "string" &&
        typeof (item as HistoryRun).generatedAt === "string" &&
        (item as HistoryRun).result != null
      );
    });
  } catch {
    return [];
  }
}

function writeHistory(runs: HistoryRun[]) {
  window.localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(runs.slice(0, MAX_HISTORY)),
  );
}

const diffTypeBadge =
  "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100";

function BulletList({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-zinc-400">{empty}</p>;
  }
  return (
    <ul className="list-none space-y-1.5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="shrink-0 text-zinc-400">·</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function DesignQASummaryBar({
  summary,
  hasDiff,
  metaLine,
}: {
  summary: DesignQASummary;
  hasDiff: boolean;
  metaLine: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Design QA · Summary
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {summary.consistencyPercent}%
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              页面一致度
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${priorityVisual["必须修复"].badge}`}
          >
            必须修复
            <span className="tabular-nums opacity-90">{summary.mustFix}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${priorityVisual["建议修复"].badge}`}
          >
            建议修复
            <span className="tabular-nums opacity-90">{summary.suggestFix}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${priorityVisual["可忽略"].badge}`}
          >
            可忽略
            <span className="tabular-nums opacity-90">{summary.canIgnore}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          主要问题摘要
        </p>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {summary.mainIssues.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-zinc-500">
          {hasDiff
            ? "下方为逐条可执行差异，可直接对照改代码。"
            : "当前无待修复差异项。"}
        </span>
        {metaLine}
      </div>
    </div>
  );
}

function DesignQADiffCard({
  item,
  index,
  selected,
  onSelect,
}: {
  item: DesignQAItem;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}) {
  const pv = priorityStyle(item.priority);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(index)}
        className={`w-full rounded-xl border border-zinc-200/90 text-left shadow-sm transition-all dark:border-zinc-800 ${pv.bar} border-l-4 pl-4 pr-3 py-3 hover:ring-2 hover:ring-zinc-300/80 dark:hover:ring-zinc-600 ${
          selected
            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950"
            : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {item.moduleName ? (
            <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 ring-1 ring-zinc-200/80 dark:bg-zinc-950/50 dark:text-zinc-100 dark:ring-zinc-700">
              {item.moduleName}
            </span>
          ) : null}
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${diffTypeBadge}`}
          >
            {item.diffType}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${pv.badge}`}
          >
            {pv.label}
          </span>
          {typeof item.confidence === "number" ? (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              置信度 {Math.round(item.confidence * 100)}%
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              设计稿
            </p>
            <div className="mt-1">
              <BulletList items={item.designSpec} empty="（无）" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-200">
              开发实现
            </p>
            <div className="mt-1">
              <BulletList items={item.devImplementation} empty="（无）" />
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-700/80">
          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            差异点
          </p>
          <BulletList items={item.diffPoints} empty="（无）" />
        </div>

        <div className="mt-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-700/80">
          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
            修改建议（可执行）
          </p>
          <BulletList items={item.fixSuggestions} empty="（无）" />
        </div>

        {item.acceptanceChecks && item.acceptanceChecks.length > 0 ? (
          <div className="mt-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-700/80">
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
              验收点
            </p>
            <BulletList items={item.acceptanceChecks} empty="（无）" />
          </div>
        ) : null}

        <p className="mt-2 text-[10px] text-zinc-400">
          点击此卡片可高亮左侧设计稿区域（后续可关联具体坐标）
        </p>
      </button>
    </li>
  );
}

function DesignQAResultsPanel({
  result,
  meta,
  selectedDiffIndex,
  onSelectDiff,
}: {
  result: DesignQAResult | null;
  meta: CompareMeta | null;
  selectedDiffIndex: number | null;
  onSelectDiff: (index: number) => void;
}) {
  const metaLine =
    meta?.provider != null ? (
      <span className="text-[10px] uppercase tracking-wider text-zinc-400">
        {meta.identical
          ? "本地像素一致"
          : meta.provider === "openai"
            ? "OpenAI"
            : "智谱 GLM"}
        {meta.alignedSize
          ? ` · ${meta.alignedSize.width}×${meta.alignedSize.height}`
          : ""}
      </span>
    ) : null;

  if (!result) {
    return (
      <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950/30">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          走查结果将显示于此
        </p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          上传设计稿与开发截图后点击「开始走查」。顶部将展示一致度与优先级统计，下方为逐条开发可执行差异。
        </p>
      </div>
    );
  }

  if (!result.has_diff || result.diffs.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-6 py-10 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <p className="text-3xl" aria-hidden>
          ✅
        </p>
        <p className="mt-2 text-base font-semibold text-emerald-900 dark:text-emerald-100">
          完全一致
        </p>
        <p className="mt-1 max-w-xs text-xs text-emerald-800/90 dark:text-emerald-200/80">
          {meta?.identical
            ? "对齐后两图逐像素相同，未调用模型。"
            : "未发现需跟进的差异项。"}
        </p>
        {metaLine ? <div className="mt-4">{metaLine}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
          差异列表
          <span className="ml-2 font-normal text-zinc-500">
            {result.diffs.length} 条
          </span>
        </p>
        {metaLine ? <div>{metaLine}</div> : null}
      </div>
      <ul className="max-h-[min(64vh,620px)] flex-1 space-y-3 overflow-y-auto pr-1">
        {result.diffs.map((row, idx) => (
          <DesignQADiffCard
            key={`${idx}-${row.moduleName}-${row.diffType}`}
            item={row}
            index={idx}
            selected={selectedDiffIndex === idx}
            onSelect={onSelectDiff}
          />
        ))}
      </ul>
    </div>
  );
}

export function DesignQAWorkbench() {
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [devFile, setDevFile] = useState<File | null>(null);
  const [qaResult, setQaResult] = useState<DesignQAResult | null>(null);
  const [meta, setMeta] = useState<CompareMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(
    null,
  );
  const [history, setHistory] = useState<HistoryRun[]>(() => {
    if (typeof window === "undefined") return [];
    return readHistory();
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  const designPanelRef = useRef<HTMLDivElement>(null);

  const resetOutputs = useCallback(() => {
    setQaResult(null);
    setMeta(null);
    setError(null);
    setSelectedDiffIndex(null);
  }, []);

  const handleDesignFile = useCallback(
    (file: File | null) => {
      setDesignFile(file);
      resetOutputs();
    },
    [resetOutputs],
  );

  const handleDevFile = useCallback(
    (file: File | null) => {
      setDevFile(file);
      resetOutputs();
    },
    [resetOutputs],
  );

  const canCompare = Boolean(designFile && devFile) && !loading;

  const handleSelectDiff = useCallback((index: number) => {
    setSelectedDiffIndex((prev) => (prev === index ? null : index));
  }, []);

  useEffect(() => {
    if (selectedDiffIndex === null) return;
    designPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [selectedDiffIndex]);

  const runCompare = useCallback(async () => {
    if (!designFile || !devFile || loading) return;
    setLoading(true);
    setError(null);
    setQaResult(null);
    setMeta(null);
    setSelectedDiffIndex(null);
    try {
      const fd = new FormData();
      fd.append("design", designFile);
      fd.append("dev", devFile);
      const res = await fetch("/api/compare", { method: "POST", body: fd });
      const data = (await res.json()) as {
        has_diff?: boolean;
        summary?: DesignQASummary;
        diffs?: DesignQAItem[];
        meta?: {
          provider: string;
          alignedSize: { width: number; height: number };
          identical?: boolean;
        };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || `请求失败（${res.status}）`);
        return;
      }
      if (
        typeof data.has_diff === "boolean" &&
        data.summary &&
        Array.isArray(data.diffs)
      ) {
        const nextResult = {
          has_diff: data.has_diff,
          summary: data.summary,
          diffs: data.diffs,
        };
        const nextMeta = data.meta ?? null;
        setQaResult(nextResult);
        setMeta(nextMeta);
        const run: HistoryRun = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          generatedAt: new Date().toISOString(),
          designFileName: designFile.name,
          devFileName: devFile.name,
          result: nextResult,
          meta: nextMeta,
        };
        setHistory((prev) => {
          const next = [run, ...prev].slice(0, MAX_HISTORY);
          writeHistory(next);
          return next;
        });
      } else {
        setError("响应格式异常。");
      }
    } catch {
      setError("网络异常，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [designFile, devFile, loading]);

  const selectedItem =
    selectedDiffIndex !== null ? qaResult?.diffs[selectedDiffIndex] : undefined;

  const exportMeta = useMemo(
    () => ({
      designFileName: designFile?.name,
      devFileName: devFile?.name,
      provider: meta?.identical
        ? "本地像素一致"
        : meta?.provider === "openai"
          ? "OpenAI"
          : meta?.provider === "zhipu"
            ? "智谱 GLM"
            : undefined,
      generatedAt: new Date().toLocaleString("zh-CN"),
    }),
    [designFile?.name, devFile?.name, meta?.identical, meta?.provider],
  );

  const exportMarkdown = useCallback(() => {
    if (!qaResult) return;
    downloadTextFile(
      "design-qa-report.md",
      buildDesignQAMarkdown(qaResult, exportMeta),
      "text/markdown;charset=utf-8",
    );
  }, [exportMeta, qaResult]);

  const exportJson = useCallback(() => {
    if (!qaResult) return;
    downloadTextFile(
      "design-qa-report.json",
      JSON.stringify({ result: qaResult, meta: exportMeta }, null, 2),
      "application/json;charset=utf-8",
    );
  }, [exportMeta, qaResult]);

  const restoreHistory = useCallback((run: HistoryRun) => {
    setQaResult(run.result);
    setMeta(run.meta);
    setError(null);
    setSelectedDiffIndex(null);
    setHistoryOpen(false);
  }, []);

  const clearHistory = useCallback(() => {
    writeHistory([]);
    setHistory([]);
  }, []);

  const compareRow = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!canCompare}
        onClick={runCompare}
        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" />
            走查中…
          </span>
        ) : (
          "开始走查"
        )}
      </button>
      {error ? (
        <p className="text-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );

  const summaryMetaLine =
    meta?.provider != null ? (
      <span className="text-[10px] uppercase tracking-wider text-zinc-400">
        {meta.identical
          ? "本地像素一致"
          : meta.provider === "openai"
            ? "OpenAI"
            : "智谱 GLM"}
        {meta.alignedSize
          ? ` · ${meta.alignedSize.width}×${meta.alignedSize.height}`
          : ""}
      </span>
    ) : null;

  const designHighlight =
    selectedDiffIndex !== null
      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950 shadow-md"
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100/90 dark:bg-zinc-950">
      <header className="border-b border-zinc-200/80 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Design QA
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              设计走查 · 设计稿 vs 开发截图
            </h1>
          </div>
          <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            输出面向开发落地：一致度、优先级统计、逐条差异与可执行修改建议；不做主观设计评审。
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              工作台
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              支持双图走查、报告导出、本地历史回看；后续可继续接入 DOM/Figma 节点。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              历史记录 {history.length > 0 ? `(${history.length})` : ""}
            </button>
            <button
              type="button"
              disabled={!qaResult}
              onClick={exportMarkdown}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              导出 Markdown
            </button>
            <button
              type="button"
              disabled={!qaResult}
              onClick={exportJson}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              导出 JSON
            </button>
          </div>
        </div>

        {historyOpen ? (
          <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  最近走查
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  仅保存在当前浏览器，用于快速回看报告内容。
                </p>
              </div>
              <button
                type="button"
                onClick={clearHistory}
                disabled={history.length === 0}
                className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                清空
              </button>
            </div>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">暂无历史记录。</p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {history.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => restoreHistory(run)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                      {run.designFileName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      vs {run.devFileName}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {run.result.summary.consistencyPercent}%
                      </span>
                      <span className="text-zinc-500">
                        {new Date(run.generatedAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {qaResult ? (
          <DesignQASummaryBar
            summary={qaResult.summary}
            hasDiff={qaResult.has_diff && qaResult.diffs.length > 0}
            metaLine={summaryMetaLine}
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <div ref={designPanelRef} className="lg:col-start-1 lg:row-start-1">
            <UploadColumn
              label="设计稿"
              hint="Design：定稿截图（基准）。点击右侧差异卡片可高亮本区域。"
              file={designFile}
              onFile={handleDesignFile}
              panelClassName={designHighlight}
              highlightRegion={selectedItem?.designRegion}
            />
          </div>
          <div className="lg:col-start-2 lg:row-start-1">
            <UploadColumn
              label="开发截图"
              hint="Dev：实际渲染截图。"
              file={devFile}
              onFile={handleDevFile}
              highlightRegion={selectedItem?.devRegion}
            />
          </div>

          <section className="flex min-h-0 flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            <div className="mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                走查结果
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                差异类型标签 + 优先级颜色；列表项与「是否存在/是否一致」表述对齐。
              </p>
            </div>
            <DesignQAResultsPanel
              result={qaResult}
              meta={meta}
              selectedDiffIndex={selectedDiffIndex}
              onSelectDiff={handleSelectDiff}
            />
          </section>

          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2">
            {compareRow}
          </div>
        </div>
      </main>
    </div>
  );
}
