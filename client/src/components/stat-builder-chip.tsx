import { useState, useCallback, useEffect, useRef } from 'react';
import { parseAchievementLabel, generateUpdatedLabel, type ParsedAchievement } from '@/lib/editable-achievements';
import { Check } from 'lucide-react';

// Hook to detect container width for layout mode switching
function useContainerWidth(containerRef: React.RefObject<HTMLDivElement>) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const style = window.getComputedStyle(containerRef.current);
        const fontSize = parseFloat(style.fontSize);
        const widthInPx = containerRef.current.offsetWidth;
        const widthInEm = widthInPx / fontSize;
        setContainerWidth(widthInEm);
      }
    };
    
    // Initial measurement
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
  label: string;
  onNumberChange?: (newNumber: number, newLabel: string, operator?: '≥' | '≤') => void;
  onOperatorChange?: (operator: '≥' | '≤') => void;
  className?: string;
  sport?: string;
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
    max: 100000,
    allowDecimals: false
  };
}

// Parse initial operator from label
function parseOperator(label: string): Operator {
  if (label.includes('≤')) return '≤';
  return '≥'; // Default for "+" patterns and most cases
}

// Format number according to validation rules
function formatNumber(value: number, validation: StatValidation): string {
  if (validation.allowDecimals && validation.decimalPlaces !== undefined) {
    return value.toFixed(validation.decimalPlaces);
  }
  if (validation.allowDecimals) {
    return value.toString();
  }
  // For integers, use locale formatting for readability
  return value.toLocaleString();
}

// Validate input value
function validateInput(input: string, validation: StatValidation): { isValid: boolean; errorMessage?: string } {
  const numValue = parseFloat(input);
  
  if (isNaN(numValue)) {
    return { isValid: false, errorMessage: 'Enter a valid number.' };
  }
  
  if (numValue < validation.min || numValue > validation.max) {
    if (validation.isPercentage) {
      return { isValid: false, errorMessage: 'Enter 0.0–100.0 (one decimal).' };
    } else if (validation.allowDecimals) {
      return { isValid: false, errorMessage: 'Enter 0.0–99.9 (one decimal).' };
    } else {
      return { isValid: false, errorMessage: 'Enter 0–100,000.' };
    }
  }
  
  // Check decimal places
  if (!validation.allowDecimals && input.includes('.')) {
    return { isValid: false, errorMessage: 'Enter 0–100,000.' };
  }
  
  if (validation.decimalPlaces !== undefined) {
    const decimalPart = input.split('.')[1];
    if (decimalPart && decimalPart.length > validation.decimalPlaces) {
      if (validation.isPercentage) {
        return { isValid: false, errorMessage: 'Enter 0.0–100.0 (one decimal).' };
      } else {
        return { isValid: false, errorMessage: 'Enter 0.0–99.9 (one decimal).' };
      }
    }
  }
  
  return { isValid: true };
}

export function StatBuilderChip({ 
  label, 
  onNumberChange, 
  onOperatorChange,
  className,
  sport
}: StatBuilderChipProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(label, sport));
  const [operator, setOperator] = useState<Operator>(() => parseOperator(label));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [validation, setValidation] = useState<StatValidation>(() => getStatValidation(label));
  const [error, setError] = useState<string | null>(null);
  const [userHasToggledOperator, setUserHasToggledOperator] = useState(false);
  const [userHasChangedNumber, setUserHasChangedNumber] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidthEm = useContainerWidth(containerRef);
  
  // Determine layout mode based on container width in em
  const layoutMode = getLayoutMode(containerWidthEm);
  
  // Format number with thousands separators for display
  const formatDisplayNumber = useCallback((value: number) => {
    if (validation.allowDecimals && validation.decimalPlaces !== undefined) {
      return value.toFixed(validation.decimalPlaces);
    }
    if (validation.allowDecimals) {
      return value.toString();
    }
    // For integers, use locale formatting for readability
    return value.toLocaleString();
  }, [validation]);

  // Update parsed achievement when label changes
  useEffect(() => {
    const newParsed = parseAchievementLabel(label, sport);
    setParsed(newParsed);
    
    // Only update inputValue if user hasn't manually changed the number
    if (!userHasChangedNumber) {
      setInputValue(newParsed.number.toString());
    }
    
    // Only update operator from label if user hasn't manually toggled it
    if (!userHasToggledOperator) {
      setOperator(parseOperator(label));
    }
    
    setValidation(getStatValidation(label));
    setError(null);
  }, [label, sport, userHasToggledOperator, userHasChangedNumber]);

  // All useCallback hooks must come before the early return
  const handleOperatorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Mark that user has manually toggled the operator
    setUserHasToggledOperator(true);
    
    setOperator(prev => {
      const newOperator = prev === '≥' ? '≤' : '≥';
      
      // Notify about operator change
      if (onOperatorChange) {
        onOperatorChange(newOperator);
      }
      
      return newOperator;
    });
  }, [onOperatorChange]);

  const handleNumberClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setError(null);
    // Focus input on next tick to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Mark that user has manually changed the number
    setUserHasChangedNumber(true);
    
    // Strip non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;
    
    setInputValue(formattedValue);
    setError(null);
  }, []);

  // Auto-apply changes while typing (debounced)
  useEffect(() => {
    if (!isEditing || !inputValue) return;

    const timeoutId = setTimeout(() => {
      const validationResult = validateInput(inputValue, validation);
      if (validationResult.isValid) {
        const newNumber = parseFloat(inputValue);
        const originalOperator = parseOperator(parsed.originalLabel);
        
        // Apply immediately if valid and different
        if ((newNumber !== parsed.number || operator !== originalOperator) && onNumberChange) {
          const newLabel = generateUpdatedLabel(parsed, newNumber, operator);
          onNumberChange(newNumber, newLabel, operator);
        }
      }
    }, 800); // 800ms debounce - applies after user stops typing

    return () => clearTimeout(timeoutId);
  }, [inputValue, isEditing, validation, parsed, operator, onNumberChange]);

  const commitValue = useCallback(() => {
    const validationResult = validateInput(inputValue, validation);
    
    if (!validationResult.isValid) {
      setError(validationResult.errorMessage || 'Invalid input');
      return;
    }
    
    const newNumber = parseFloat(inputValue);
    const originalOperator = parseOperator(parsed.originalLabel);
    
    // Trigger callback if number changed OR operator changed from original
    if ((newNumber !== parsed.number || operator !== originalOperator) && onNumberChange) {
      const newLabel = generateUpdatedLabel(parsed, newNumber, operator);
      onNumberChange(newNumber, newLabel, operator);
    }
    
    // Update input value to show formatted number immediately after commit
    setInputValue(formatDisplayNumber(newNumber));
    setIsEditing(false);
    setError(null);
  }, [inputValue, validation, parsed, onNumberChange, operator, formatDisplayNumber]);

  const cancelEdit = useCallback(() => {
    setInputValue(parsed.number.toString());
    setIsEditing(false);
    setError(null);
  }, [parsed.number]);

  const handleInputBlur = useCallback(() => {
    // Apply immediately when clicking away (no delay needed)
    if (isEditing) {
      commitValue();
    }
  }, [isEditing, commitValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [commitValue, cancelEdit]);

  const handleConfirmClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    commitValue();
  }, [commitValue]);


  // If not editable, render as plain text
  if (!parsed.isEditable) {
    return <span className={className}>{label}</span>;
  }

  // Format display value with thousands separators and compact forms
  const formatDisplayValue = (value: number, mode: LayoutMode): string => {
    if (isEditing) return inputValue;
    
    const formatted = formatDisplayNumber(value);
    
    // For mode B, use compact form for numbers >= 7 characters
    if (mode === 'B' && formatted.length >= 7) {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
    }
    
    return formatted;
  };
  
  const displayValue = formatDisplayValue(parsed.number, layoutMode);
  
  // Extract and abbreviate the clean label
  const baseLabel = parsed.suffix.replace(/^\+?\s*/, '').trim() || parsed.originalLabel.replace(/^[^a-zA-Z]*\d+[^a-zA-Z]*/, '').trim();
  const cleanLabel = abbreviateLabel(baseLabel, layoutMode);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${className || ''}`}
      style={{ 
        fontSize: '1rem',
        // Center the chip and scale with container
        maxWidth: '85%', // Slightly smaller to ensure no overflow
        margin: '0 auto', // Center horizontally
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      {/* Main chip with container-based sizing */}
      <div 
        className={`
          w-full rounded-xl cursor-pointer transition-all relative
          bg-white/6 border border-white/12 text-white/85 hover:bg-white/8
          ${isEditing ? 'focus-within:ring-2 focus-within:ring-blue-400/40' : ''}
          ${error ? 'border-red-400/60' : ''}
        `}
        title="Chosen stat threshold"
        style={{ 
          // Responsive sizing based on container
          fontSize: 'clamp(0.75rem, 2.5vw, 1rem)',
          minBlockSize: 'clamp(2rem, 8vw, 3rem)',
          width: 'fit-content',
          maxWidth: '100%', // Prevent any expansion beyond container
          // Layout based on mode with responsive padding
          ...(layoutMode === 'C' ? {
            display: 'flex',
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
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleKeyDown}
                    style={{ 
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'rgb(255 255 255 / 0.85)',
                      fontWeight: '600',
                      fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                      width: `${Math.min(Math.max(inputValue.length + 1, 3), 5)}ch`, // Cap at 5ch
                      maxWidth: 'clamp(3.5ch, 8vw, 5ch)', // Smaller max to prevent overflow
                      appearance: 'textfield',
                      MozAppearance: 'textfield',
                      WebkitAppearance: 'none'
                    }}
                    aria-label="Stat threshold number"
                    data-testid="number-input"
                  />
                ) : (
                  <button
                    onClick={handleNumberClick}
                    className="hover:bg-white/5 rounded transition-colors"
                    aria-label="Stat threshold number"
                    data-testid="number-display"
                    style={{
                      fontWeight: '600',
                      fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                      padding: 'clamp(0.125em, 0.5vw, 0.25em) clamp(0.25em, 1vw, 0.5em)'
                    }}
                  >
                    {displayValue}
                  </button>
                )}
                
                {/* Percentage symbol for percentage stats */}
                {validation.isPercentage && (
                  <span
                    style={{
                      color: 'rgb(255 255 255 / 0.7)',
                      fontWeight: '500',
                      fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                      marginLeft: '0.1em'
                    }}
                  >
                    %
                  </span>
                )}
                
                {/* Confirm button (only when editing) */}
                {isEditing && (
                  <button
                    onClick={handleConfirmClick}
                    className="text-green-400 hover:text-green-300 transition-colors"
                    title="Confirm"
                    aria-label="Confirm changes"
                    data-testid="confirm-button"
                    style={{
                      marginLeft: '0.5em',
                      width: '1.25em',
                      height: '1.25em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check size="0.75rem" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Line 2: label */}
            <div style={{ textAlign: 'center' }}>
              <span 
                style={{
                  fontWeight: '500',
                  color: 'rgb(255 255 255 / 0.7)',
                  fontSize: 'clamp(0.625rem, 1.5vw, 0.875rem)',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={baseLabel}
              >
                {cleanLabel}
              </span>
            </div>
          </>
        ) : (
          // Mode A & B: Single-line layout
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
            
            {/* Number section */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  style={{ 
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'rgb(255 255 255 / 0.85)',
                    fontWeight: '600',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                    width: `${Math.min(Math.max(inputValue.length + 1, 3), 5)}ch`, // Cap at 5ch
                    maxWidth: 'clamp(3.5ch, 8vw, 5ch)', // Smaller max to prevent overflow
                    appearance: 'textfield',
                    MozAppearance: 'textfield',
                    WebkitAppearance: 'none'
                  }}
                  aria-label="Stat threshold number"
                  data-testid="number-input"
                />
              ) : (
                <button
                  onClick={handleNumberClick}
                  className="hover:bg-white/5 rounded transition-colors"
                  aria-label="Stat threshold number"
                  data-testid="number-display"
                  style={{
                    fontWeight: '600',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                    padding: 'clamp(0.125em, 0.5vw, 0.25em) clamp(0.25em, 1vw, 0.5em)'
                  }}
                >
                  {displayValue}
                </button>
              )}
              
              {/* Percentage symbol for percentage stats */}
              {validation.isPercentage && (
                <span
                  style={{
                    color: 'rgb(255 255 255 / 0.7)',
                    fontWeight: '500',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
                    marginLeft: '0.1em'
                  }}
                >
                  %
                </span>
              )}
              
              {/* Confirm button (only when editing) */}
              {isEditing && (
                <button
                  onClick={handleConfirmClick}
                  className="text-green-400 hover:text-green-300 transition-colors"
                  title="Confirm"
                  aria-label="Confirm changes"
                  data-testid="confirm-button"
                  style={{
                    marginLeft: '0.5em',
                    width: '1.25em',
                    height: '1.25em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Check size="0.75rem" />
                </button>
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
      </div>
      
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