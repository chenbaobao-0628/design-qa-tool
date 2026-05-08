import type { DesignQAItem, DesignQASummary } from "./design-qa-types";

/**
 * 由差异列表计算一致度与统计；mainIssues 优先用模型摘要，否则由必须修复项推导。
 */
export function buildDesignQASummary(
  diffs: DesignQAItem[],
  modelMainIssues?: string[],
): DesignQASummary {
  if (diffs.length === 0) {
    return {
      consistencyPercent: 100,
      mustFix: 0,
      suggestFix: 0,
      canIgnore: 0,
      mainIssues: modelMainIssues?.length
        ? modelMainIssues
        : ["✅ 未发现需跟进的 UI 差异（或与设计稿一致）。"],
    };
  }

  let mustFix = 0;
  let suggestFix = 0;
  let canIgnore = 0;
  for (const d of diffs) {
    const p = d.priority;
    if (p === "必须修复") mustFix++;
    else if (p === "建议修复") suggestFix++;
    else if (p === "可忽略") canIgnore++;
    else suggestFix++;
  }

  const penalty = mustFix * 22 + suggestFix * 10 + canIgnore * 4;
  const consistencyPercent = Math.max(
    0,
    Math.min(100, Math.round(100 - Math.min(100, penalty))),
  );

  const mainIssues =
    modelMainIssues && modelMainIssues.length > 0
      ? modelMainIssues
      : deriveMainIssues(diffs);

  return {
    consistencyPercent,
    mustFix,
    suggestFix,
    canIgnore,
    mainIssues,
  };
}

function deriveMainIssues(diffs: DesignQAItem[]): string[] {
  const out: string[] = [];

  const must = diffs.filter((d) => d.priority === "必须修复");
  const rest = diffs.filter((d) => d.priority !== "必须修复");

  for (const d of must) {
    const line =
      d.diffPoints[0] ||
      `${d.moduleName || "未命名模块"} · ${d.diffType}（必须修复）`;
    if (line) out.push(`❌ ${line}`);
    if (out.length >= 5) break;
  }

  if (out.length === 0) {
    for (const d of rest) {
      const line =
        d.diffPoints[0] ||
        `${d.moduleName || "未命名模块"} · ${d.diffType}`;
      if (line) out.push(`❌ ${line}`);
      if (out.length >= 4) break;
    }
  }

  return out.length > 0 ? out : ["❌ 存在差异，请查看下方逐条清单。"];
}
