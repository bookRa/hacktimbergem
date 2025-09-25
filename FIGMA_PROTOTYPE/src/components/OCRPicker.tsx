import { Card } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface OCRBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface OCRPickerProps {
  open?: boolean;
  x?: number;
  y?: number;
  ocrBlocks?: OCRBlock[];
  onSelect?: (block: OCRBlock) => void;
  onClose?: () => void;
}

// Mock OCR data
const mockOCRBlocks: OCRBlock[] = [
  { id: '1', text: 'ELECTRICAL PANEL', x: 50, y: 100, width: 120, height: 20, confidence: 0.95 },
  { id: '2', text: 'MAIN ENTRANCE', x: 200, y: 150, width: 100, height: 18, confidence: 0.92 },
  { id: '3', text: 'FIRE EXIT', x: 350, y: 200, width: 80, height: 16, confidence: 0.89 },
  { id: '4', text: 'EMERGENCY LIGHTING', x: 120, y: 250, width: 140, height: 18, confidence: 0.87 },
  { id: '5', text: 'HVAC SYSTEM', x: 300, y: 300, width: 95, height: 17, confidence: 0.91 },
];

export function OCRPicker({
  open = false,
  x = 0,
  y = 0,
  ocrBlocks = mockOCRBlocks,
  onSelect,
  onClose
}: OCRPickerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* OCR Picker */}
      <Card 
        className="absolute z-50 border"
        style={{
          left: x,
          top: y,
          width: '500px',
          height: '400px',
          backgroundColor: 'var(--timbergem-panel-elevated)',
          borderColor: 'var(--timbergem-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--timbergem-border)' }}>
            <h3 className="heading" style={{ color: 'var(--timbergem-text)' }}>
              Select OCR Text
            </h3>
            <p className="caption mt-1" style={{ color: 'var(--timbergem-muted)' }}>
              Choose text to create scope definition
            </p>
          </div>

          <div className="flex-1 flex">
            {/* OCR Blocks List */}
            <div className="w-1/2 border-r" style={{ borderColor: 'var(--timbergem-border)' }}>
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {ocrBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-3 rounded border cursor-pointer hover:bg-[var(--timbergem-panel)] transition-colors"
                      style={{ 
                        backgroundColor: 'var(--timbergem-bg)',
                        borderColor: 'var(--timbergem-border)'
                      }}
                      onClick={() => {
                        onSelect?.(block);
                        onClose?.();
                      }}
                    >
                      <div className="body" style={{ color: 'var(--timbergem-text)' }}>
                        {block.text}
                      </div>
                      <div 
                        className="caption mt-1" 
                        style={{ color: 'var(--timbergem-muted)' }}
                      >
                        Confidence: {Math.round(block.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Visual Preview */}
            <div className="w-1/2 p-4">
              <div 
                className="w-full h-full relative rounded border"
                style={{ 
                  backgroundColor: 'var(--timbergem-panel)',
                  borderColor: 'var(--timbergem-border)'
                }}
              >
                {/* Mock drawing preview with OCR blocks */}
                <div className="absolute inset-2">
                  {ocrBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="absolute border-2 border-dashed cursor-pointer hover:bg-[var(--timbergem-hover)] hover:bg-opacity-20 transition-colors"
                      style={{
                        left: block.x / 4, // Scale down for preview
                        top: block.y / 4,
                        width: block.width / 4,
                        height: block.height / 4,
                        borderColor: 'var(--timbergem-accent)',
                      }}
                      onClick={() => {
                        onSelect?.(block);
                        onClose?.();
                      }}
                    >
                      <div 
                        className="caption text-xs p-1 bg-[var(--timbergem-accent)] text-[var(--timbergem-accent-contrast)] rounded"
                        style={{ fontSize: '8px' }}
                      >
                        {block.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p 
                className="caption mt-2 text-center" 
                style={{ color: 'var(--timbergem-muted)' }}
              >
                Click on highlighted text blocks to select
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--timbergem-border)' }}>
            <Button 
              variant="ghost"
              onClick={onClose}
              style={{ color: 'var(--timbergem-muted)' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}