import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../state/store';
import { TGInput } from '../../ui_primitives/input';
import { TGButton } from '../../ui_primitives/button';
import '../theme/tokens.css';

interface Suggestion {
  value: string;
  source: 'Symbol Instance' | 'Symbol Definition';
  sheetNumber: number;
  usageCount: number;
}

interface SemanticMeaningInputProps {
  value: string;
  onChange: (value: string) => void;
  onRequestOCRSelection: () => void;
}

const SparkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" />
  </svg>
);

export const SemanticMeaningInput: React.FC<SemanticMeaningInputProps> = ({
  value,
  onChange,
  onRequestOCRSelection,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const entities = useProjectStore((state) => state.entities);

  const fetchSuggestions = useCallback((query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Search symbol instances for recognized_text
    const instanceMatches = entities
      .filter(
        (e: any) =>
          e.entity_type === 'symbol_instance' &&
          e.recognized_text &&
          e.recognized_text.toLowerCase().includes(lowerQuery)
      )
      .map((e: any) => ({
        value: e.recognized_text,
        source: 'Symbol Instance' as const,
        sheetNumber: e.source_sheet_number,
      }));

    // Search symbol definitions for name
    const definitionMatches = entities
      .filter(
        (e: any) =>
          e.entity_type === 'symbol_definition' &&
          e.name &&
          e.name.toLowerCase().includes(lowerQuery)
      )
      .map((e: any) => ({
        value: e.name,
        source: 'Symbol Definition' as const,
        sheetNumber: e.source_sheet_number,
      }));

    // Combine and deduplicate by value
    const allMatches = [...instanceMatches, ...definitionMatches];
    const uniqueMap = new Map<string, Suggestion>();

    allMatches.forEach((match) => {
      if (uniqueMap.has(match.value)) {
        // Increment usage count
        const existing = uniqueMap.get(match.value)!;
        existing.usageCount += 1;
      } else {
        uniqueMap.set(match.value, { ...match, usageCount: 1 });
      }
    });

    // Convert to array and sort by usage count
    const uniqueSuggestions = Array.from(uniqueMap.values()).sort(
      (a, b) => b.usageCount - a.usageCount
    );

    setSuggestions(uniqueSuggestions.slice(0, 8)); // Top 8 suggestions
  }, [entities]);

  useEffect(() => {
    fetchSuggestions(value);
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.value);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        selectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <TGInput
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Type to search or select from canvas..."
            style={{ width: '100%' }}
          />
          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="tg-ui2"
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                maxHeight: '240px',
                overflowY: 'auto',
                background: 'var(--tg-panel-elevated)',
                border: '1px solid var(--tg-border)',
                borderRadius: 'var(--tg-radius-md)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 100,
              }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.value}-${index}`}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background:
                      index === highlightedIndex
                        ? 'var(--tg-accent-bg)'
                        : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div
                    style={{
                      fontSize: 'var(--tg-font-sm)',
                      fontWeight: 500,
                      color: 'var(--tg-text)',
                      marginBottom: '2px',
                    }}
                  >
                    {suggestion.value}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--tg-font-xs)',
                      color: 'var(--tg-muted)',
                    }}
                  >
                    From: {suggestion.source} (Sheet {suggestion.sheetNumber})
                    {suggestion.usageCount > 1 && ` • Used ${suggestion.usageCount} times`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <TGButton
          variant="outline"
          size="sm"
          onClick={onRequestOCRSelection}
          style={{
            paddingInline: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <SparkIcon />
          Select from Canvas
        </TGButton>
      </div>
    </div>
  );
};

