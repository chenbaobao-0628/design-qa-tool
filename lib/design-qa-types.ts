/** 差异类型（与设计走查约定一致） */
export type DesignQADiffType = "缺失" | "多余" | "内容" | "样式" | "布局";

/** 开发修复优先级 */
export type DesignQAPriority = "必须修复" | "建议修复" | "可忽略";

/** 归一化区域坐标，x/y/width/height 均为 0-1，用于在截图预览上粗标注差异区域 */
export type DesignQARegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 单条结构化差异（面向开发落地） */
export type DesignQAItem = {
  moduleName: string;
  diffType: DesignQADiffType | string;
  priority: DesignQAPriority | string;
  confidence?: number;
  designRegion?: DesignQARegion;
  devRegion?: DesignQARegion;
  designSpec: string[];
  devImplementation: string[];
  diffPoints: string[];
  fixSuggestions: string[];
  acceptanceChecks?: string[];
};

export type DesignQASummary = {
  /** 页面一致度 0–100，越高越接近设计稿 */
  consistencyPercent: number;
  mustFix: number;
  suggestFix: number;
  canIgnore: number;
  /** 主要问题摘要（短句，便于站会/排期） */
  mainIssues: string[];
};

export type DesignQAResult = {
  has_diff: boolean;
  summary: DesignQASummary;
  diffs: DesignQAItem[];
};
