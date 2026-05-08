import type { DomNode } from '@/types/design';

function generateSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current.tagName !== 'HTML') {
    let selector = current.tagName.toLowerCase();
    
    if (current.classList.length > 0) {
      selector += '.' + Array.from(current.classList).join('.');
    }
    
    let index = 0;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }
    
    if (index > 0) {
      selector += `:nth-of-type(${index + 1})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

function getTextContent(element: Element): string | undefined {
  const text = element.textContent?.trim();
  return text || undefined;
}

function isVisible(element: Element, style: CSSStyleDeclaration): boolean {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.width) === 0 && parseFloat(style.height) === 0) return false;
  if (style.opacity === '0') return false;
  return true;
}

export function extractDom(): DomNode[] {
  const nodes: DomNode[] = [];
  const elements = document.querySelectorAll('*');
  
  elements.forEach((element) => {
    const style = window.getComputedStyle(element);
    
    if (!isVisible(element, style)) {
      return;
    }
    
    const rect = element.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) {
      return;
    }
    
    const node: DomNode = {
      selector: generateSelector(element),
      tag: element.tagName.toLowerCase(),
      text: getTextContent(element),
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      color: style.color,
      background: style.backgroundColor,
      fontSize: parseFloat(style.fontSize),
    };
    
    nodes.push(node);
  });
  
  return nodes;
}

export function extractDomFromSnapshot(domSnapshot: unknown): DomNode[] {
  if (!domSnapshot || typeof domSnapshot !== 'object') {
    return [];
  }
  
  const snapshot = domSnapshot as Array<{
    selector: string;
    tag: string;
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    background?: string;
    fontSize?: number;
  }>;
  
  if (!Array.isArray(snapshot)) {
    return [];
  }
  
  return snapshot.map(item => ({
    selector: item.selector,
    tag: item.tag,
    text: item.text,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    color: item.color,
    background: item.background,
    fontSize: item.fontSize,
  }));
}
