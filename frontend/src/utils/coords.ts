// Coordinate conversion utilities mirroring backend/app/coords.py
// All persisted boxes live in unrotated PDF point space. Canvas space here refers to
// the rasterized PNG pixel grid (CSS pixels). Device pixel ratio scaling is handled
// by callers (pass coordinates already divided by DPR).

export interface RenderMeta {
    pageWidthPts: number;
    pageHeightPts: number;
    rasterWidthPx: number;
    rasterHeightPx: number;
    rotation?: 0 | 90 | 180 | 270;
}

export type Box = [number, number, number, number];

function normalizeBox(box: Box): Box {
    let [x1, y1, x2, y2] = box.map(Number) as Box;
    if (Number.isNaN(x1 + y1 + x2 + y2)) throw new Error("Box contains NaN");
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];
    return [x1, y1, x2, y2];
}

function clampPdfBox(box: Box, meta: RenderMeta, epsilon = 0.5): Box {
    let [x1, y1, x2, y2] = box;
    x1 = Math.max(-epsilon, Math.min(meta.pageWidthPts + epsilon, x1));
    x2 = Math.max(-epsilon, Math.min(meta.pageWidthPts + epsilon, x2));
    y1 = Math.max(-epsilon, Math.min(meta.pageHeightPts + epsilon, y1));
    y2 = Math.max(-epsilon, Math.min(meta.pageHeightPts + epsilon, y2));
    return normalizeBox([x1, y1, x2, y2]);
}

export function canvasToPdf(box: Box, meta: RenderMeta, dpr = 1): Box {
    const rotation = meta.rotation ?? 0;
    if (![0, 90, 180, 270].includes(rotation)) throw new Error("Unsupported rotation");
    const [cx1, cy1, cx2, cy2] = normalizeBox(box);
    const rw = meta.rasterWidthPx;
    const rh = meta.rasterHeightPx;

    function unrotate(x: number, y: number): [number, number] {
        switch (rotation) {
            case 0:
                return [x, y];
            case 90:
                return [y, rw - x];
            case 180:
                return [rw - x, rh - y];
            case 270:
                return [rh - y, x];
            default:
                return [x, y];
        }
    }

    let [ux1, uy1] = unrotate(cx1, cy1);
    let [ux2, uy2] = unrotate(cx2, cy2);
    [ux1, uy1, ux2, uy2] = normalizeBox([ux1, uy1, ux2, uy2]);

    const scaleX = meta.rasterWidthPx / meta.pageWidthPts;
    const scaleY = meta.rasterHeightPx / meta.pageHeightPts;
    const px1 = ux1 / scaleX;
    const py1 = uy1 / scaleY;
    const px2 = ux2 / scaleX;
    const py2 = uy2 / scaleY;
    return clampPdfBox(normalizeBox([px1, py1, px2, py2]), meta);
}

export function pdfToCanvas(box: Box, meta: RenderMeta, dpr = 1): Box {
    const rotation = meta.rotation ?? 0;
    if (![0, 90, 180, 270].includes(rotation)) throw new Error("Unsupported rotation");
    let [px1, py1, px2, py2] = normalizeBox(box);
    [px1, py1, px2, py2] = clampPdfBox([px1, py1, px2, py2], meta);

    const scaleX = meta.rasterWidthPx / meta.pageWidthPts;
    const scaleY = meta.rasterHeightPx / meta.pageHeightPts;
    let ux1 = px1 * scaleX;
    let uy1 = py1 * scaleY;
    let ux2 = px2 * scaleX;
    let uy2 = py2 * scaleY;
    [ux1, uy1, ux2, uy2] = normalizeBox([ux1, uy1, ux2, uy2]);
    const rw = meta.rasterWidthPx;
    const rh = meta.rasterHeightPx;

    function rotate(x: number, y: number): [number, number] {
        switch (rotation) {
            case 0:
                return [x, y];
            case 90:
                return [rw - y, x];
            case 180:
                return [rw - x, rh - y];
            case 270:
                return [y, rh - x];
            default:
                return [x, y];
        }
    }

    const [cx1, cy1] = rotate(ux1, uy1);
    const [cx2, cy2] = rotate(ux2, uy2);
    return normalizeBox([cx1, cy1, cx2, cy2]);
}

export function roundtripCanvasPdfCanvas(box: Box, meta: RenderMeta, dpr = 1): Box {
    return pdfToCanvas(canvasToPdf(box, meta, dpr), meta, dpr);
}

export function approxEqualBoxes(a: Box, b: Box, eps = 1e-6): boolean {
    return a.every((v, i) => Math.abs(v - b[i]) < eps);
}
