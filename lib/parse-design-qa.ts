import type {
  DesignQAItem,
  DesignQADiffType,
  DesignQAPriority,
  DesignQARegion,
  DesignQAResult,
} from "./design-qa-types";

const DIFF_TYPES: readonly DesignQADiffType[] = [
  "缺失",
  "多余",
  "内容",
  "样式",
  "布局",
];

const PRIORITIES: readonly DesignQAPriority[] = [
  "必须修复",
  "建议修复",
  "可忽略",
];

function stripCodeFences(raw: string) {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function pickRegion(v: unknown): DesignQARegion | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const x = pickNumber(o, "x", "left");
  const y = pickNumber(o, "y", "top");
  const width = pickNumber(o, "width", "w");
  const height = pickNumber(o, "height", "h");
  if (
    x == null ||
    y == null ||
    width == null ||
    height == null ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }
  const cx = Math.min(0.98, clamp01(x));
  const cy = Math.min(0.98, clamp01(y));
  return {
    x: cx,
    y: cy,
    width: Math.max(0.02, Math.min(1 - cx, clamp01(width))),
    height: Math.max(0.02, Math.min(1 - cy, clamp01(height))),
  };
}

function pickDiffType(v: unknown): DesignQADiffType | string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (DIFF_TYPES.includes(t as DesignQADiffType)) return t as DesignQADiffType;
  return t;
}

function pickPriority(v: unknown): DesignQAPriority | string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (PRIORITIES.includes(t as DesignQAPriority)) return t as DesignQAPriority;
  return t;
}

function normalizeItem(entry: unknown): DesignQAItem | null {
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;

  const moduleName = pickString(o, "moduleName", "模块名称");
  const diffType = pickDiffType(o.diffType ?? o["差异类型"]);
  const priority = pickPriority(o.priority ?? o["优先级"]);

  const designSpec = toStringArray(o.designSpec ?? o["设计稿"]);
  const devImplementation = toStringArray(
    o.devImplementation ?? o["开发实现"],
  );
  const diffPoints = toStringArray(o.diffPoints ?? o["差异点"]);
  const fixSuggestions = toStringArray(
    o.fixSuggestions ?? o["修改建议"],
  );
  const acceptanceChecks = toStringArray(
    o.acceptanceChecks ?? o["验收点"] ?? o["验收标准"],
  );
  const confidence = pickNumber(o, "confidence", "置信度");
  const designRegion = pickRegion(o.designRegion ?? o["设计稿区域"]);
  const devRegion = pickRegion(o.devRegion ?? o["开发截图区域"]);

  const meaningful =
    moduleName ||
    diffType ||
    designSpec.length ||
    devImplementation.length ||
    diffPoints.length ||
    fixSuggestions.length;

  if (!meaningful) return null;

  return {
    moduleName,
    diffType: diffType || "布局",
    priority: priority || "建议修复",
    confidence:
      confidence == null ? undefined : Math.round(clamp01(confidence) * 100) / 100,
    designRegion,
    devRegion,
    designSpec,
    devImplementation,
    diffPoints,
    fixSuggestions,
    acceptanceChecks,
  };
}

function parseSummaryBlock(
  root: Record<string, unknown>,
): string[] | undefined {
  const s = root.summary;
  if (!s || typeof s !== "object" || Array.isArray(s)) return undefined;
  const main = (s as Record<string, unknown>).mainIssues;
  if (!Array.isArray(main)) return undefined;
  return main
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * 解析模型返回的 Design QA JSON（支持中英文字段名）。
 */
export function parseDesignQAJson(content: string): Omit<
  DesignQAResult,
  "summary"
> & { modelMainIssues?: string[] } {
  const jsonStr = stripCodeFences(content);
  let data: unknown;
  try {
    data = JSON.parse(jsonStr) as unknown;
  } catch {
    throw new Error("模型返回不是合法 JSON，请重试。");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("模型应返回一个 JSON 对象。");
  }

  const root = data as Record<string, unknown>;
  const declaredHas = Boolean(root.has_diff);
  const rawDiffs = root.diffs;
  if (!Array.isArray(rawDiffs)) {
    throw new Error("模型返回缺少 diffs 数组。");
  }

  const diffs: DesignQAItem[] = [];
  for (const item of rawDiffs) {
    const row = normalizeItem(item);
    if (row) diffs.push(row);
  }

  const modelMainIssues = parseSummaryBlock(root);

  if (!declaredHas || diffs.length === 0) {
    return {
      has_diff: false,
      diffs: [],
      modelMainIssues,
    };
  }

  return { has_diff: true, diffs, modelMainIssues };
}
