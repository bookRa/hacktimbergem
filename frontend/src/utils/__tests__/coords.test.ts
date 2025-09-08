import { describe, it, expect } from 'vitest';
import { canvasToPdf, pdfToCanvas, roundtripCanvasPdfCanvas, approxEqualBoxes, RenderMeta } from '../../utils/coords';

const meta = (over: Partial<RenderMeta> = {}): RenderMeta => ({
    pageWidthPts: 1000,
    pageHeightPts: 500,
    rasterWidthPx: 2000,
    rasterHeightPx: 1000,
    rotation: 0,
    ...over,
});

describe('coords helpers', () => {
    it('roundtrip identity no rotation', () => {
        const m = meta();
        const box: [number, number, number, number] = [100, 50, 400, 300];
        const rt = roundtripCanvasPdfCanvas(box, m);
        expect(approxEqualBoxes(box, rt)).toBe(true);
    });

    it('pdf->canvas->pdf consistency', () => {
        const m = meta({ pageWidthPts: 100, pageHeightPts: 100, rasterWidthPx: 300, rasterHeightPx: 300 });
        const pdfBox: [number, number, number, number] = [10, 20, 40, 60];
        const canvasBox = pdfToCanvas(pdfBox, m);
        const backPdf = canvasToPdf(canvasBox, m);
        expect(approxEqualBoxes(pdfBox, backPdf)).toBe(true);
    });

    it('rotation 90 roundtrip', () => {
        const m = meta({ pageWidthPts: 200, pageHeightPts: 100, rasterWidthPx: 400, rasterHeightPx: 200, rotation: 90 });
        const canvasBox: [number, number, number, number] = [50, 30, 150, 80];
        const pdfBox = canvasToPdf(canvasBox, m);
        const backCanvas = pdfToCanvas(pdfBox, m);
        const rt = roundtripCanvasPdfCanvas(canvasBox, m);
        expect(approxEqualBoxes(rt, backCanvas)).toBe(true);
    });

    it('clamping beyond bounds', () => {
        const m = meta({ pageWidthPts: 100, pageHeightPts: 100, rasterWidthPx: 200, rasterHeightPx: 200 });
        const canvasBox: [number, number, number, number] = [-50, -10, 500, 400];
        const pdfBox = canvasToPdf(canvasBox, m);
        pdfBox.forEach(v => expect(v).toBeGreaterThanOrEqual(-0.51));
        pdfBox.forEach(v => expect(v).toBeLessThanOrEqual(100.51));
    });

    it('non uniform scale roundtrip', () => {
        const m = meta({ pageWidthPts: 100, pageHeightPts: 200, rasterWidthPx: 400, rasterHeightPx: 600 });
        const canvasBox: [number, number, number, number] = [40, 120, 200, 480];
        const pdfBox = canvasToPdf(canvasBox, m);
        const backCanvas = pdfToCanvas(pdfBox, m);
        const rt = roundtripCanvasPdfCanvas(canvasBox, m);
        expect(approxEqualBoxes(rt, backCanvas)).toBe(true);
    });
});
