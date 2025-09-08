"""Coordinate conversion utilities between frontend canvas space and PDF (PyMuPDF) point space.

All persisted bounding boxes are stored in un-rotated PDF point space (origin top-left, y down).
Canvas space is the raster image that the frontend displays (PNG produced at rendering time)
optionally scaled further by CSS zoom / transform and affected by device pixel ratio (dpr).

We keep a simple dataclass-style set of helpers rather than introducing dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple, Sequence

NumberBox = Tuple[float, float, float, float]


@dataclass(frozen=True)
class RenderMeta:
    page_width_pts: float
    page_height_pts: float
    raster_width_px: int
    raster_height_px: int
    rotation: int = 0  # degrees, expected in {0, 90, 180, 270}

    @property
    def scale_x(self) -> float:
        return self.raster_width_px / self.page_width_pts

    @property
    def scale_y(self) -> float:
        return self.raster_height_px / self.page_height_pts


def _normalize_box(box: Sequence[float]) -> NumberBox:
    if len(box) != 4:
        raise ValueError("Box must have 4 numbers (x1,y1,x2,y2)")
    x1, y1, x2, y2 = [float(v) for v in box]
    if any(v != v for v in (x1, y1, x2, y2)):  # NaN check
        raise ValueError("Box contains NaN")
    if any(abs(v) > 1e8 for v in (x1, y1, x2, y2)):
        raise ValueError("Unreasonable coordinate magnitude")
    if x1 > x2:
        x1, x2 = x2, x1
    if y1 > y2:
        y1, y2 = y2, y1
    return (x1, y1, x2, y2)


def _clamp_pdf_box(box: NumberBox, meta: RenderMeta, epsilon: float = 0.5) -> NumberBox:
    x1, y1, x2, y2 = box
    x1 = max(-epsilon, min(meta.page_width_pts + epsilon, x1))
    x2 = max(-epsilon, min(meta.page_width_pts + epsilon, x2))
    y1 = max(-epsilon, min(meta.page_height_pts + epsilon, y1))
    y2 = max(-epsilon, min(meta.page_height_pts + epsilon, y2))
    return _normalize_box((x1, y1, x2, y2))


def canvas_to_pdf(
    box: Sequence[float], meta: RenderMeta, dpr: float = 1.0
) -> NumberBox:
    """Convert a canvas-space box (CSS pixel space coordinates) into un-rotated PDF point space.

    Args:
        box: (cx1, cy1, cx2, cy2) in canvas CSS pixel coordinates (after dividing raw device pixels by dpr).
        meta: RenderMeta describing the rendered raster.
        dpr: device pixel ratio used by the browser when measuring raw events. We assume
             caller already divided by dpr; this is here for future adjustments.
    """
    cx1, cy1, cx2, cy2 = _normalize_box(box)

    # Undo page rotation first to map canvas coordinates back to un-rotated raster orientation.
    if meta.rotation not in (0, 90, 180, 270):
        raise ValueError("Unsupported rotation")

    rw, rh = meta.raster_width_px, meta.raster_height_px

    def unrotate(x: float, y: float) -> Tuple[float, float]:
        if meta.rotation == 0:
            return x, y
        if meta.rotation == 90:
            return y, rw - x
        if meta.rotation == 180:
            return rw - x, rh - y
        if meta.rotation == 270:
            return rh - y, x
        raise AssertionError

    ux1, uy1 = unrotate(cx1, cy1)
    ux2, uy2 = unrotate(cx2, cy2)
    ux1, uy1, ux2, uy2 = _normalize_box((ux1, uy1, ux2, uy2))

    # Map un-rotated raster pixels -> PDF points.
    px1 = ux1 / meta.scale_x
    py1 = uy1 / meta.scale_y
    px2 = ux2 / meta.scale_x
    py2 = uy2 / meta.scale_y
    pdf_box = _normalize_box((px1, py1, px2, py2))
    return _clamp_pdf_box(pdf_box, meta)


def pdf_to_canvas(
    box: Sequence[float], meta: RenderMeta, dpr: float = 1.0
) -> NumberBox:
    """Convert a PDF point-space box (un-rotated) into canvas CSS pixel coordinates.

    Returned box is in unscaled CSS pixel units (caller may further multiply by dpr for actual device pixels).
    """
    px1, py1, px2, py2 = _normalize_box(box)
    # Clamp early to avoid projecting far-out coords.
    clamped = _clamp_pdf_box((px1, py1, px2, py2), meta)
    px1, py1, px2, py2 = clamped

    ux1 = px1 * meta.scale_x
    uy1 = py1 * meta.scale_y
    ux2 = px2 * meta.scale_x
    uy2 = py2 * meta.scale_y
    ux1, uy1, ux2, uy2 = _normalize_box((ux1, uy1, ux2, uy2))

    rw, rh = meta.raster_width_px, meta.raster_height_px

    def rotate(x: float, y: float) -> Tuple[float, float]:
        if meta.rotation == 0:
            return x, y
        if meta.rotation == 90:
            return rw - y, x
        if meta.rotation == 180:
            return rw - x, rh - y
        if meta.rotation == 270:
            return y, rh - x
        raise AssertionError

    cx1, cy1 = rotate(ux1, uy1)
    cx2, cy2 = rotate(ux2, uy2)
    return _normalize_box((cx1, cy1, cx2, cy2))


def roundtrip_canvas_pdf_canvas(
    box: Sequence[float], meta: RenderMeta, dpr: float = 1.0
) -> NumberBox:
    return pdf_to_canvas(canvas_to_pdf(box, meta, dpr=dpr), meta, dpr=dpr)


__all__ = [
    "RenderMeta",
    "canvas_to_pdf",
    "pdf_to_canvas",
    "roundtrip_canvas_pdf_canvas",
]
