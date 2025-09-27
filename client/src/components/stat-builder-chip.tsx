import { useState, useEffect, useRef, useCallback } from 'react';
import { parseAchievementLabel, formatAchievementLabel, type ParsedAchievement } from '@/lib/editable-achievements';

// Hook to measure container width
function useContainerWidth(containerRef: React.RefObject<HTMLDivElement>): number {
  const [containerWidth, setContainerWidth] = useState(0);
  
  useEffect(() => {
    const updateWidth = () => {
      if (!containerRef.current) return;
      
      // Get the computed font size
      const computedStyle = window.getComputedStyle(containerRef.current);
      const fontSize = parseFloat(computedStyle.fontSize);
      
      // Calculate width in em units
      const widthInPx = containerRef.current.offsetWidth;
      const widthInEm = widthInPx / fontSize;
      
      setContainerWidth(widthInEm);
    };
    
    updateWidth();
    
    // Listen for resize
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);
  
  return containerWidth;
}

// Layout mode based on container width in em
type LayoutMode = 'A' | 'B' | 'C';

function getLayoutMode(containerWidthEm: number): LayoutMode {
  if (containerWidthEm >= 32) return 'A'; // Single line, full
  if (containerWidthEm >= 28) return 'B'; // Single line, compact
  return 'C'; // Two lines
}

// Abbreviate labels for very tight spaces
function abbreviateLabel(label: string, mode: LayoutMode): string {
  if (mode !== 'C') return label;
  
  // Only abbreviate for mode C (very tight spaces)
  const abbreviations: Record<string, string> = {
    'Points (Season)': 'PTS (Season)',
    'Points (Career)': 'PTS (Career)',
    'Made Threes': '3PM',
    'Rebounds (Season)': 'REB (Season)',
    'Assists (Season)': 'AST (Season)',
    'Steals (Season)': 'STL (Season)',
    'Blocks (Season)': 'BLK (Season)',
  };
  
  return abbreviations[label] || label;
}

interface StatBuilderChipProps {
  baseLabel: string; // The original, unformatted label (e.g., "Career Points")
  displayLabel: string; // The label to actually display in the chip (e.g., "20,000+ Career Points")
  onNumberChange?: (newNumber: number, newLabel: string, operator?: '≥' | '≤') => void;
  onOperatorChange: (operator: '≥' | '≤') => void;
  className?: string;
  sport?: string;
  operator: Operator;
  isEditable: boolean;
}

type Operator = '≥' | '≤';

interface StatValidation {
  min: number;
  max: number;
  allowDecimals: boolean;
  decimalPlaces?: number;
  isPercentage?: boolean;
}

// Define validation rules for different stat types
function getStatValidation(label: string): StatValidation {
  const lowerLabel = label.toLowerCase();
  
  // Percentage stats (FG%, 3P%, FT%, TS%, eFG%, etc.)
  // Check for various percentage patterns including custom labels
  // Note: 50/40/90 Club is excluded as it's a specific historic achievement
  if (lowerLabel.includes('%') || 
      lowerLabel.includes('percentage') ||
      lowerLabel.includes('3pt') ||
      lowerLabel.includes('ft (season)') ||
      lowerLabel.includes('efg') ||
      lowerLabel.includes('ts on')) {
    return {
      min: 0.0,
      max: 100.0,
      allowDecimals: true,
      decimalPlaces: 1,
      isPercentage: true
    };
  }
  
  // Per-game averages (PPG, RPG, APG, SPG, BPG, etc.)
  if (lowerLabel.includes('pg') && !lowerLabel.includes('games')) {
    return {
      min: 0.0,
      max: 99.9,
      allowDecimals: true,
      decimalPlaces: 1
    };
  }
  
  // Counting stats (points, rebounds, steals, blocks, 3PM, etc.)
  return {
    min: 0,
    max: 99999,
    allowDecimals: false
  };
}

// Format display number with commas for thousands
function formatDisplayNumber(num: number): string {
  if (num % 1 !== 0) {
    // For decimals, don't use thousands separators to keep it clean
    return num.toString();
  }
  
  // For whole numbers, add commas for readability
  return num.toLocaleString();
}

export function StatBuilderChip({
  baseLabel,
  displayLabel,
  onNumberChange,
  onOperatorChange,
  className,
  sport,
  operator,
  isEditable,
}: StatBuilderChipProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(baseLabel, sport));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [validation, setValidation] = useState<StatValidation>(() => getStatValidation(baseLabel));
  const [error, setError] = useState<string | null>(null);
  const [userHasChangedNumber, setUserHasChangedNumber] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widthSizerRef = useRef<HTMLSpanElement>(null);
  const containerWidthEm = useContainerWidth(containerRef);

  useEffect(() => {
    const newParsed = parseAchievementLabel(baseLabel, sport);
    setParsed(newParsed);
    
    if (!userHasChangedNumber) {
      setInputValue(newParsed.number.toString());
    }
    
    setValidation(getStatValidation(baseLabel));
  }, [baseLabel, sport, userHasChangedNumber]);

  const layoutMode = getLayoutMode(containerWidthEm);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setUserHasChangedNumber(true);
    setError(null);
  }, []);

  const handleNumberClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  const handleOperatorClick = useCallback(() => {
    const newOperator = operator === '≥' ? '≤' : '≥';
    onOperatorChange(newOperator);
  }, [operator, onOperatorChange]);

  const commitValue = useCallback(() => {
    const numValue = validation.allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10);
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (numValue < validation.min || numValue > validation.max) {
      const range = validation.allowDecimals 
        ? `${validation.min} - ${validation.max}`
        : `${Math.floor(validation.min)} - ${Math.floor(validation.max)}`;
      setError(`Value must be between ${range}`);
      return;
    }

    if (validation.allowDecimals && validation.decimalPlaces) {
      const decimalPlaces = (inputValue.split('.')[1] || '').length;
      if (decimalPlaces > validation.decimalPlaces) {
        setError(`Maximum ${validation.decimalPlaces} decimal place${validation.decimalPlaces > 1 ? 's' : ''} allowed`);
        return;
      }
    }

    setError(null);
    
    const newLabel = formatAchievementLabel({
      originalLabel: baseLabel,
      prefix: parsed.prefix,
      number: numValue,
      suffix: parsed.suffix,
      isEditable: true
    }, operator);

    if (onNumberChange) {
      onNumberChange(numValue, newLabel, operator);
    }
  }, [inputValue, validation, parsed, baseLabel, operator, onNumberChange]);

  const cancelEdit = useCallback(() => {
    // Only reset to original if user hasn't made any changes
    if (!userHasChangedNumber) {
      setInputValue(parsed.number.toString());
    }
    setError(null);
  }, [parsed.number, userHasChangedNumber]);

  const handleInputBlur = useCallback(() => {
    // Cancel the edit when clicking away
    cancelEdit();
  }, [cancelEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [commitValue, cancelEdit]);

  // If not editable, render as plain text
  if (!isEditable) {
    return <span className={className}>{displayLabel}</span>;
  }

  // Display value - show exactly what user typed if they changed it
  const getDisplayValue = (): string => {
    // If user has changed the number, show their EXACT input without any formatting
    if (userHasChangedNumber) {
      return inputValue;
    }
    
    // Only apply formatting if user hasn't touched the number
    const formatted = formatDisplayNumber(parsed.number);
    
    // For mode B, use compact form for numbers >= 7 characters
    if (layoutMode === 'B' && formatted.length >= 7) {
      if (parsed.number >= 1000000) {
        return `${(parsed.number / 1000000).toFixed(1)}M`;
      } else if (parsed.number >= 1000) {
        return `${(parsed.number / 1000).toFixed(1)}k`;
      }
    }
    
    return formatted;
  };
  
  const displayValue = getDisplayValue();
  
  // Extract and abbreviate the clean label
  const cleanLabel = abbreviateLabel(displayLabel, layoutMode);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgb(255 255 255 / 0.1)',
        borderRadius: 'clamp(0.25rem, 1vw, 0.5rem)',
        ...(layoutMode === 'C' ? {
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(0.25em, 1vw, 0.5em) clamp(0.5em, 2vw, 1em)',
          gap: 'clamp(0.125em, 0.5vw, 0.25em)'
        } : {
          display: 'flex',
          alignItems: 'center',
          padding: 'clamp(0.25em, 1vw, 0.5em) clamp(0.5em, 2vw, 1em)',
          gap: 'clamp(0.25em, 1vw, 0.5em)'
        })
      }}
      title={baseLabel}
    >
      {layoutMode === 'C' ? (
        // Mode C: Two-line layout
        <>
          {/* Line 1: operator + number */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}>
            {/* Operator button - fixed width in ch */}
            <button
              onClick={handleOperatorClick}
              className="hover:bg-white/10 transition-colors rounded"
              title="Threshold operator"
              aria-label="Stat threshold operator"
              data-testid="operator-button"
              style={{
                width: 'clamp(2ch, 3vw, 3ch)',
                height: 'clamp(1.2em, 3vw, 1.5em)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '500',
                fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                flexShrink: 0
              }}
            >
              {operator}
            </button>
            
            {/* Number section */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <span ref={widthSizerRef} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', fontWeight: '600', padding: 'clamp(0.125em, 0.5vw, 0.25em) clamp(0.25em, 1vw, 0.5em)' }}>{inputValue || '0'}</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                onClick={handleNumberClick}
                style={{ 
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'rgb(255 255 255 / 0.85)',
                  fontWeight: '600',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                  appearance: 'textfield',
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none',
                  padding: 'clamp(0.125em, 0.5vw, 0.25em) clamp(0.25em, 1vw, 0.5em)'
                }}
                aria-label="Stat threshold number"
                data-testid="number-input"
              />
              
              {/* Percentage symbol for percentage stats */}
              {validation.isPercentage && (
                <span
                  style={{
                    fontWeight: '600',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                    color: 'rgb(255 255 255 / 0.85)',
                    marginLeft: '0.1em'
                  }}
                >
                  %
                </span>
              )}
            </div>
          </div>
          
          {/* Line 2: label */}
          <div 
            style={{
              fontWeight: '500',
              color: 'rgb(255 255 255 / 0.7)',
              fontSize: 'clamp(0.625rem, 1.5vw, 0.875rem)',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={baseLabel}
          >
            {cleanLabel}
          </div>
        </>
      ) : (
        // Mode A/B: Single-line layout
        <>
          {/* Operator button - fixed width in ch */}
          <button
            onClick={handleOperatorClick}
            className="hover:bg-white/10 transition-colors rounded"
            title="Threshold operator"
            aria-label="Stat threshold operator"
            data-testid="operator-button"
            style={{
              width: 'clamp(2ch, 3vw, 3ch)',
              height: 'clamp(1.2em, 3vw, 1.5em)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '500',
              fontSize: 'clamp(0.75rem, 2vw, 1rem)',
              flexShrink: 0
            }}
          >
            {operator}
          </button>
          
          {/* Number section - flexible width */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span ref={widthSizerRef} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', fontWeight: '600', padding: 'clamp(0.125em, 0.5vw, 0.25em) clamp(0.25em, 1vw, 0.5em)' }}>{inputValue || '0'}</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              onClick={handleNumberClick}
              style={{ 
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'rgb(255 255 255 / 0.85)',
                fontWeight: '600',
                fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                appearance: 'textfield',
                MozAppearance: 'textfield',
                WebkitAppearance: 'none',
                padding: 'clamp(0.125em, 0.5vw, 0.25em) clamp(0.25em, 1vw, 0.5em)'
              }}
              aria-label="Stat threshold number"
              data-testid="number-input"
            />
            
            {/* Percentage symbol for percentage stats */}
            {validation.isPercentage && (
              <span
                style={{
                  fontWeight: '600',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                  color: 'rgb(255 255 255 / 0.85)',
                  marginLeft: '0.1em'
                }}
              >
                %
              </span>
            )}
          </div>
          
          {/* Label section - flexible with mode-based constraints */}
          <span 
            style={{
              fontWeight: '500',
              color: 'rgb(255 255 255 / 0.7)',
              fontSize: 'clamp(0.625rem, 1.5vw, 0.875rem)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              maxWidth: '60%'
            }}
            title={baseLabel}
          >
            {cleanLabel}
          </span>
        </>
      )}
      
      {/* Error message */}
      {error && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: 'rgb(248 113 113)',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// Legacy wrapper to maintain compatibility
export function EditableAchievementLabel(props: StatBuilderChipProps) {
  return <StatBuilderChip {...props} />;
}

export function EditableAchievementLabelNoPlus(props: StatBuilderChipProps) {
  return <StatBuilderChip {...props} />;
}