import React from 'react';
import { useProjectStore } from '../../state/store';
import { extractBBoxScreenshotCached } from '../../utils/bboxScreenshot';

interface EntityThumbnailProps {
  entity: any;
}

export const EntityThumbnail: React.FC<EntityThumbnailProps> = ({ entity }) => {
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const { projectId, pageImages, pageOcr, fetchPageImage, fetchPageOcr } = useProjectStore((s: any) => ({
    projectId: s.projectId,
    pageImages: s.pageImages,
    pageOcr: s.pageOcr,
    fetchPageImage: s.fetchPageImage,
    fetchPageOcr: s.fetchPageOcr,
  }));

  React.useEffect(() => {
    let cancelled = false;

    const loadThumbnail = async () => {
      if (!entity.bounding_box || !entity.source_sheet_number) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const pageIndex = entity.source_sheet_number - 1;
        
        // Ensure we have page image and OCR data
        if (!pageImages[pageIndex]) {
          await fetchPageImage(pageIndex);
        }
        if (!pageOcr[pageIndex]) {
          await fetchPageOcr(pageIndex);
        }

        if (cancelled) return;

        const pageImageUrl = pageImages[pageIndex];
        const ocrData = pageOcr[pageIndex];

        if (!pageImageUrl || !ocrData) {
          throw new Error('Missing page data');
        }

        // Extract bbox screenshot
        const url = await extractBBoxScreenshotCached(
          entity.id,  // Use entity id as scope id for caching
          entity.id,
          {
            pageImageUrl,
            bboxPdf: [
              entity.bounding_box.x1,
              entity.bounding_box.y1,
              entity.bounding_box.x2,
              entity.bounding_box.y2,
            ],
            pageWidthPts: ocrData.width_pts,
            pageHeightPts: ocrData.height_pts,
            rasterWidthPx: ocrData.width_px || 0,
            rasterHeightPx: ocrData.height_px || 0,
            rotation: 0,
            padding: 8,
          }
        );

        if (cancelled) return;

        setThumbnailUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('[EntityThumbnail] Error loading thumbnail:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [entity, pageImages, pageOcr, fetchPageImage, fetchPageOcr]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          Unable to load thumbnail
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <img 
        src={thumbnailUrl} 
        alt="Entity thumbnail" 
        style={styles.image}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    aspectRatio: '4 / 3',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loading: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  error: {
    fontSize: '11px',
    color: '#dc2626',
    textAlign: 'center',
    padding: '8px',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
};

