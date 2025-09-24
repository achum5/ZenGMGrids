import { useState, useCallback, useEffect } from 'react';
import { parseAchievementLabel, generateUpdatedLabel, type ParsedAchievement } from '@/lib/editable-achievements';

interface EditableAchievementLabelProps {
  label: string;
  onNumberChange?: (newNumber: number, newLabel: string) => void;
  className?: string;
}

export function EditableAchievementLabel({ 
  label, 
  onNumberChange, 
  className 
}: EditableAchievementLabelProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(label));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update parsed achievement when label changes
  useEffect(() => {
    const newParsed = parseAchievementLabel(label);
    setParsed(newParsed);
    setInputValue(newParsed.number.toString());
  }, [label]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numeric input (integers only, no decimals)
    if (/^\d*$/.test(value)) {
      setInputValue(value);
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    
    const newNumber = parseInt(inputValue) || 0;
    if (newNumber !== parsed.number && onNumberChange) {
      const newLabel = generateUpdatedLabel(parsed, newNumber);
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

  // If not editable, render as plain text
  if (!parsed.isEditable) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={className}>
      {parsed.prefix}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        className={`
          inline-block bg-transparent border-none outline-none
          text-inherit font-inherit leading-inherit
          ${isEditing ? 'bg-muted/20 rounded px-1' : ''}
          cursor-text min-w-0
        `}
        style={{
          width: `${Math.max(inputValue.length, 2)}ch`,
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
  className 
}: EditableAchievementLabelProps) {
  const [parsed, setParsed] = useState<ParsedAchievement>(() => parseAchievementLabel(label));
  const [inputValue, setInputValue] = useState<string>(() => parsed.number.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Update parsed achievement when label changes
  useEffect(() => {
    const newParsed = parseAchievementLabel(label);
    setParsed(newParsed);
    setInputValue(newParsed.number.toString());
  }, [label]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numeric input (integers only, no decimals)
    if (/^\d*$/.test(value)) {
      setInputValue(value);
    }
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    
    const newNumber = parseInt(inputValue) || 0;
    if (newNumber !== parsed.number && onNumberChange) {
      // Generate label without automatic "+" insertion for flexibility
      const formattedNumber = newNumber.toLocaleString();
      const newLabel = `${parsed.prefix}${formattedNumber}${parsed.suffix}`;
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

  // If not editable, render as plain text
  if (!parsed.isEditable) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={className}>
      {parsed.prefix}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        className={`
          inline-block bg-transparent border-none outline-none
          text-inherit font-inherit leading-inherit
          ${isEditing ? 'bg-muted/20 rounded px-1' : ''}
          cursor-text min-w-0
        `}
        style={{
          width: `${Math.max(inputValue.length, 2)}ch`,
        }}
        data-testid={`editable-number-${parsed.number}`}
      />
      {parsed.suffix}
    </span>
  );
}