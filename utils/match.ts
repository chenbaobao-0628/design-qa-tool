import type { DesignNode, DomNode, MatchResult } from '@/types/design';

export function textSimilarity(designText: string | undefined, domText: string | undefined): number {
  if (!designText && !domText) return 1;
  if (!designText || !domText) return 0.2;
  
  const dText = designText.toLowerCase().trim();
  const dDom = domText.toLowerCase().trim();
  
  if (dText === dDom) return 1;
  if (dDom.includes(dText) || dText.includes(dDom)) return 0.8;
  return 0.2;
}

export function positionSimilarity(dx: number, dy: number): number {
  const distance = Math.abs(dx) + Math.abs(dy);
  
  if (distance < 20) return 1;
  if (distance < 50) return 0.5;
  return 0;
}

export function sizeSimilarity(dw: number, dh: number): number {
  const diff = Math.abs(dw) + Math.abs(dh);
  
  if (diff < 5) return 1;
  if (diff < 10) return 0.5;
  return 0;
}

export function typeMatch(designType: DesignNode['type'], domTag: string): number {
  const tag = domTag.toLowerCase();
  
  switch (designType) {
    case 'text':
      if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em'].includes(tag)) {
        return 1;
      }
      return 0;
    case 'button':
      if (tag === 'button' || tag === 'a') {
        return 1;
      }
      return 0;
    case 'container':
      if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'header' || tag === 'footer') {
        return 1;
      }
      return 0;
    case 'image':
      if (tag === 'img') {
        return 1;
      }
      return 0;
    default:
      return 0;
  }
}

export function calculateMatchScore(designNode: DesignNode, domNode: DomNode): number {
  const textScore = textSimilarity(designNode.text, domNode.text);
  const posScore = positionSimilarity(designNode.x - domNode.x, designNode.y - domNode.y);
  const sizeScore = sizeSimilarity(designNode.width - domNode.width, designNode.height - domNode.height);
  const typeScore = typeMatch(designNode.type, domNode.tag);
  
  return textScore * 0.4 + posScore * 0.3 + sizeScore * 0.2 + typeScore * 0.1;
}

export function matchNodes(designNodes: DesignNode[], domNodes: DomNode[]): MatchResult[] {
  const results: MatchResult[] = [];
  const usedDomIndices = new Set<number>();
  
  for (const designNode of designNodes) {
    let bestScore = 0;
    let bestDomNode: DomNode | null = null;
    let bestIndex = -1;
    
    for (let i = 0; i < domNodes.length; i++) {
      if (usedDomIndices.has(i)) continue;
      
      const domNode = domNodes[i];
      const score = calculateMatchScore(designNode, domNode);
      
      if (score > bestScore) {
        bestScore = score;
        bestDomNode = domNode;
        bestIndex = i;
      }
    }
    
    if (bestScore >= 0.5 && bestDomNode) {
      usedDomIndices.add(bestIndex);
      results.push({
        designNode,
        domNode: bestDomNode,
        score: bestScore,
        type: 'matched',
      });
    } else {
      results.push({
        designNode,
        domNode: null,
        score: 0,
        type: 'missing',
      });
    }
  }
  
  return results;
}
