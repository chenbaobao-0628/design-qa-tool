import type { AlignNode } from "./types";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    return Number(v);
  return fallback;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

/** 从 Figma 常见 fills 结构取色 */
function figmaFillColor(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const color = o.color;
  if (!color || typeof color !== "object") return undefined;
  const c = color as Record<string, unknown>;
  const r = num(c.r);
  const g = num(c.g);
  const b = num(c.b);
  const a = c.a != null ? num(c.a, 1) : 1;
  if ([r, g, b].every((x) => x >= 0 && x <= 1)) {
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * 将任意 Figma/自定义 JSON 节点规范为 AlignNode。
 * 支持：{ x,y,width,height,color?,text? } 或 absoluteBoundingBox + characters + fills。
 */
export function normalizeDesignNode(raw: unknown, index: number): AlignNode | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  let x = num(o.x);
  let y = num(o.y);
  let width = num(o.width);
  let height = num(o.height);

  const box = o.absoluteBoundingBox;
  if (box && typeof box === "object") {
    const b = box as Record<string, unknown>;
    x = num(b.x, x);
    y = num(b.y, y);
    width = num(b.width, width);
    height = num(b.height, height);
  }

  if (width <= 0 || height <= 0) return null;

  const id =
    str(o.id) ||
    str(o.nodeId) ||
    `design-${index}`;

  const text =
    str(o.text) ||
    str(o.characters) ||
    str(o.name);

  let color = str(o.color);
  if (!color && Array.isArray(o.fills) && o.fills.length > 0) {
    color = figmaFillColor(o.fills[0]);
  }

  return {
    id,
    x,
    y,
    width,
    height,
    color,
    text,
  };
}

/** DOM 侧导出 JSON（getBoundingClientRect + getComputedStyle） */
export function normalizeDomNode(raw: unknown, index: number): AlignNode | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const x = num(o.x);
  const y = num(o.y);
  const width = num(o.width);
  const height = num(o.height);

  if (width <= 0 || height <= 0) return null;

  const id = str(o.id) || str(o.selector) || `dom-${index}`;

  return {
    id,
    x,
    y,
    width,
    height,
    color: str(o.color),
    text: str(o.text) || str(o.textContent),
  };
}

export function normalizeNodeList(
  rawList: unknown,
  kind: "design" | "dom",
): AlignNode[] {
  if (!Array.isArray(rawList)) return [];
  const fn =
    kind === "design" ? normalizeDesignNode : normalizeDomNode;
  const out: AlignNode[] = [];
  rawList.forEach((item, i) => {
    const n = fn(item, i);
    if (n) out.push(n);
  });
  return out;
}

/** 设计坐标变换到与 DOM 同一空间 */
export function transformDesignNode(
  n: AlignNode,
  scale: number,
  offset: { x: number; y: number },
): AlignNode {
  return {
    ...n,
    x: n.x * scale + offset.x,
    y: n.y * scale + offset.y,
    width: n.width * scale,
    height: n.height * scale,
  };
}
