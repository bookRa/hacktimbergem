import React, { useMemo } from 'react';
import { useProjectStore } from '../state/store';
import { pdfToCanvas } from '../utils/coords';

interface Props {
  pageIndex: number;
  scale: number; // effective display scale (already applied to native raster dimensions)
}

export const OcrOverlay: React.FC<Props> = ({ pageIndex, scale }) => {
  const { pageOcr, pagesMeta, showOcr } = useProjectStore(s => ({
    pageOcr: s.pageOcr,
    pagesMeta: s.pagesMeta,
    showOcr: s.showOcr
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
        return (
          <rect key={i} x={cx1} y={cy1} width={cx2 - cx1} height={cy2 - cy1} fill="rgba(255,165,0,0.15)" stroke="rgba(255,140,0,0.9)" strokeWidth={1 / scale} />
        );
      })}
    </svg>
  );
};
