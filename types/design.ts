export type DesignNodeType = "text" | "button" | "container" | "image";

export type DesignNode = {
  id: string;
  name: string;
  type: DesignNodeType;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fontSize?: number;
};

export type DomNode = {
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
};

export type MatchResult = {
  designNode: DesignNode;
  domNode: DomNode | null;
  score: number;
  type: "matched" | "missing";
};

export type DiffItem = {
  type: "size" | "position" | "color" | "text";
  design: string;
  dev: string;
  diff?: string;
};

export type DiffResult = {
  element: string;
  diffs: DiffItem[];
};
