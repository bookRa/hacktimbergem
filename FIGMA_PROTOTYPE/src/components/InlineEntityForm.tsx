import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Zap } from 'lucide-react';

export type FormVariant = 'DrawingForm' | 'SymbolInstanceForm' | 'ScopeForm';

interface InlineEntityFormProps {
  variant: FormVariant;
  open?: boolean;
  x?: number;
  y?: number;
  onSave?: (data: any) => void;
  onCancel?: () => void;
  onCreateFromOCR?: () => void;
}

export function InlineEntityForm({
  variant,
  open = false,
  x = 0,
  y = 0,
  onSave,
  onCancel,
  onCreateFromOCR
}: InlineEntityFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<string[]>([]);

  if (!open) return null;

  const renderDrawingForm = () => (
    <div className="space-y-4">
      <div>
        <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
          Title
        </label>
        <Input 
          placeholder="Enter drawing title..."
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          style={{
            backgroundColor: 'var(--timbergem-panel)',
            borderColor: 'var(--timbergem-border)',
            color: 'var(--timbergem-text)'
          }}
        />
      </div>
      <div>
        <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
          Description
        </label>
        <Textarea 
          placeholder="Enter description..."
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-20"
          style={{
            backgroundColor: 'var(--timbergem-panel)',
            borderColor: 'var(--timbergem-border)',
            color: 'var(--timbergem-text)'
          }}
        />
      </div>
    </div>
  );

  const renderSymbolInstanceForm = () => (
    <div className="space-y-4">
      <div>
        <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
          Visual Definition
        </label>
        <div className="flex gap-2">
          <Select value={formData.visualDefinition || ''}>
            <SelectTrigger 
              style={{
                backgroundColor: 'var(--timbergem-panel)',
                borderColor: 'var(--timbergem-border)',
                color: 'var(--timbergem-text)'
              }}
            >
              <SelectValue placeholder="Select definition..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="door">Door Symbol</SelectItem>
              <SelectItem value="window">Window Symbol</SelectItem>
              <SelectItem value="electrical">Electrical Outlet</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            className="px-2"
            style={{
              borderColor: 'var(--timbergem-border)',
              backgroundColor: 'var(--timbergem-panel)',
              color: 'var(--timbergem-text)'
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Create New
          </Button>
        </div>
      </div>
      
      <div>
        <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
          Semantic Meaning
        </label>
        <div className="flex gap-2">
          <Select value={formData.semanticMeaning || ''}>
            <SelectTrigger 
              style={{
                backgroundColor: 'var(--timbergem-panel)',
                borderColor: 'var(--timbergem-border)',
                color: 'var(--timbergem-text)'
              }}
            >
              <SelectValue placeholder="Select meaning..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry Door</SelectItem>
              <SelectItem value="fire-exit">Fire Exit</SelectItem>
              <SelectItem value="emergency">Emergency Exit</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            className="px-2"
            style={{
              borderColor: 'var(--timbergem-border)',
              backgroundColor: 'var(--timbergem-panel)',
              color: 'var(--timbergem-text)'
            }}
            onClick={onCreateFromOCR}
          >
            <Zap className="h-3 w-3 mr-1" />
            Create from OCR
          </Button>
        </div>
      </div>
    </div>
  );

  const renderScopeForm = () => (
    <div className="space-y-4">
      <div>
        <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
          Name
        </label>
        <Input 
          placeholder="Enter scope name..."
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={{
            backgroundColor: 'var(--timbergem-panel)',
            borderColor: 'var(--timbergem-border)',
            color: 'var(--timbergem-text)'
          }}
        />
      </div>
      <div>
        <label className="caption block mb-1" style={{ color: 'var(--timbergem-muted)' }}>
          Description
        </label>
        <Textarea 
          placeholder="Enter scope description..."
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-20"
          style={{
            backgroundColor: 'var(--timbergem-panel)',
            borderColor: 'var(--timbergem-border)',
            color: 'var(--timbergem-text)'
          }}
        />
      </div>
    </div>
  );

  const getIncompleteText = () => {
    switch (variant) {
      case 'SymbolInstanceForm':
        return 'Needs visual definition and semantic meaning to be complete';
      case 'ScopeForm':
        return 'Needs name and description to be complete';
      case 'DrawingForm':
        return 'Needs title to be complete';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      
      {/* Form */}
      <Card 
        className="absolute z-50 p-4 w-80 border"
        style={{
          left: x,
          top: y,
          backgroundColor: 'var(--timbergem-panel-elevated)',
          borderColor: 'var(--timbergem-border)',
          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="space-y-4">
          {variant === 'DrawingForm' && renderDrawingForm()}
          {variant === 'SymbolInstanceForm' && renderSymbolInstanceForm()}
          {variant === 'ScopeForm' && renderScopeForm()}

          {/* Incomplete helper text */}
          <div 
            className="p-2 rounded text-xs"
            style={{ 
              backgroundColor: 'var(--timbergem-warn)',
              color: 'var(--timbergem-warn-contrast)'
            }}
          >
            {getIncompleteText()}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancel}
              style={{ color: 'var(--timbergem-muted)' }}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={() => onSave?.(formData)}
              style={{
                backgroundColor: 'var(--timbergem-accent)',
                color: 'var(--timbergem-accent-contrast)'
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}