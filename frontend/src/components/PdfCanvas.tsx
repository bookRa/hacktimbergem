import React, { useEffect, useRef } from 'react';
import { useProjectStore, ProjectStore } from '../state/store';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// Configure worker (expects pdf.worker.mjs resolved by bundler). If path changes adjust here.
GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export const PdfCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { pdfDoc, currentPageIndex, setPageViewportMeta } = useProjectStore((s: ProjectStore) => ({
        pdfDoc: s.pdfDoc,
        currentPageIndex: s.currentPageIndex,
        setPageViewportMeta: s.setPageViewportMeta
    }));

    useEffect(() => {
        if (!pdfDoc) return;
        (async () => {
            const page = await pdfDoc.getPage(currentPageIndex + 1);
            const dpi = 300; // 300 DPI target
            const scale = dpi / 72; // PDF points to pixels
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d')!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const renderContext = { canvasContext: ctx, viewport } as any;
            await page.render(renderContext).promise;
            setPageViewportMeta(currentPageIndex, {
                width: viewport.width,
                height: viewport.height,
                scaleX: viewport.width / page.view[2],
                scaleY: viewport.height / page.view[3]
            });
        })();
    }, [pdfDoc, currentPageIndex, setPageViewportMeta]);

    if (!pdfDoc) return null;

    return (
        <div className="pdf-canvas-wrapper">
            <canvas ref={canvasRef} className="pdf-canvas" />
            {/* TODO: overlay layer for annotations / bounding boxes */}
        </div>
    );
};
