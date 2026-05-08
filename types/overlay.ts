export type DiffSeverity = 'critical' | 'warning' | 'info';

export interface OverlayDiff {
  id: string;
  type: 'size' | 'position' | 'color' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  message: string;
  designValue?: string;
  devValue?: string;
  severity: DiffSeverity;
}

export interface OverlayConfig {
  enabled: boolean;
  showLabels: boolean;
  severityColors: {
    critical: string;
    warning: string;
    info: string;
  };
}

export interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  diff: OverlayDiff;
}
