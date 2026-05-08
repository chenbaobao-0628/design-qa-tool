"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { DesignQARegion } from "@/lib/design-qa-types";
import type { PixelDiffImageSize } from "@/lib/pixel-diff-types";

type ImageUploadPanelProps = {
  title: string;
  eyebrow: string;
  description: string;
  file: File | null;
  originalSize?: PixelDiffImageSize | null;
  alignedSize?: PixelDiffImageSize | null;
  alignedPreviewUrl?: string;
  onFileChange: (file: File | null) => void;
  highlightRegion?: DesignQARegion;
};

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return url;
}

function formatSize(size?: PixelDiffImageSize | null) {
  return size ? `${size.width} x ${size.height}` : "待检测";
}

function formatScale(scale: number | null) {
  return scale == null ? "待加载" : `${Math.round(scale * 100)}%`;
}

export function ImageUploadPanel({
  title,
  eyebrow,
  description,
  file,
  originalSize,
  alignedSize,
  alignedPreviewUrl,
  onFileChange,
  highlightRegion,
}: ImageUploadPanelProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [displayScale, setDisplayScale] = useState<{
    url: string;
    scale: number;
  } | null>(null);
  const previewUrl = useObjectUrl(file);
  const displayUrl = alignedPreviewUrl || previewUrl;
  const currentDisplayScale =
    displayScale?.url === displayUrl ? displayScale.scale : null;

  const pickFile = useCallback(
    (files: FileList | null) => {
      const next = files?.[0];
      if (!next) return;
      if (!["image/png", "image/jpeg", "image/jpg"].includes(next.type)) return;
      onFileChange(next);
    },
    [onFileChange],
  );

  return (
    <section className="flex min-h-[620px] flex-col rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/20">
      <header className="border-b border-zinc-800 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {eyebrow}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {description}
            </p>
          </div>
          {file ? (
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="rounded-md border border-zinc-800 px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              清除
            </button>
          ) : null}
        </div>
      </header>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => {
          pickFile(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            pickFile(event.dataTransfer.files);
          }}
          className={[
            "h-[520px] w-full cursor-pointer overflow-auto rounded-lg border border-dashed p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500",
            dragOver
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-zinc-800 bg-black hover:border-zinc-700",
          ].join(" ")}
        >
          {displayUrl ? (
            <div className="flex min-h-full w-full items-start justify-center">
              <div className="relative inline-block max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt={`${title}预览`}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    if (displayUrl && image.naturalWidth > 0) {
                      setDisplayScale({
                        url: displayUrl,
                        scale: image.clientWidth / image.naturalWidth,
                      });
                    }
                  }}
                  className="block h-auto max-w-full rounded object-contain"
                />
                {highlightRegion ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute rounded border-2 border-cyan-400 bg-cyan-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]"
                    style={{
                      left: `${highlightRegion.x * 100}%`,
                      top: `${highlightRegion.y * 100}%`,
                      width: `${highlightRegion.width * 100}%`,
                      height: `${highlightRegion.height * 100}%`,
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  上传 PNG/JPG 图片
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  点击选择，或将文件拖入此区域
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-auto border-t border-zinc-800 px-4 py-3">
        {file ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-zinc-400" title={file.name}>
                {file.name}
              </span>
              <span className="shrink-0 text-zinc-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="grid gap-2 text-zinc-500 sm:grid-cols-3">
              <span>原始尺寸：{formatSize(originalSize)}</span>
              <span>对齐尺寸：{formatSize(alignedSize)}</span>
              <span>当前显示比例：{formatScale(currentDisplayScale)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">等待上传</p>
        )}
      </footer>
    </section>
  );
}
