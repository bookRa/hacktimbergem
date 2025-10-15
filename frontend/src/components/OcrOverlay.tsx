import React, { useMemo, useEffect } from 'react';
import { useProjectStore } from '../state/store';
import { useUIV2OCRSelection, useUIV2Actions } from '../state/ui_v2';
import { pdfToCanvas } from '../utils/coords';

interface Props {
    pageIndex: number;
    scale: number; // effective display scale (already applied to native raster dimensions)
}

export const OcrOverlay: React.FC<Props> = ({ pageIndex, scale }) => {
    const { pageOcr, pagesMeta, showOcr, ocrBlockState, hoveredBlock, selectedBlocks, setHoveredBlock, toggleSelectBlock, layers } = useProjectStore(s => ({
        pageOcr: s.pageOcr,
        pagesMeta: s.pagesMeta,
        showOcr: s.showOcr,
        ocrBlockState: (s as any).ocrBlockState || {},
        hoveredBlock: (s as any).hoveredBlock || {},
        selectedBlocks: (s as any).selectedBlocks || {},
        setHoveredBlock: (s as any).setHoveredBlock,
        toggleSelectBlock: (s as any).toggleSelectBlock,
        layers: (s as any).layers,
    }));
    const ocrSelectionMode = useUIV2OCRSelection();
    const { toggleOCRBlock: toggleUIV2OCRBlock } = useUIV2Actions();
    
    // Debug: log OCR selection mode and pointer events state
    useEffect(() => {
        console.log('[OcrOverlay] State update:', {
            active: ocrSelectionMode.active,
            selectedCount: ocrSelectionMode.selectedBlocks.length,
            pageIndex,
            svgPointerEvents: ocrSelectionMode.active ? 'auto' : 'none',
            rectPointerEvents: ocrSelectionMode.active ? 'auto' : 'none'
        });
    }, [ocrSelectionMode.active, ocrSelectionMode.selectedBlocks.length, pageIndex]);
    
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

    if (!layers.ocr || !meta || !renderMeta) return null;

    return (
        <svg 
            data-ui2-overlay-ignore 
            style={{ 
                position: 'absolute', 
                inset: 0,
                // Only capture pointer events when in OCR selection mode
                pointerEvents: ocrSelectionMode.active ? 'auto' : 'none'
            }} 
            width={meta.nativeWidth * scale} 
            height={meta.nativeHeight * scale} 
            viewBox={`0 0 ${meta.nativeWidth} ${meta.nativeHeight}`}
        >
            {blocks.map((b: any, i: number) => {
                const [x1, y1, x2, y2] = b.bbox;
                // Convert PDF points -> raster canvas pixels (unscaled), then rely on outer SVG viewBox scaling
                const [cx1, cy1, cx2, cy2] = pdfToCanvas([x1, y1, x2, y2], renderMeta as any);
                const status = ocrBlockState?.[pageIndex]?.[i]?.status || 'unverified';
                const isHovered = hoveredBlock?.[pageIndex] === i;
                
                // Check if this block is selected in either old or new selection system
                const isSelectedOld = (selectedBlocks?.[pageIndex] || []).includes(i);
                const isSelectedUIV2 = ocrSelectionMode.active && 
                    ocrSelectionMode.selectedBlocks.some(sb => sb.pageIndex === pageIndex && sb.blockIndex === i);
                const isSelected = isSelectedOld || isSelectedUIV2;
                
                // Color mapping
                const colorMap: Record<string, { fill: string; stroke: string; }> = {
                    unverified: { fill: 'rgba(255,165,0,0.15)', stroke: 'rgba(255,140,0,0.9)' },
                    accepted: { fill: 'rgba(16,185,129,0.15)', stroke: 'rgba(5,150,105,0.9)' },
                    flagged: { fill: 'rgba(239,68,68,0.15)', stroke: 'rgba(220,38,38,0.95)' },
                    noise: { fill: 'rgba(107,114,128,0.12)', stroke: 'rgba(107,114,128,0.8)' }
                };
                const c = colorMap[status];
                const strokeWidth = (isSelected ? 2.5 : isHovered ? 2 : 1) / scale;
                const finalStroke = isSelected ? '#2563eb' : isHovered ? c.stroke : c.stroke;
                const finalFill = isSelected ? 'rgba(37,99,235,0.25)' : c.fill;
                
                return (
                    <g key={i}>
                        <rect
                            x={cx1}
                            y={cy1}
                            width={cx2 - cx1}
                            height={cy2 - cy1}
                            fill={finalFill}
                            stroke={finalStroke}
                            strokeWidth={strokeWidth}
                            style={{ 
                                cursor: ocrSelectionMode.active ? 'pointer' : 'default',
                                // Only capture pointer events during OCR selection mode
                                pointerEvents: ocrSelectionMode.active ? 'auto' : 'none'
                            }}
                            onMouseEnter={() => setHoveredBlock(pageIndex, i)}
                            onMouseLeave={() => setHoveredBlock(pageIndex, hoveredBlock?.[pageIndex] === i ? null : hoveredBlock?.[pageIndex] || null)}
                            onPointerDown={(e) => {
                                console.log('[OcrOverlay] ⚠️ POINTER DOWN EVENT CAPTURED', {
                                    pageIndex,
                                    blockIndex: i,
                                    ocrSelectionModeActive: ocrSelectionMode.active,
                                    currentPointerEvents: e.currentTarget.style.pointerEvents,
                                    text: b.text.slice(0, 30)
                                });
                                
                                // This should NEVER fire when ocrSelectionMode.active is false
                                if (!ocrSelectionMode.active) {
                                    console.error('[OcrOverlay] ❌ BUG: Event captured when OCR mode is inactive!');
                                    return; // Don't process
                                }
                                
                                e.stopPropagation();
                                e.preventDefault();
                                
                                // If in OCR selection mode, use the new system
                                if (ocrSelectionMode.active) {
                                    toggleUIV2OCRBlock(pageIndex, i, b.text, [x1, y1, x2, y2]);
                                }
                            }}
                        />
                        {/* Show checkmark for selected blocks in OCR selection mode */}
                        {isSelectedUIV2 && ocrSelectionMode.active && (
                            <g style={{ pointerEvents: 'none' }}>
                                {/* Circle background */}
                                <circle
                                    cx={cx1 + 8 / scale}
                                    cy={cy1 + 8 / scale}
                                    r={6 / scale}
                                    fill="#2563eb"
                                    stroke="white"
                                    strokeWidth={1.5 / scale}
                                />
                                {/* Checkmark */}
                                <path
                                    d={`M ${cx1 + 5.5 / scale} ${cy1 + 8 / scale} L ${cx1 + 7.5 / scale} ${cy1 + 10 / scale} L ${cx1 + 10.5 / scale} ${cy1 + 6 / scale}`}
                                    stroke="white"
                                    strokeWidth={1.5 / scale}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};
