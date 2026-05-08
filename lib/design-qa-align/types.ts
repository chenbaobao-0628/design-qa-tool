/** 对齐后的规范节点（像素坐标系，左上原点） */
export type AlignNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
};

export type MatchWeights = {
  text: number;
  position: number;
  size: number;
};

export type AlignOptions = {
  /** 设计稿坐标缩放后再与 DOM 比较 */
  designScale?: number;
  designOffset?: { x: number; y: number };
  weights?: Partial<MatchWeights>;
  /** 0~1，低于此分数不匹配（避免乱配对） */
  minMatchScore?: number;
};

export type NodeMapping = {
  designId: string;
  domId: string;
  score: number;
};

export type AlignDiffType = "缺失" | "多余" | "位置" | "尺寸" | "颜色" | "文本";

/** 单条差异记录（结构化输出） */
export type AlignDiffRecord = {
  element: string;
  type: AlignDiffType;
  designValue: string;
  devValue: string;
  diff: string;
};

export type DesignQAAlignResult = {
  mappings: NodeMapping[];
  missingDesignIds: string[];
  extraDomIds: string[];
  diffs: AlignDiffRecord[];
};
