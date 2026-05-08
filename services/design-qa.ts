import type { MatchResult, DiffResult } from '@/types/design';
import { parseFigmaJson } from '@/utils/figmaParser';
import { extractDomFromSnapshot } from '@/utils/extractDom';
import { matchNodes } from '@/utils/match';
import { calculateAllDiffs } from '@/utils/diff';

export interface DesignQAInput {
  figmaJson: unknown;
  domSnapshot: unknown;
}

export interface DesignQAResult {
  matchResults: MatchResult[];
  diffResults: DiffResult[];
  summary: {
    totalDesignNodes: number;
    matchedCount: number;
    missingCount: number;
    diffCount: number;
  };
}

export function runDesignQA(input: DesignQAInput): DesignQAResult {
  const designNodes = parseFigmaJson(input.figmaJson);
  const domNodes = extractDomFromSnapshot(input.domSnapshot);
  
  const matchResults = matchNodes(designNodes, domNodes);
  const diffResults = calculateAllDiffs(matchResults);
  
  const matchedCount = matchResults.filter(r => r.type === 'matched').length;
  const missingCount = matchResults.filter(r => r.type === 'missing').length;
  
  return {
    matchResults,
    diffResults,
    summary: {
      totalDesignNodes: designNodes.length,
      matchedCount,
      missingCount,
      diffCount: diffResults.length,
    },
  };
}

export function getDesignQAStats(result: DesignQAResult) {
  const { summary, diffResults } = result;
  
  const sizeDiffs = diffResults.filter(d => d.diffs.some(diff => diff.type === 'size')).length;
  const positionDiffs = diffResults.filter(d => d.diffs.some(diff => diff.type === 'position')).length;
  const colorDiffs = diffResults.filter(d => d.diffs.some(diff => diff.type === 'color')).length;
  const textDiffs = diffResults.filter(d => d.diffs.some(diff => diff.type === 'text')).length;
  
  return {
    ...summary,
    sizeDiffs,
    positionDiffs,
    colorDiffs,
    textDiffs,
  };
}
