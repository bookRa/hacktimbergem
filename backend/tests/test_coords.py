from backend.app.coords import (
    RenderMeta,
    canvas_to_pdf,
    pdf_to_canvas,
    roundtrip_canvas_pdf_canvas,
)


def test_roundtrip_identity_no_rotation():
    meta = RenderMeta(
        page_width_pts=1000,
        page_height_pts=500,
        raster_width_px=2000,
        raster_height_px=1000,
        rotation=0,
    )
    canvas_box = (100, 50, 400, 300)
    rt = roundtrip_canvas_pdf_canvas(canvas_box, meta)
    # Expect near exact (floating point drift allowed)
    assert all(abs(a - b) < 1e-6 for a, b in zip(canvas_box, rt))


def test_pdf_canvas_consistency():
    meta = RenderMeta(
        page_width_pts=100,
        page_height_pts=100,
        raster_width_px=300,
        raster_height_px=300,
        rotation=0,
    )
    pdf_box = (10, 20, 40, 60)
    canvas_box = pdf_to_canvas(pdf_box, meta)
    back_pdf = canvas_to_pdf(canvas_box, meta)
    assert all(abs(a - b) < 1e-6 for a, b in zip(pdf_box, back_pdf))


def test_rotation_90_roundtrip():
    meta = RenderMeta(
        page_width_pts=200,
        page_height_pts=100,
        raster_width_px=400,
        raster_height_px=200,
        rotation=90,
    )
    # Canvas box in rotated space
    canvas_box = (50, 30, 150, 80)
    pdf_box = canvas_to_pdf(canvas_box, meta)
    back_canvas = pdf_to_canvas(pdf_box, meta)
    assert all(
        abs(a - b) < 1e-6
        for a, b in zip(roundtrip_canvas_pdf_canvas(canvas_box, meta), back_canvas)
    )


def test_clamping():
    meta = RenderMeta(
        page_width_pts=100,
        page_height_pts=100,
        raster_width_px=200,
        raster_height_px=200,
        rotation=0,
    )
    # Canvas beyond bounds
    canvas_box = (-50, -10, 500, 400)
    pdf_box = canvas_to_pdf(canvas_box, meta)
    # All coords should now be within [-0.5, 100.5]
    assert all(-0.51 <= v <= 100.51 for v in pdf_box)


def test_non_uniform_scale_roundtrip():
    # Non-uniform scaling (rare but possible if aspect changed)
    meta = RenderMeta(
        page_width_pts=100,
        page_height_pts=200,
        raster_width_px=400,
        raster_height_px=600,
        rotation=0,
    )
    canvas_box = (40, 120, 200, 480)
    pdf_box = canvas_to_pdf(canvas_box, meta)
    back_canvas = pdf_to_canvas(pdf_box, meta)
    assert all(
        abs(a - b) < 1e-6
        for a, b in zip(roundtrip_canvas_pdf_canvas(canvas_box, meta), back_canvas)
    )
