import type { DesignQAItem, DesignQAResult } from "./design-qa-types";

type ExportMeta = {
  designFileName?: string;
  devFileName?: string;
  provider?: string;
  generatedAt?: string;
};

function linesForList(items: string[], fallback = "无"): string[] {
  if (items.length === 0) return [`- ${fallback}`];
  return items.map((item) => `- ${item}`);
}

function diffToMarkdown(item: DesignQAItem, index: number): string {
  const parts = [
    `### ${index + 1}. ${item.moduleName || "未命名模块"}`,
    "",
    `- 类型：${item.diffType || "未分类"}`,
    `- 优先级：${item.priority || "未分级"}`,
  ];

  if (typeof item.confidence === "number") {
    parts.push(`- 置信度：${Math.round(item.confidence * 100)}%`);
  }

  parts.push(
    "",
    "设计稿：",
    ...linesForList(item.designSpec),
    "",
    "开发实现：",
    ...linesForList(item.devImplementation),
    "",
    "差异点：",
    ...linesForList(item.diffPoints),
    "",
    "修改建议：",
    ...linesForList(item.fixSuggestions),
  );

  if (item.acceptanceChecks && item.acceptanceChecks.length > 0) {
    parts.push("", "验收点：", ...linesForList(item.acceptanceChecks));
  }

  return parts.join("\n");
}

export function buildDesignQAMarkdown(
  result: DesignQAResult,
  meta: ExportMeta = {},
): string {
  const header = [
    "# Design QA 走查报告",
    "",
    meta.generatedAt ? `- 生成时间：${meta.generatedAt}` : null,
    meta.designFileName ? `- 设计稿：${meta.designFileName}` : null,
    meta.devFileName ? `- 开发截图：${meta.devFileName}` : null,
    meta.provider ? `- 模型/来源：${meta.provider}` : null,
    `- 页面一致度：${result.summary.consistencyPercent}%`,
    `- 必须修复：${result.summary.mustFix}`,
    `- 建议修复：${result.summary.suggestFix}`,
    `- 可忽略：${result.summary.canIgnore}`,
  ].filter((line): line is string => Boolean(line));

  const summary = [
    "",
    "## 主要问题",
    "",
    ...linesForList(result.summary.mainIssues),
  ];

  const diffs =
    result.diffs.length > 0
      ? ["", "## 差异明细", "", ...result.diffs.map(diffToMarkdown)]
      : ["", "## 差异明细", "", "未发现需跟进的差异项。"];

  return [...header, ...summary, ...diffs].join("\n");
}
