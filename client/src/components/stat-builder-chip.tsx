import { useState, useCallback, useEffect, useRef } from 'react';
import { parseAchievementLabel, generateUpdatedLabel, type ParsedAchievement } from '@/lib/editable-achievements';
import { Check } from 'lucide-react';

interface StatBuilderChipProps {
  label: string;
  onNumberChange?: (newNumber: number, newLabel: string) => void;
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
  if (lowerLabel.includes('%') || lowerLabel.includes('percentage')) {
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
  className,
  sport
}: StatBuilderChipProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(label, sport));
  const [operator, setOperator] = useState<Operator>(() => parseOperator(label));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [validation, setValidation] = useState<StatValidation>(() => getStatValidation(label));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Update parsed achievement when label changes
  useEffect(() => {
    const newParsed = parseAchievementLabel(label, sport);
    setParsed(newParsed);
    setInputValue(newParsed.number.toString());
    setOperator(parseOperator(label));
    setValidation(getStatValidation(label));
    setError(null);
  }, [label, sport]);

  // If not editable, render as plain text
  if (!parsed.isEditable) {
    return <span className={className}>{label}</span>;
  }

  const handleOperatorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOperator(prev => prev === '≥' ? '≤' : '≥');
  }, []);

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
    
    // Strip non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;
    
    setInputValue(formattedValue);
    setError(null);
  }, []);

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

  const commitValue = useCallback(() => {
    const validationResult = validateInput(inputValue, validation);
    
    if (!validationResult.isValid) {
      setError(validationResult.errorMessage || 'Invalid input');
      return;
    }
    
    const newNumber = parseFloat(inputValue);
    if (newNumber !== parsed.number && onNumberChange) {
      const newLabel = generateUpdatedLabel(parsed, newNumber);
      onNumberChange(newNumber, newLabel);
    }
    
    setIsEditing(false);
    setError(null);
  }, [inputValue, validation, parsed, onNumberChange]);

  const cancelEdit = useCallback(() => {
    setInputValue(parsed.number.toString());
    setIsEditing(false);
    setError(null);
  }, [parsed.number]);

  const handleInputBlur = useCallback(() => {
    // Small delay to allow click on confirm button
    setTimeout(() => {
      if (isEditing) {
        commitValue();
      }
    }, 100);
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

  // Format display value with thousands separators
  const displayValue = isEditing ? inputValue : formatDisplayNumber(parsed.number);
  
  // Extract the clean label without operator symbols and numbers
  const cleanLabel = parsed.suffix.replace(/^\+?\s*/, '').trim() || parsed.originalLabel.replace(/^[^a-zA-Z]*\d+[^a-zA-Z]*/, '').trim();

  return (
    <div className={`relative w-full ${className || ''}`} style={{ margin: '0 8px' }}>
      {/* Main chip */}
      <div 
        className={`
          w-full flex items-center rounded-xl cursor-pointer transition-all relative
          bg-white/6 border border-white/12 text-white/85 hover:bg-white/8
          h-11 lg:h-10 px-2.5
          ${isEditing ? 'ring-2 ring-blue-400/40' : ''}
          ${error ? 'border-red-400/60' : ''}
        `}
        title="Chosen stat threshold"
        style={{ maxWidth: 'calc(100% - 16px)' }}
      >
        {/* Operator button - fixed width */}
        <button
          onClick={handleOperatorClick}
          className="flex-shrink-0 w-8 h-6 flex items-center justify-center rounded font-medium hover:bg-white/10 transition-colors text-base lg:text-base"
          title="Threshold operator"
          aria-label="Stat threshold operator"
          data-testid="operator-button"
        >
          {operator}
        </button>
        
        {/* Gap */}
        <div className="w-2 flex-shrink-0" />
        
        {/* Number section */}
        <div className="relative flex items-center min-w-0 flex-shrink-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none text-white/85 font-semibold w-full min-w-0 text-base lg:text-base"
              style={{ 
                width: `${Math.max(inputValue.length + 1, 3)}ch`,
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
              className="font-semibold hover:bg-white/5 rounded px-1 py-0.5 transition-colors text-base lg:text-base"
              aria-label="Stat threshold number"
              data-testid="number-display"
            >
              {displayValue}
            </button>
          )}
          
          {/* Confirm button (only when editing) */}
          {isEditing && (
            <button
              onClick={handleConfirmClick}
              className="ml-2 w-5 h-5 flex items-center justify-center text-green-400 hover:text-green-300 transition-colors"
              title="Confirm"
              aria-label="Confirm changes"
              data-testid="confirm-button"
            >
              <Check size={12} />
            </button>
          )}
        </div>
        
        {/* Gap */}
        <div className="w-2 flex-shrink-0" />
        
        {/* Label section - responsive sizing and truncation */}
        <span 
          className="flex-1 font-medium text-white/70 truncate text-sm lg:text-sm xl:text-sm min-w-0"
          style={{ 
            maxWidth: window.innerWidth <= 599 ? '60%' : '70%'
          }}
          title={cleanLabel}
        >
          {cleanLabel}
        </span>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-400 whitespace-nowrap z-10">
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