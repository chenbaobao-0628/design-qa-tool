export type PixelDiffBox = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  areaPercent: number;
};

export type PixelDiffImageSize = {
  width: number;
  height: number;
};

export type PixelDiffStatus = "comparable" | "ratio-mismatch" | "too-different";

export type PixelDiffOptions = {
  pixelThreshold: number;
  minRegionArea: number;
  maxRegions: number;
};

export type PixelDiffResult = {
  status: PixelDiffStatus;
  message?: string;
  hasDiff: boolean;
  width: number;
  height: number;
  originalDesignSize: PixelDiffImageSize;
  originalDevSize: PixelDiffImageSize;
  alignedSize: PixelDiffImageSize;
  diffPixelCount: number;
  diffPercent: number;
  boxes: PixelDiffBox[];
  options: PixelDiffOptions;
  alignedDesignDataUrl: string;
  alignedDevDataUrl: string;
};
