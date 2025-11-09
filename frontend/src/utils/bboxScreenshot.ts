/**
 * Utility functions for extracting bbox screenshots from page images.
 * Uses canvas API to crop regions from backend-rendered PNG images.
 */

import { pdfToCanvas } from './coords';

export interface BBoxScreenshotOptions {
  pageImageUrl: string;  // URL of full page image from backend
  bboxPdf: [number, number, number, number];  // Bbox in PDF points
  pageWidthPts: number;   // PDF page width in points
  pageHeightPts: number;  // PDF page height in points
  rasterWidthPx: number;  // Backend raster width (300 DPI PNG)
  rasterHeightPx: number; // Backend raster height
  rotation?: 0 | 90 | 180 | 270;  // Page rotation
  padding?: number;  // Optional padding in pixels
}

/**
 * Extract a cropped image from a page image based on PDF bbox coordinates.
 * Returns a blob URL that can be used as img src.
 */
export async function extractBBoxScreenshot(options: BBoxScreenshotOptions): Promise<string> {
  const {
    pageImageUrl,
    bboxPdf,
    pageWidthPts,
    pageHeightPts,
    rasterWidthPx,
    rasterHeightPx,
    rotation = 0,
    padding = 4
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Convert PDF bbox to canvas coordinates
        const renderMeta = {
          pageWidthPts,
          pageHeightPts,
          rasterWidthPx,
          rasterHeightPx,
          rotation,
        };
        
        const canvasBbox = pdfToCanvas(bboxPdf, renderMeta);
        let [cx1, cy1, cx2, cy2] = canvasBbox;
        
        // Ensure coordinates are in correct order
        if (cx1 > cx2) [cx1, cx2] = [cx2, cx1];
        if (cy1 > cy2) [cy1, cy2] = [cy2, cy1];
        
        // Add padding and clamp to image bounds
        cx1 = Math.max(0, Math.floor(cx1 - padding));
        cy1 = Math.max(0, Math.floor(cy1 - padding));
        cx2 = Math.min(rasterWidthPx, Math.ceil(cx2 + padding));
        cy2 = Math.min(rasterHeightPx, Math.ceil(cy2 + padding));
        
        const width = cx2 - cx1;
        const height = cy2 - cy1;
        
        if (width <= 0 || height <= 0) {
          console.error('[extractBBoxScreenshot] Invalid dimensions:', {
            bboxPdf,
            canvasBbox,
            width,
            height,
            rasterWidthPx,
            rasterHeightPx
          });
          reject(new Error(`Invalid bbox dimensions: width=${width}, height=${height}`));
          return;
        }
        
        // Create canvas and extract region
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw cropped region
        ctx.drawImage(
          img,
          cx1, cy1,      // Source x, y
          width, height,  // Source width, height
          0, 0,           // Dest x, y
          width, height   // Dest width, height
        );
        
        // Convert to blob URL
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const url = URL.createObjectURL(blob);
          resolve(url);
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load page image'));
    };
    
    img.crossOrigin = 'anonymous';  // Enable CORS if needed
    img.src = pageImageUrl;
  });
}

/**
 * Cache for bbox screenshots to avoid repeated cropping.
 */
const screenshotCache = new Map<string, string>();

/**
 * Generate a cache key for a bbox screenshot.
 */
function getCacheKey(scopeId: string, entityId: string): string {
  return `${scopeId}:${entityId}`;
}

/**
 * Extract bbox screenshot with caching.
 */
export async function extractBBoxScreenshotCached(
  scopeId: string,
  entityId: string,
  options: BBoxScreenshotOptions
): Promise<string> {
  const key = getCacheKey(scopeId, entityId);
  
  if (screenshotCache.has(key)) {
    return screenshotCache.get(key)!;
  }
  
  const url = await extractBBoxScreenshot(options);
  screenshotCache.set(key, url);
  
  return url;
}

/**
 * Clear screenshot cache (call when leaving scope editor).
 */
export function clearScreenshotCache(): void {
  // Revoke all blob URLs to free memory
  for (const url of screenshotCache.values()) {
    URL.revokeObjectURL(url);
  }
  screenshotCache.clear();
}

/**
 * Clear specific screenshot from cache.
 */
export function clearScreenshot(scopeId: string, entityId: string): void {
  const key = getCacheKey(scopeId, entityId);
  const url = screenshotCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    screenshotCache.delete(key);
  }
}

