'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { OverlayDiff, TooltipData } from '@/types/overlay';

interface DesignQAOverlayProps {
  diffs: OverlayDiff[];
  enabled: boolean;
  selectedDiffId?: string;
  onDiffClick?: (diff: OverlayDiff) => void;
}

const severityConfig = {
  critical: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    label: '严重',
  },
  warning: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    label: '建议',
  },
  info: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    label: '轻微',
  },
};

export function DesignQAOverlay({
  diffs,
  enabled,
  selectedDiffId,
  onDiffClick,
}: DesignQAOverlayProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [activeDiff, setActiveDiff] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((diff: OverlayDiff, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      diff,
    });
    setActiveDiff(diff.id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setActiveDiff(null);
  }, []);

  const handleClick = useCallback((diff: OverlayDiff) => {
    onDiffClick?.(diff);
    
    const element = document.elementFromPoint(diff.x + diff.width / 2, diff.y + diff.height / 2);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [onDiffClick]);

  useEffect(() => {
    if (selectedDiffId) {
      const diff = diffs.find(d => d.id === selectedDiffId);
      if (diff) {
        const element = document.elementFromPoint(diff.x + diff.width / 2, diff.y + diff.height / 2);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const showTimer = window.setTimeout(() => {
          setActiveDiff(selectedDiffId);
        }, 0);
        const hideTimer = window.setTimeout(() => {
          setActiveDiff(null);
        }, 2000);
        return () => {
          window.clearTimeout(showTimer);
          window.clearTimeout(hideTimer);
        };
      }
    }
    return undefined;
  }, [selectedDiffId, diffs]);

  useEffect(() => {
    const handleScroll = () => {
      if (tooltip) {
        setTooltip(null);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tooltip]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none z-[999999]"
        style={{ touchAction: 'none' }}
      >
        {diffs.map((diff) => {
          const config = severityConfig[diff.severity];
          const isSelected = selectedDiffId === diff.id;
          const isActive = activeDiff === diff.id;

          return (
            <div
              key={diff.id}
              className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
              style={{
                left: diff.x,
                top: diff.y,
                width: diff.width,
                height: diff.height,
                border: `3px solid ${config.borderColor}`,
                backgroundColor: config.backgroundColor,
                borderRadius: '4px',
                boxShadow: isSelected || isActive
                  ? `0 0 20px ${config.borderColor}, inset 0 0 20px ${config.backgroundColor}`
                  : `0 0 10px ${config.borderColor}40`,
                animation: isSelected ? 'pulse-highlight 1s ease-in-out' : undefined,
              }}
              onMouseEnter={(e) => handleMouseEnter(diff, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(diff)}
            >
              <div
                className="absolute -top-6 left-0 rounded bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
              >
                {config.label} · {diff.type === 'size' ? '尺寸' : diff.type === 'position' ? '位置' : diff.type === 'color' ? '颜色' : '文本'}
              </div>
              
              <svg
                className="absolute -right-2 -top-2 h-6 w-6"
                viewBox="0 0 24 24"
                fill={config.borderColor}
              >
                <circle cx="12" cy="12" r="10" />
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  !
                </text>
              </svg>
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div
          className="fixed pointer-events-none z-[1000000]"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="rounded-lg bg-gray-900 px-4 py-3 shadow-xl">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: severityConfig[tooltip.diff.severity].borderColor }}
              />
              <span className="text-sm font-semibold text-white">
                {tooltip.diff.type === 'size' ? '尺寸差异' : tooltip.diff.type === 'position' ? '位置差异' : tooltip.diff.type === 'color' ? '颜色差异' : '文本差异'}
              </span>
            </div>
            
            {tooltip.diff.designValue && (
              <div className="mt-2 text-xs text-gray-300">
                <span className="text-blue-400">设计:</span> {tooltip.diff.designValue}
              </div>
            )}
            
            {tooltip.diff.devValue && (
              <div className="text-xs text-gray-300">
                <span className="text-green-400">开发:</span> {tooltip.diff.devValue}
              </div>
            )}
            
            {tooltip.diff.message && (
              <div className="mt-2 text-xs text-yellow-400">
                {tooltip.diff.message}
              </div>
            )}
            
            <div className="absolute left-1/2 top-full -translate-x-1/2 translate-y-1">
              <div className="border-8 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-highlight {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}
