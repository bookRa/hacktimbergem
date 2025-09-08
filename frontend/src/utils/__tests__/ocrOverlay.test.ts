import { describe, it, expect } from 'vitest';
import { pdfToCanvas } from '../../utils/coords';

describe('OCR overlay coordinate mapping', () => {
    it('maps pdf bbox to canvas pixels with non-uniform scale', () => {
        const renderMeta = {
            pageWidthPts: 200,
            pageHeightPts: 100,
            rasterWidthPx: 800,
            rasterHeightPx: 400,
            rotation: 0 as 0
        };
        const pdfBox: [number, number, number, number] = [20, 10, 60, 40];
        const canvasBox = pdfToCanvas(pdfBox, renderMeta as any);
        // Expected scaling: x * 4, y * 4
        expect(canvasBox[0]).toBeCloseTo(80, 5);
        expect(canvasBox[1]).toBeCloseTo(40, 5);
        expect(canvasBox[2]).toBeCloseTo(240, 5);
        expect(canvasBox[3]).toBeCloseTo(160, 5);
    });
});
