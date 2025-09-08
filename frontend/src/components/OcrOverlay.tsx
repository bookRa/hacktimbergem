import React, { useMemo } from 'react';
import { useProjectStore } from '../state/store';
import { pdfToCanvas } from '../utils/coords';

interface Props {
    pageIndex: number;
    scale: number; // effective display scale (already applied to native raster dimensions)
}

export const OcrOverlay: React.FC<Props> = ({ pageIndex, scale }) => {
    const { pageOcr, pagesMeta, showOcr, ocrBlockState } = useProjectStore(s => ({
        pageOcr: s.pageOcr,
        pagesMeta: s.pagesMeta,
        showOcr: s.showOcr,
        ocrBlockState: (s as any).ocrBlockState || {}
    }));
    const meta = pagesMeta[pageIndex];
    const ocr = pageOcr[pageIndex];
    const blocks = ocr?.blocks || [];
    const renderMeta = useMemo(() => {
        if (!meta) return null;
        // RenderMeta expects page width/height pts and raster width/height px (native 300DPI)
        // OCR JSON provides width_pts/height_pts.
        if (!ocr) return null;
        return {
            pageWidthPts: ocr.width_pts,
            pageHeightPts: ocr.height_pts,
            rasterWidthPx: meta.nativeWidth,
            rasterHeightPx: meta.nativeHeight,
            rotation: 0 as 0
        };
    }, [meta, ocr]);

    if (!showOcr || !meta || !renderMeta) return null;

    return (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={meta.nativeWidth * scale} height={meta.nativeHeight * scale} viewBox={`0 0 ${meta.nativeWidth} ${meta.nativeHeight}`}>
            {blocks.map((b: any, i: number) => {
                const [x1, y1, x2, y2] = b.bbox;
                // Convert PDF points -> raster canvas pixels (unscaled), then rely on outer SVG viewBox scaling
                const [cx1, cy1, cx2, cy2] = pdfToCanvas([x1, y1, x2, y2], renderMeta as any);
                const status = ocrBlockState?.[pageIndex]?.[i]?.status || 'unverified';
                // Color mapping
                const colorMap: Record<string, { fill: string; stroke: string; }> = {
                    unverified: { fill: 'rgba(255,165,0,0.15)', stroke: 'rgba(255,140,0,0.9)' },
                    accepted: { fill: 'rgba(16,185,129,0.15)', stroke: 'rgba(5,150,105,0.9)' },
                    flagged: { fill: 'rgba(239,68,68,0.15)', stroke: 'rgba(220,38,38,0.95)' },
                    noise: { fill: 'rgba(107,114,128,0.12)', stroke: 'rgba(107,114,128,0.8)' }
                };
                const c = colorMap[status];
                return (
                    <rect key={i} x={cx1} y={cy1} width={cx2 - cx1} height={cy2 - cy1} fill={c.fill} stroke={c.stroke} strokeWidth={1 / scale} />
                );
            })}
        </svg>
    );
};
