import { useState, useCallback, useEffect } from 'react';
import { parseAchievementLabel, generateUpdatedLabel, type ParsedAchievement } from '@/lib/editable-achievements';

interface EditableAchievementLabelProps {
  label: string;
  onNumberChange?: (newNumber: number, newLabel: string) => void;
  className?: string;
  sport?: string;
}

export function EditableAchievementLabel({ 
  label, 
  onNumberChange, 
  className,
  sport
}: EditableAchievementLabelProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(label, sport));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update parsed achievement when label changes
  useEffect(() => {
    const newParsed = parseAchievementLabel(label, sport);
    setParsed(newParsed);
    setInputValue(newParsed.number.toString());
  }, [label, sport]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numeric input with optional decimal point and digits
    if (/^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    
    const newNumber = parseFloat(inputValue) || 0;
    if (onNumberChange) {
      const newLabel = generateUpdatedLabel(parsed, newNumber).trim();
      onNumberChange(newNumber, newLabel);
    }
  }, [inputValue, parsed, onNumberChange]);

  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    // Stop propagation to prevent triggering parent dropdown
    e.stopPropagation();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    // Also stop mousedown to be extra safe
    e.stopPropagation();
  }, []);

  // If not editable, render as plain text
  if (!parsed.isEditable) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={className}>
      {parsed.prefix}
      <input
        type="number"
        pattern="[0-9]*"
        inputMode="decimal"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        className={`
          inline-block outline-none font-inherit leading-inherit cursor-text min-w-0 transition-colors
          ${isEditing ? 
            'bg-white dark:bg-gray-800 border border-black dark:border-white text-black dark:text-white rounded px-1' : 
            'bg-white dark:bg-gray-800 border border-black dark:border-white text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1'
          }
        `}
        style={{
          width: `${Math.max(inputValue.length + 1, 3)}ch`,
          minWidth: '3ch'
        }}
        data-testid={`editable-number-${parsed.number}`}
      />
      +{parsed.suffix}
    </span>
  );
}

// Alternative version for when we need just the number without "+"
export function EditableAchievementLabelNoPlus({ 
  label, 
  onNumberChange, 
  className,
  sport
}: EditableAchievementLabelProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(label, sport));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update parsed achievement when label changes
  useEffect(() => {
    const newParsed = parseAchievementLabel(label, sport);
    setParsed(newParsed);
    setInputValue(newParsed.number.toString());
  }, [label, sport]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numeric input with optional decimal point and digits
    if (/^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    
    const newNumber = parseFloat(inputValue) || 0;
    if (newNumber !== parsed.number && onNumberChange) {
      const newLabel = generateUpdatedLabel(parsed, newNumber).trim();
      onNumberChange(newNumber, newLabel);
    }
  }, [inputValue, parsed, onNumberChange]);

  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    // Stop propagation to prevent triggering parent dropdown
    e.stopPropagation();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    // Also stop mousedown to be extra safe
    e.stopPropagation();
  }, []);

  // If not editable, render as plain text
  if (!parsed.isEditable) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={className}>
      {parsed.prefix}
      <input
        type="number"
        pattern="[0-9]*"
        inputMode="decimal"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        className={`
          inline-block outline-none font-inherit leading-inherit cursor-text min-w-0 transition-colors
          ${isEditing ? 
            'bg-white dark:bg-gray-800 border border-black dark:border-white text-black dark:text-white rounded px-1' : 
            'bg-white dark:bg-gray-800 border border-black dark:border-white text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1'
          }
        `}
        style={{
          width: `${Math.max(inputValue.length + 1, 3)}ch`,
          minWidth: '3ch'
        }}
        data-testid={`editable-number-${parsed.number}`}
      />
      {parsed.suffix}
    </span>
  );
}
