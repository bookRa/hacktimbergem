import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../state/store';
import { ScopeComposer } from '../features/scope_editor/ScopeComposer';

interface ScopeCreationModalProps {}

export const ScopeCreationModal: React.FC<ScopeCreationModalProps> = () => {
  const { scopeCreationMode, entities, createScope, cancelScopeCreation } = useProjectStore(
    (s) => ({
      scopeCreationMode: s.scopeCreationMode,
      entities: s.entities,
      createScope: s.createScope,
      cancelScopeCreation: s.cancelScopeCreation,
    })
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name field when modal opens
  useEffect(() => {
    if (scopeCreationMode.active && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [scopeCreationMode.active]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!scopeCreationMode.active) {
      setName('');
      setDescription('');
      setIsDuplicateWarning(false);
      setDuplicateName('');
    }
  }, [scopeCreationMode.active]);

  // Check for duplicate names (debounced)
  useEffect(() => {
    if (!name || !scopeCreationMode.active) {
      setIsDuplicateWarning(false);
      setDuplicateName('');
      return;
    }

    const timeoutId = setTimeout(() => {
      const duplicate = entities.find(
        (e: any) =>
          e.entity_type === 'scope' &&
          (e.name?.toLowerCase() === name.toLowerCase() ||
            e.description?.toLowerCase() === name.toLowerCase())
      );

      if (duplicate) {
        setIsDuplicateWarning(true);
        setDuplicateName(duplicate.name || duplicate.description || duplicate.id.slice(0, 6));
      } else {
        setIsDuplicateWarning(false);
        setDuplicateName('');
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [name, entities, scopeCreationMode.active]);

  // Handle Escape key
  useEffect(() => {
    if (!scopeCreationMode.active) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelScopeCreation();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [scopeCreationMode.active, cancelScopeCreation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() && !description.trim()) {
      alert('Please provide at least a name or description');
      return;
    }

    await createScope({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  if (!scopeCreationMode.active) return null;

  const isConceptual = scopeCreationMode.type === 'conceptual';
  const isCanvas = scopeCreationMode.type === 'canvas';

  // Use new ScopeComposer for conceptual scopes
  if (isConceptual) {
    return <ScopeComposer onClose={cancelScopeCreation} />;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={cancelScopeCreation}
      >
        {/* Modal Card */}
        <div
          className="tg-ui2"
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 480,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: 8,
              }}
            >
              {isConceptual && '💭 Create Conceptual Scope'}
              {isCanvas && '📍 Create Canvas Scope'}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              {isConceptual &&
                'Create a project-level scope without a canvas location. You can link it to any instances across sheets.'}
              {isCanvas &&
                'Create a scope with a canvas location. After saving, you can draw the bounding box on the canvas.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Name Field */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="scope-name"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                ref={nameInputRef}
                id="scope-name"
                type="text"
                placeholder="e.g., Demolish ground floor walls"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                }}
              />
              {/* Duplicate Warning */}
              {isDuplicateWarning && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '6px 10px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>⚠️</span>
                  <span>
                    A scope with similar name <strong>"{duplicateName}"</strong> already exists
                  </span>
                </div>
              )}
            </div>

            {/* Description Field */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="scope-description"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Description
              </label>
              <textarea
                id="scope-description"
                placeholder="Additional details about this scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                }}
              />
            </div>

            {/* Canvas Scope Info */}
            {isCanvas && (
              <div
                style={{
                  marginBottom: 20,
                  padding: 12,
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#1e40af',
                  lineHeight: 1.5,
                }}
              >
                <strong>💡 Next step:</strong> After creating the scope, navigate to the sheet where you
                want to place it, then use the Entity Editor to add a canvas location.
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={cancelScopeCreation}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#64748b',
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() && !description.trim()}
                style={{
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: !name.trim() && !description.trim() ? '#cbd5e1' : '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !name.trim() && !description.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (name.trim() || description.trim()) {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (name.trim() || description.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
              >
                Create Scope
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

