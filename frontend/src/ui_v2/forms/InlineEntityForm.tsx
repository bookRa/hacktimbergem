import { useEffect, useState } from 'react';
import '../theme/tokens.css';
import { TGCard } from '../../ui_primitives/card';
import { TGButton } from '../../ui_primitives/button';
import { TGInput } from '../../ui_primitives/input';
import { TGSelect } from '../../ui_primitives/select';
import { cx } from '../utils/classNames';

export type FormVariant = 'DrawingForm' | 'SymbolInstanceForm' | 'ScopeForm' | 'NoteForm';

interface InlineEntityFormProps {
  variant: FormVariant;
  open?: boolean;
  x?: number;
  y?: number;
  onSave?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  onCreateFromOCR?: () => void;
  initialValues?: Record<string, unknown> | null;
  mode?: 'create' | 'edit';
  symbolDefinitionOptions?: { label: string; value: string }[];
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

const symbolDefinitionOptions = [
  { label: 'Door Symbol', value: 'door' },
  { label: 'Window Symbol', value: 'window' },
  { label: 'Electrical Outlet', value: 'electrical' },
];

const semanticMeaningOptions = [
  { label: 'Entry Door', value: 'entry' },
  { label: 'Fire Exit', value: 'fire-exit' },
  { label: 'Emergency Exit', value: 'emergency' },
];

export function InlineEntityForm({
  variant,
  open = false,
  x = 0,
  y = 0,
  onSave,
  onCancel,
  onCreateFromOCR,
  initialValues = null,
  mode = 'create',
  symbolDefinitionOptions,
}: InlineEntityFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) {
      setFormData({});
      return;
    }
    setFormData(() => ({ ...(initialValues ?? {}) }));
  }, [open, variant, initialValues]);

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
            >
              <PlusIcon />
              New
            </TGButton>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--tg-muted)', fontSize: 'var(--tg-font-xs)' }}>Semantic Meaning</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <TGSelect
              value={(formData.recognizedText as string) ?? ''}
              onValueChange={(value) => updateField('recognizedText', value)}
              options={semanticMeaningOptions}
              placeholder="Select meaning..."
            />
            <TGButton
              variant="outline"
              size="sm"
              style={{ paddingInline: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => onCreateFromOCR?.()}
            >
              <SparkIcon />
              OCR
            </TGButton>
          </div>
        </div>
      </div>
    );
  };

  const renderScopeForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextField('Name', 'name', 'Enter scope name...')}
      {renderTextarea('Description', 'description', 'Enter scope description...')}
    </div>
  );

  const renderNoteForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {renderTextarea('Note', 'text', 'Enter note text...')}
    </div>
  );

  const getIncompleteText = () => {
    switch (variant) {
      case 'SymbolInstanceForm':
        return 'Needs visual definition and semantic meaning to be complete';
      case 'ScopeForm':
        return 'Needs name and description to be complete';
      case 'NoteForm':
        return 'Needs text content to be complete';
      case 'DrawingForm':
        return 'Needs title to be complete';
      default:
        return '';
    }
  };

  const actionLabel = mode === 'edit' ? 'Update' : 'Save';

  return (
    <>
      <div className="tg-ui2" style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onCancel} />

      <TGCard
        data-ui2-overlay-ignore
        className={cx('tg-ui2')}
        style={{
          position: 'absolute',
          zIndex: 50,
          left: x,
          top: y,
          width: '320px',
          padding: '16px',
          borderColor: 'var(--tg-border)',
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {variant === 'DrawingForm' && renderDrawingForm()}
          {variant === 'SymbolInstanceForm' && renderSymbolInstanceForm()}
          {variant === 'ScopeForm' && renderScopeForm()}
          {variant === 'NoteForm' && renderNoteForm()}

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
                onSave?.(formData);
              }}
            >
              {actionLabel}
            </TGButton>
          </div>
        </div>
      </TGCard>
    </>
  );
}
