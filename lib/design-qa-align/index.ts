import { computeAlignDiffs } from "./compute-diffs";
import { matchDesignDomNodes } from "./match-nodes";
import { normalizeNodeList } from "./normalize";
import type { AlignOptions, DesignQAAlignResult } from "./types";

const MAX_NODES = 800;

export type DesignQAAlignInput = {
  /** Figma 导出或扁平节点数组 */
  figmaNodes?: unknown[];
  /** 兼容字段名 */
  designNodes?: unknown[];
  /** DOM 序列化节点 */
  domNodes?: unknown[];
  options?: AlignOptions;
};

/**
 * 纯结构化 Design QA 对齐：匹配设计节点与 DOM 节点并计算像素级差异。
 * 不使用任何视觉模型。
 */
export function runDesignQAAlign(input: DesignQAAlignInput): DesignQAAlignResult {
  const rawDesign =
    input.designNodes ?? input.figmaNodes ?? [];
  const rawDom = input.domNodes ?? [];

  if (!Array.isArray(rawDesign) || !Array.isArray(rawDom)) {
    throw new Error("designNodes/figmaNodes 与 domNodes 必须为数组。");
  }
  if (rawDesign.length > MAX_NODES || rawDom.length > MAX_NODES) {
    throw new Error(`单批节点数请勿超过 ${MAX_NODES}。`);
  }

  const designNodes = normalizeNodeList(rawDesign, "design");
  const domNodes = normalizeNodeList(rawDom, "dom");

  const options = input.options ?? {};

  const { mappings, missingDesign, extraDom } = matchDesignDomNodes(
    designNodes,
    domNodes,
    options,
  );

  const diffs = computeAlignDiffs(
    designNodes,
    domNodes,
    mappings,
    missingDesign,
    extraDom,
    options,
  );

  return {
    mappings,
    missingDesignIds: missingDesign.map((n) => n.id),
    extraDomIds: extraDom.map((n) => n.id),
    diffs,
  };
}

export type {
  AlignDiffRecord,
  AlignNode,
  AlignOptions,
  DesignQAAlignResult,
  NodeMapping,
} from "./types";
