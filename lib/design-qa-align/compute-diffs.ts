import {
  colorChannelMaxDelta,
  formatRGBA,
  parseColor,
} from "./color-utils";
import type { AlignDiffRecord, AlignNode, AlignOptions, NodeMapping } from "./types";
import { normalizeText } from "./text-utils";
import { transformDesignNode } from "./normalize";

function elementLabel(d: AlignNode): string {
  const t = normalizeText(d.text);
  if (t) {
    const short = t.length > 32 ? `${t.slice(0, 32)}…` : t;
    return `${d.id} · 「${short}」`;
  }
  return d.id;
}

function summarizeNode(n: AlignNode): string {
  const parts = [
    `x:${Math.round(n.x)} y:${Math.round(n.y)}`,
    `w:${Math.round(n.width)} h:${Math.round(n.height)}`,
  ];
  const t = normalizeText(n.text);
  if (t) parts.push(`text:"${t}"`);
  if (n.color) parts.push(`color:${n.color}`);
  return parts.join(", ");
}

export function computeAlignDiffs(
  designNodes: AlignNode[],
  domNodes: AlignNode[],
  mappings: NodeMapping[],
  missingDesign: AlignNode[],
  extraDom: AlignNode[],
  options: AlignOptions,
): AlignDiffRecord[] {
  const scale = options.designScale ?? 1;
  const offset = options.designOffset ?? { x: 0, y: 0 };

  const designById = new Map(designNodes.map((n) => [n.id, n]));
  const domById = new Map(domNodes.map((n) => [n.id, n]));

  const diffs: AlignDiffRecord[] = [];

  for (const m of missingDesign) {
    diffs.push({
      element: elementLabel(m),
      type: "缺失",
      designValue: summarizeNode(transformDesignNode(m, scale, offset)),
      devValue: "-",
      diff: "DOM 中无匹配节点（按文本/位置/尺寸加权未找到足够相似项）",
    });
  }

  for (const x of extraDom) {
    diffs.push({
      element: elementLabel(x),
      type: "多余",
      designValue: "-",
      devValue: summarizeNode(x),
      diff: "设计稿中无对应节点（DOM 多出的可匹配区域）",
    });
  }

  for (const map of mappings) {
    const d0 = designById.get(map.designId);
    const dom = domById.get(map.domId);
    if (!d0 || !dom) continue;

    const d = transformDesignNode(d0, scale, offset);
    const el = elementLabel(d0);

    const dx = Math.round(dom.x) - Math.round(d.x);
    const dy = Math.round(dom.y) - Math.round(d.y);
    if (dx !== 0 || dy !== 0) {
      diffs.push({
        element: el,
        type: "位置",
        designValue: `x=${Math.round(d.x)}, y=${Math.round(d.y)}`,
        devValue: `x=${Math.round(dom.x)}, y=${Math.round(dom.y)}`,
        diff: `Δx=${dx}px, Δy=${dy}px`,
      });
    }

    const dw = Math.round(dom.width) - Math.round(d.width);
    const dh = Math.round(dom.height) - Math.round(d.height);
    if (dw !== 0 || dh !== 0) {
      diffs.push({
        element: el,
        type: "尺寸",
        designValue: `w=${Math.round(d.width)}, h=${Math.round(d.height)}`,
        devValue: `w=${Math.round(dom.width)}, h=${Math.round(dom.height)}`,
        diff: `Δw=${dw}px, Δh=${dh}px`,
      });
    }

    const c1 = parseColor(d.color);
    const c2 = parseColor(dom.color);
    if (c1 && c2) {
      const delta = colorChannelMaxDelta(c1, c2);
      if (delta > 0) {
        diffs.push({
          element: el,
          type: "颜色",
          designValue: formatRGBA(c1),
          devValue: formatRGBA(c2),
          diff: `通道最大差 ${delta}（含 alpha 按 0–255）`,
        });
      }
    }

    const t1 = normalizeText(d.text);
    const t2 = normalizeText(dom.text);
    if (t1 !== t2) {
      diffs.push({
        element: el,
        type: "文本",
        designValue: t1 ? `"${t1}"` : "（空）",
        devValue: t2 ? `"${t2}"` : "（空）",
        diff: t1 === "" || t2 === "" ? "一侧为空，不一致" : "字符串不完全一致",
      });
    }
  }

  return diffs;
}
