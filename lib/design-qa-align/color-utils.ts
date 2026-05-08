export type RGBA = { r: number; g: number; b: number; a: number };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** 将常见 CSS / Figma 颜色字符串解析为 0–255 RGB + alpha */
export function parseColor(input: string | undefined): RGBA | null {
  if (input == null || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;

  const hex = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const n = parseInt(h.slice(0, 6), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    let a = 1;
    if (h.length === 8) {
      a = parseInt(h.slice(6, 8), 16) / 255;
    }
    return { r, g, b, a: clamp01(a) };
  }

  const rgb =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
      s,
    );
  if (rgb) {
    const r = Math.round(Number(rgb[1]));
    const g = Math.round(Number(rgb[2]));
    const b = Math.round(Number(rgb[3]));
    const a = rgb[4] != null ? Number(rgb[4]) : 1;
    return { r, g, b, a: clamp01(a) };
  }

  return null;
}

/** 通道最大差值（0–255），用于 1 级精度检测 */
export function colorChannelMaxDelta(a: RGBA, b: RGBA): number {
  return Math.max(
    Math.abs(a.r - b.r),
    Math.abs(a.g - b.g),
    Math.abs(a.b - b.b),
    Math.abs(Math.round(a.a * 255) - Math.round(b.a * 255)),
  );
}

export function formatRGBA(c: RGBA): string {
  if (c.a >= 1) return `rgb(${c.r}, ${c.g}, ${c.b})`;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}
