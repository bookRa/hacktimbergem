import { useEffect, useState, useMemo } from 'react';
import '../theme/tokens.css';
import { TGCard } from '../../ui_primitives/card';
import { TGButton } from '../../ui_primitives/button';
import { TGInput } from '../../ui_primitives/input';
import { TGSelect } from '../../ui_primitives/select';
import { SemanticMeaningInput } from './SemanticMeaningInput';
import { cx } from '../utils/classNames';

export type FormVariant =
  | 'DrawingForm'
  | 'LegendForm'
  | 'ScheduleForm'
  | 'AssemblyGroupForm'
  | 'ScopeForm'
  | 'NoteForm'
  | 'SymbolDefinitionForm'
  | 'ComponentDefinitionForm'
  | 'SymbolInstanceForm'
  | 'ComponentInstanceForm';

interface InlineEntityFormProps {
  variant: FormVariant;
  open?: boolean;
  x?: number;
  y?: number;
  onSave?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  onCreateFromOCR?: () => void;
  onApplyOCRSelection?: () => void;
  ocrSelectionCount?: number;
  ocrTextToMerge?: string | null; // OCR text to merge into current formData without resetting
  initialValues?: Record<string, unknown> | null;
  mode?: 'create' | 'edit';
  minimized?: boolean;
  symbolDefinitionOptions?: { label: string; value: string }[];
  componentDefinitionOptions?: { label: string; value: string }[];
  onRequestDefinition?: (draft: Record<string, unknown>) => void;
  onRequestComponentDefinition?: (draft: Record<string, unknown>) => void;
  onDefinitionCreated?: (definitionId: string, definitionName: string) => void;
}

const PlusIcon = () => (
  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M6 2v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const SparkIcon = () => (
  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M6 1.5 6.8 4h2.7L7.8 5.7 8.6 8.2 6 6.6 3.4 8.2 4.2 5.7 2.5 4h2.7L6 1.5Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

const symbolScopeOptions = [
  { label: 'Sheet', value: 'sheet' },
  { label: 'Project', value: 'project' },
];

export function InlineEntityForm({
  variant,
  open = false,
  x = 0,
  y = 0,
  onSave,
  onCancel,
  onCreateFromOCR,
  onApplyOCRSelection,
  ocrSelectionCount = 0,
  ocrTextToMerge = null,
  initialValues = null,
  mode = 'create',
  minimized = false,
  symbolDefinitionOptions,
  componentDefinitionOptions,
  onRequestDefinition,
  onRequestComponentDefinition,
  onDefinitionCreated,
}: InlineEntityFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showDefinitionForm, setShowDefinitionForm] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormData({});
      setShowDefinitionForm(false);
      return;
    }
    setFormData(() => ({ ...(initialValues ?? {}) }));
  }, [open, variant, initialValues]);

  // Merge OCR text into existing formData without resetting other fields
  useEffect(() => {
    if (ocrTextToMerge && open) {
      // Determine which field to update based on variant
      let fieldName = 'recognizedText'; // Default for Symbol/Component instances
      if (variant === 'NoteForm') {
        fieldName = 'text';
      }
      
      setFormData((prev) => ({
        ...prev,
        [fieldName]: ocrTextToMerge,
      }));
      
      console.log(`[InlineEntityForm] OCR text merged into ${fieldName} field:`, ocrTextToMerge);
    }
  }, [ocrTextToMerge, open, variant]);

  // Add escape key handler to close form
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  // Calculate safe position within viewport
  const safePosition = useMemo(() => {
    const FORM_WIDTH = 320;
    const FORM_HEIGHT = 500; // approximate max height
    const PADDING = 16;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Clamp x to keep form within viewport horizontally
    let safeX = Math.max(PADDING, Math.min(x, viewportWidth - FORM_WIDTH - PADDING));
    
    // Clamp y to keep form within viewport vertically
    let safeY = Math.max(PADDING, Math.min(y, viewportHeight - FORM_HEIGHT - PADDING));
    
    return { x: safeX, y: safeY };
  }, [x, y]);

  if (!open) return null;

  const updateField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const renderTextField = (label: string, fieldKey: string, placeholder: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>{label}</label>
      <TGInput
        placeholder={placeholder}
        value={(formData[fieldKey] as string) ?? ''}
        onChange={(event) => updateField(fieldKey, event.target.value)}
      />
    </div>
  );

  const renderTextarea = (label: string, fieldKey: string, placeholder: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>{label}</label>
      <textarea
        className="tg-ui2"
        placeholder={placeholder}
        value={(formData[fieldKey] as string) ?? ''}
        onChange={(event) => updateField(fieldKey, event.target.value)}
        style={{
          minHeight: '80px',
          resize: 'vertical',
          borderRadius: 'var(--tg-radius-sm)',
          border: '1px solid var(--tg-border)',
          padding: '8px 10px',
          backgroundColor: 'var(--tg-panel)',
          color: 'var(--tg-text)',
          fontSize: 'var(--tg-font-sm)',
        }}
      />
    </div>
  );

  const renderDrawingForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Title', 'title', 'Enter drawing title...')}
      {renderTextarea('Description', 'description', 'Enter description...')}
    </div>
  );

  const renderSymbolInstanceForm = () => {
    const definitionOptions = symbolDefinitionOptions && symbolDefinitionOptions.length > 0
      ? symbolDefinitionOptions
      : [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>Visual Definition</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <TGSelect
              value={(formData.symbolDefinitionId as string) ?? ''}
              onValueChange={(value) => updateField('symbolDefinitionId', value)}
              options={definitionOptions.length ? definitionOptions : [{ label: 'No definitions available', value: '' }]}
              placeholder="Select definition..."
              disabled={!definitionOptions.length}
            />
            <TGButton
              variant="outline"
              size="sm"
              style={{ paddingInline: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                onRequestDefinition?.(formData);
              }}
            >
              <PlusIcon />
              New
            </TGButton>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>Semantic Meaning</label>
          <SemanticMeaningInput
            value={(formData.recognizedText as string) ?? ''}
            onChange={(value) => updateField('recognizedText', value)}
            onRequestOCRSelection={() => onCreateFromOCR?.()}
          />
        </div>
      </div>
    );
  };

  const renderScopeForm = () => {
    const isConceptual = !formData.bounding_box || !formData.source_sheet_number;
    const isEdit = mode === 'edit';
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Scope Type Indicator */}
        {isEdit && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 'var(--tg-radius-sm)',
            fontSize: 'var(--tg-font-xs)',
            backgroundColor: isConceptual ? 'var(--tg-info)' : 'var(--tg-success)',
            color: isConceptual ? 'var(--tg-info-contrast)' : 'var(--tg-success-contrast)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>{isConceptual ? '💭' : '📍'}</span>
            <span>{isConceptual ? 'Conceptual Scope (Project-level)' : 'Canvas Scope (Sheet-specific)'}</span>
          </div>
        )}
        
        {renderTextField('Name', 'name', 'Enter scope name...')}
        {renderTextarea('Description', 'description', 'Enter scope description...')}
        
        {/* Location Management - only in edit mode */}
        {isEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--tg-border)' }}>
            <div style={{ fontSize: 'var(--tg-font-xs)', color: 'var(--tg-muted)', fontWeight: 500 }}>
              Canvas Location
            </div>
            {isConceptual ? (
              <TGButton
                variant="outline"
                onClick={async () => {
                  const scopeId = formData.id as string;
                  if (!scopeId) return;
                  
                  // Import dynamically to access store
                  const { useProjectStore } = await import('../../state/store');
                  const startAddingScopeLocation = useProjectStore.getState().startAddingScopeLocation;
                  
                  // Start drawing mode for adding location to this scope
                  startAddingScopeLocation(scopeId);
                  
                  // Close form so user can draw on canvas
                  onCancel?.();
                }}
                style={{ fontSize: 'var(--tg-font-sm)' }}
              >
                📍 + Add Canvas Location
              </TGButton>
            ) : (
              <TGButton
                variant="outline"
                onClick={async () => {
                  const scopeId = formData.id as string;
                  if (!scopeId) return;
                  
                  // Import dynamically to access store
                  const { useProjectStore } = await import('../../state/store');
                  const removeScopeLocation = useProjectStore.getState().removeScopeLocation;
                  
                  await removeScopeLocation(scopeId);
                  
                  // Close form to refresh
                  onCancel?.();
                }}
                style={{ fontSize: 'var(--tg-font-sm)' }}
              >
                🗑️ Remove Canvas Location
              </TGButton>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderNoteForm = () => {
    const handleLoadOCR = async () => {
      try {
        // Get both stores
        const { useUIV2Store } = await import('../../state/ui_v2');
        const { useProjectStore } = await import('../../state/store');
        
        const uiStore = useUIV2Store.getState();
        const projectStore = useProjectStore.getState();
        
        // Try to get pendingBBox from UI V2 store
        const inlineFormState = uiStore.inlineForm;
        const pendingBBox = inlineFormState.pendingBBox;
        
        console.log('[Note OCR] Auto-load triggered', {
          hasPendingBBox: !!pendingBBox,
          pendingBBox,
          currentPageIndex: projectStore.currentPageIndex,
        });
        
        if (!pendingBBox || !pendingBBox.bboxPdf) {
          console.warn('[Note OCR] No pending bbox available, falling back to manual selection');
          // Fallback to manual OCR selection
          if (onCreateFromOCR) {
            onCreateFromOCR();
          }
          return;
        }
        
        const currentPageIndex = projectStore.currentPageIndex;
        const bbox = pendingBBox.bboxPdf as [number, number, number, number];
        
        console.log('[Note OCR] Attempting auto-detection', {
          pageIndex: currentPageIndex,
          bbox,
          bboxArea: (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]),
        });
        
        // Find OCR blocks within the note's bbox
        const blocks = projectStore.getOCRBlocksInBBox(currentPageIndex, bbox);
        
        console.log('[Note OCR] Auto-detection result:', {
          blocksFound: blocks.length,
          blocks: blocks.map(b => ({ text: b.text.substring(0, 50), bbox: b.bbox })),
        });
        
        if (blocks.length === 0) {
          console.log('[Note OCR] No OCR blocks found, falling back to manual selection');
          projectStore.addToast({ 
            kind: 'info', 
            message: 'No OCR found in this area. Click blocks manually to select them.' 
          });
          // Fallback to manual OCR selection
          if (onCreateFromOCR) {
            onCreateFromOCR();
          }
          return;
        }
        
        // Concatenate all OCR blocks with line breaks (notes are multi-line)
        const concatenatedText = blocks
          .map(b => b.text)
          .join('\n');
        
        console.log('[Note OCR] Auto-populated text field:', concatenatedText);
        
        // Update the text field
        updateField('text', concatenatedText);
        
        projectStore.addToast({ 
          kind: 'success', 
          message: `Loaded ${blocks.length} OCR block${blocks.length > 1 ? 's' : ''}` 
        });
      } catch (error) {
        console.error('[Note OCR] Error loading OCR:', error);
      }
    };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {renderTextarea('Note', 'text', 'Enter note text...')}
        
        <TGButton
          variant="outline"
          onClick={handleLoadOCR}
          style={{ fontSize: 'var(--tg-font-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📄 Load OCR from Canvas
        </TGButton>
      </div>
    );
  };

  const renderSymbolDefinitionForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Name', 'name', 'Enter symbol name...')}
      {renderTextarea('Description', 'description', 'Describe the symbol...')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>Scope</label>
        <TGSelect
          value={(formData.scope as string) ?? 'sheet'}
          onValueChange={(value) => updateField('scope', value)}
          options={symbolScopeOptions}
          placeholder="Select scope"
        />
      </div>
      {renderTextarea('Visual Pattern Notes', 'visualPatternDescription', 'Describe the pattern/usage...')}
    </div>
  );

  const renderLegendForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Title', 'title', 'Enter legend title...')}
      {renderTextarea('Notes', 'notes', 'Add notes about this legend...')}
    </div>
  );

  const renderScheduleForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Title', 'title', 'Enter schedule title...')}
      {renderTextField('Schedule Type', 'scheduleType', 'e.g., door, window, finish...')}
      {renderTextarea('Notes', 'notes', 'Add notes about this schedule...')}
    </div>
  );

  const renderAssemblyGroupForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Title', 'title', 'Enter assembly group title...')}
      {renderTextarea('Notes', 'notes', 'Add notes about this assembly group...')}
    </div>
  );

  const renderComponentDefinitionForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Name', 'name', 'Enter component name...')}
      {renderTextarea('Description', 'description', 'Describe the component...')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>Scope</label>
        <TGSelect
          value={(formData.scope as string) ?? 'sheet'}
          onValueChange={(value) => updateField('scope', value)}
          options={symbolScopeOptions}
          placeholder="Select scope"
        />
      </div>
      {renderTextarea('Specifications (JSON)', 'specifications', 'Enter specifications as JSON...')}
    </div>
  );

  const renderComponentInstanceForm = () => {
    const definitionOptions = componentDefinitionOptions && componentDefinitionOptions.length > 0
      ? componentDefinitionOptions
      : [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>Component Definition</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <TGSelect
              value={(formData.componentDefinitionId as string) ?? ''}
              onValueChange={(value) => updateField('componentDefinitionId', value)}
              options={definitionOptions.length ? definitionOptions : [{ label: 'No definitions available', value: '' }]}
              placeholder="Select definition..."
              disabled={!definitionOptions.length}
            />
            <TGButton
              variant="outline"
              size="sm"
              style={{ paddingInline: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => {
                onRequestComponentDefinition?.(formData);
              }}
            >
              <PlusIcon />
              New
            </TGButton>
          </div>
        </div>
      </div>
    );
  };

  const getIncompleteText = () => {
    switch (variant) {
      case 'SymbolInstanceForm':
        return 'Needs visual definition and semantic meaning to be complete';
      case 'ComponentInstanceForm':
        return 'Needs component definition to be complete';
      case 'ScopeForm':
        return 'Needs name and description to be complete';
      case 'NoteForm':
        return 'Needs text content to be complete';
      case 'SymbolDefinitionForm':
        return 'Needs name to be complete';
      case 'ComponentDefinitionForm':
        return 'Needs name to be complete';
      case 'LegendForm':
        return 'Needs title to be complete';
      case 'ScheduleForm':
        return 'Needs title to be complete';
      case 'AssemblyGroupForm':
        return 'Needs title to be complete';
      case 'DrawingForm':
        return 'Needs title to be complete';
      default:
        return '';
    }
  };

  const actionLabel = mode === 'edit' ? 'Update' : 'Save';

  // If minimized, show compact pill instead of full form
  if (minimized && open) {
    return (
      <div
        className="tg-ui2"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 60,
          background: 'var(--tg-accent)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
          fontSize: 'var(--tg-font-sm)',
          fontWeight: 500,
          pointerEvents: 'auto', // Ensure buttons remain clickable even when parent overlay has pointerEvents: none
        }}
      >
        <span>Selecting OCR • {ocrSelectionCount} block{ocrSelectionCount !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <TGButton
            variant="ghost"
            size="sm"
            onClick={onApplyOCRSelection}
            disabled={ocrSelectionCount === 0}
            style={{
              background: ocrSelectionCount === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
              color: ocrSelectionCount === 0 ? 'rgba(255, 255, 255, 0.5)' : 'var(--tg-accent)',
              border: 'none',
              fontSize: 'var(--tg-font-xs)',
              padding: '4px 12px',
              fontWeight: 600,
              cursor: ocrSelectionCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Apply
          </TGButton>
          <TGButton
            variant="ghost"
            size="sm"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              fontSize: 'var(--tg-font-xs)',
              padding: '4px 10px',
            }}
          >
            Cancel
          </TGButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop removed - OverlayLayer handles outside clicks */}

      <TGCard
        data-ui2-overlay-ignore
        className={cx('tg-ui2')}
        style={{
          position: 'fixed', // Fixed to viewport for consistent positioning
          zIndex: 50,
          left: safePosition.x,
          top: safePosition.y,
          width: '320px',
          maxHeight: 'calc(100vh - 32px)', // Prevent overflow
          overflowY: 'auto', // Allow scrolling if content is tall
          padding: '16px',
          borderColor: 'var(--tg-border)',
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
          pointerEvents: 'auto', // Ensure form remains interactive during OCR selection mode
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {showDefinitionForm ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TGButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDefinitionForm(false)}
                  style={{ color: 'var(--tg-muted)', padding: '4px' }}
                >
                  ← Back
                </TGButton>
                <span style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-sm)' }}>
                  Create New Definition
                </span>
              </div>
              {variant === 'SymbolInstanceForm' && renderSymbolDefinitionForm()}
              {variant === 'ComponentInstanceForm' && renderComponentDefinitionForm()}
            </>
          ) : (
            <>
              {variant === 'DrawingForm' && renderDrawingForm()}
              {variant === 'LegendForm' && renderLegendForm()}
              {variant === 'ScheduleForm' && renderScheduleForm()}
              {variant === 'AssemblyGroupForm' && renderAssemblyGroupForm()}
              {variant === 'SymbolInstanceForm' && renderSymbolInstanceForm()}
              {variant === 'ComponentInstanceForm' && renderComponentInstanceForm()}
              {variant === 'ScopeForm' && renderScopeForm()}
              {variant === 'NoteForm' && renderNoteForm()}
              {variant === 'SymbolDefinitionForm' && renderSymbolDefinitionForm()}
              {variant === 'ComponentDefinitionForm' && renderComponentDefinitionForm()}
            </>
          )}

          <div
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--tg-radius-sm)',
              fontSize: 'var(--tg-font-xs)',
              backgroundColor: 'var(--tg-warn)',
              color: 'var(--tg-warn-contrast)',
            }}
          >
            {getIncompleteText()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <TGButton
              variant="ghost"
              size="sm"
              onClick={onCancel}
              style={{ color: 'var(--tg-muted)' }}
            >
              Cancel
            </TGButton>
            <TGButton
              size="sm"
              onClick={() => {
                if (showDefinitionForm) {
                  // Save the definition first
                  const definitionData = { ...formData };
                  if (variant === 'SymbolInstanceForm') {
                    // Create symbol definition
                    onRequestDefinition?.(definitionData);
                  } else if (variant === 'ComponentInstanceForm') {
                    // Create component definition
                    onRequestComponentDefinition?.(definitionData);
                  }
                } else {
                  onSave?.(formData);
                }
              }}
            >
              {showDefinitionForm ? 'Create Definition' : actionLabel}
            </TGButton>
          </div>
        </div>
      </TGCard>
    </>
  );
}
