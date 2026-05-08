import type { DesignNode } from '@/types/design';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  characters?: string;
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number };
  }>;
  style?: {
    fontSize?: number;
  };
  children?: FigmaNode[];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function mapFigmaType(figmaType: string): DesignNode['type'] {
  switch (figmaType.toUpperCase()) {
    case 'TEXT':
      return 'text';
    case 'FRAME':
    case 'GROUP':
      return 'container';
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'POLYGON':
      return 'button';
    case 'IMAGE':
      return 'image';
    default:
      return 'container';
  }
}

function extractColor(fills?: FigmaNode['fills']): string | undefined {
  if (!fills || fills.length === 0) return undefined;
  const fill = fills.find(f => f.type === 'SOLID' && f.color);
  if (!fill?.color) return undefined;
  return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
}

function parseNode(node: FigmaNode): DesignNode {
  return {
    id: node.id,
    name: node.name,
    type: mapFigmaType(node.type),
    text: node.characters,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    color: extractColor(node.fills),
    fontSize: node.style?.fontSize,
  };
}

export function parseFigmaJson(figmaData: unknown): DesignNode[] {
  if (typeof figmaData !== 'object' || figmaData === null) {
    return [];
  }

  const data = figmaData as Record<string, unknown>;
  const document = data.document as FigmaNode | undefined;
  
  if (!document) {
    return [];
  }

  const nodes: DesignNode[] = [];
  const queue: FigmaNode[] = [document];

  while (queue.length > 0) {
    const node = queue.shift()!;
    
    if (['TEXT', 'FRAME', 'RECTANGLE', 'IMAGE', 'GROUP'].includes(node.type.toUpperCase())) {
      nodes.push(parseNode(node));
    }

    if (node.children) {
      queue.push(...node.children);
    }
  }

  return nodes;
}
