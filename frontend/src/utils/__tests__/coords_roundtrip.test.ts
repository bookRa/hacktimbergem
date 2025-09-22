import { describe, it, expect } from 'vitest';
import { canvasToPdf, pdfToCanvas } from '../coords';

describe('coords roundtrip', () => {
  const meta = {
    pageWidthPts: 612,
    pageHeightPts: 792,
    rasterWidthPx: 2550, // 8.5in * 300dpi
    rasterHeightPx: 3300, // 11in * 300dpi
    rotation: 0 as const,
  };

  it('canvas->pdf->canvas ~= identity (within small epsilon)', () => {
    const canvasBox: [number, number, number, number] = [100, 200, 400, 500];
    const pdfBox = canvasToPdf(canvasBox, meta as any);
    const back = pdfToCanvas(pdfBox, meta as any);
    const eps = 1e-4;
    expect(Math.abs(canvasBox[0] - back[0]) < eps).toBe(true);
    expect(Math.abs(canvasBox[1] - back[1]) < eps).toBe(true);
    expect(Math.abs(canvasBox[2] - back[2]) < eps).toBe(true);
    expect(Math.abs(canvasBox[3] - back[3]) < eps).toBe(true);
  });
});


