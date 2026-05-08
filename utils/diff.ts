import type { DesignNode, DomNode, DiffResult, DiffItem } from '@/types/design';

function createDiffItem(type: DiffItem['type'], design: string, dev: string, diff?: string): DiffItem {
  return { type, design, dev, diff };
}

export function calculateDiff(designNode: DesignNode, domNode: DomNode): DiffResult {
  const diffs: DiffItem[] = [];
  const element = designNode.name || designNode.id;
  
  const dx = domNode.x - designNode.x;
  const dy = domNode.y - designNode.y;
  const dw = domNode.width - designNode.width;
  const dh = domNode.height - designNode.height;
  
  if (Math.abs(dw) >= 1 || Math.abs(dh) >= 1) {
    diffs.push(createDiffItem(
      'size',
      `${designNode.width}px × ${designNode.height}px`,
      `${domNode.width}px × ${domNode.height}px`,
      `宽: ${dw > 0 ? '+' : ''}${dw.toFixed(2)}px, 高: ${dh > 0 ? '+' : ''}${dh.toFixed(2)}px`
    ));
  }
  
  if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
    diffs.push(createDiffItem(
      'position',
      `(${designNode.x.toFixed(2)}px, ${designNode.y.toFixed(2)}px)`,
      `(${domNode.x.toFixed(2)}px, ${domNode.y.toFixed(2)}px)`,
      `X: ${dx > 0 ? '+' : ''}${dx.toFixed(2)}px, Y: ${dy > 0 ? '+' : ''}${dy.toFixed(2)}px`
    ));
  }
  
  if (designNode.color && domNode.color && designNode.color !== domNode.color) {
    diffs.push(createDiffItem(
      'color',
      designNode.color,
      domNode.color
    ));
  }
  
  if (designNode.text !== undefined && domNode.text !== undefined && designNode.text !== domNode.text) {
    diffs.push(createDiffItem(
      'text',
      designNode.text || '(空)',
      domNode.text || '(空)'
    ));
  }
  
  if (designNode.fontSize && domNode.fontSize && Math.abs(designNode.fontSize - domNode.fontSize) >= 1) {
    diffs.push(createDiffItem(
      'size',
      `${designNode.fontSize}px`,
      `${domNode.fontSize}px`,
      `字体大小差异: ${(domNode.fontSize - designNode.fontSize > 0 ? '+' : '')}${(domNode.fontSize - designNode.fontSize).toFixed(2)}px`
    ));
  }
  
  return { element, diffs };
}

export function calculateMissingDiff(designNode: DesignNode): DiffResult {
  return {
    element: designNode.name || designNode.id,
    diffs: [{
      type: 'size',
      design: `${designNode.width}px × ${designNode.height}px`,
      dev: '(缺失)',
      diff: '元素缺失'
    }]
  };
}

export function calculateAllDiffs(matchResults: { designNode: DesignNode; domNode: DomNode | null; type: 'matched' | 'missing' }[]): DiffResult[] {
  const results: DiffResult[] = [];
  
  for (const match of matchResults) {
    if (match.type === 'missing') {
      results.push(calculateMissingDiff(match.designNode));
    } else if (match.domNode) {
      const diff = calculateDiff(match.designNode, match.domNode);
      if (diff.diffs.length > 0) {
        results.push(diff);
      }
    }
  }
  
  return results;
}
