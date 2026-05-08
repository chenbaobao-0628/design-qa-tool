import { normalizeText, textSimilarity } from "./text-utils";
import type { AlignNode, AlignOptions, MatchWeights, NodeMapping } from "./types";
import { transformDesignNode } from "./normalize";

const DEFAULT_WEIGHTS: MatchWeights = {
  text: 0.4,
  position: 0.35,
  size: 0.25,
};

function bboxDiag(nodes: AlignNode[]): number {
  if (nodes.length === 0) return 400;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return Math.hypot(maxX - minX, maxY - minY) || 400;
}

function pairScore(
  design: AlignNode,
  dom: AlignNode,
  sigma: number,
  weights: MatchWeights,
): number {
  const ts = textSimilarity(design.text, dom.text);
  const cx1 = design.x + design.width / 2;
  const cy1 = design.y + design.height / 2;
  const cx2 = dom.x + dom.width / 2;
  const cy2 = dom.y + dom.height / 2;
  const dist = Math.hypot(cx1 - cx2, cy1 - cy2);
  const posScore = Math.exp(-dist / sigma);

  const dw =
    Math.abs(design.width - dom.width) /
    Math.max(design.width, dom.width, 1);
  const dh =
    Math.abs(design.height - dom.height) /
    Math.max(design.height, dom.height, 1);
  const sizeScore = 1 - Math.min(1, (dw + dh) / 2);

  const t1 = normalizeText(design.text);
  const t2 = normalizeText(dom.text);
  const w = weights;
  if (!t1 && !t2) {
    const s = w.position + w.size;
    if (s <= 0) return 0;
    return (w.position * posScore + w.size * sizeScore) / s;
  }
  const s = w.text + w.position + w.size;
  if (s <= 0) return 0;
  return (w.text * ts + w.position * posScore + w.size * sizeScore) / s;
}

/**
 * 基于文本、位置、尺寸的加权分数，贪心一对一匹配（高分优先）。
 */
export function matchDesignDomNodes(
  designNodes: AlignNode[],
  domNodes: AlignNode[],
  options: AlignOptions = {},
): {
  mappings: NodeMapping[];
  missingDesign: AlignNode[];
  extraDom: AlignNode[];
} {
  const scale = options.designScale ?? 1;
  const offset = options.designOffset ?? { x: 0, y: 0 };
  const weights: MatchWeights = { ...DEFAULT_WEIGHTS, ...options.weights };
  const minScore = options.minMatchScore ?? 0.32;

  const designT = designNodes.map((n) =>
    transformDesignNode(n, scale, offset),
  );

  const all = [...designT, ...domNodes];
  const sigma = Math.max(48, bboxDiag(all) * 0.12);

  type Cand = { di: number; dj: number; score: number };
  const cands: Cand[] = [];
  for (let i = 0; i < designT.length; i++) {
    for (let j = 0; j < domNodes.length; j++) {
      cands.push({
        di: i,
        dj: j,
        score: pairScore(designT[i], domNodes[j], sigma, weights),
      });
    }
  }
  cands.sort((a, b) => b.score - a.score);

  const usedD = new Set<number>();
  const usedDom = new Set<number>();
  const mappings: NodeMapping[] = [];

  for (const c of cands) {
    if (c.score < minScore) break;
    if (usedD.has(c.di) || usedDom.has(c.dj)) continue;
    usedD.add(c.di);
    usedDom.add(c.dj);
    mappings.push({
      designId: designNodes[c.di].id,
      domId: domNodes[c.dj].id,
      score: Math.round(c.score * 1000) / 1000,
    });
  }

  const missingDesign = designNodes.filter((_, i) => !usedD.has(i));
  const extraDom = domNodes.filter((_, j) => !usedDom.has(j));

  return { mappings, missingDesign, extraDom };
}
