import React, { useEffect, useRef, useState } from 'react';

interface ResponsiveTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export function ResponsiveText({ text, className = '', style = {}, 'data-testid': testId }: ResponsiveTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(100); // Percentage
  const [shouldWrap, setShouldWrap] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !textRef.current) return;

      const container = containerRef.current;
      const textElement = textRef.current;

      // Reset to initial state
      setFontSize(100);
      setShouldWrap(false);
      
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        if (!container || !textElement) return;

        // Reset styles for measurement
        textElement.style.fontSize = '100%';
        textElement.style.whiteSpace = 'nowrap';

        const containerRect = container.getBoundingClientRect();
        const textRect = textElement.getBoundingClientRect();

        // Only proceed if we have valid dimensions
        if (containerRect.width === 0 || containerRect.height === 0) return;

        // Check if text overflows horizontally (leave 8px padding total)
        if (textRect.width > containerRect.width - 8) {
          // First try wrapping for multi-word text
          if (text.includes(' ')) {
            textElement.style.whiteSpace = 'normal';
            setShouldWrap(true);
            
            // Check again after wrapping
            requestAnimationFrame(() => {
              if (!container || !textElement) return;
              
              const wrappedTextRect = textElement.getBoundingClientRect();
              const currentContainerRect = container.getBoundingClientRect();
              
              // If still overflows after wrapping, or if single line still too wide, shrink
              if (wrappedTextRect.height > currentContainerRect.height - 8 || 
                  wrappedTextRect.width > currentContainerRect.width - 8) {
                
                // Calculate shrink factor more conservatively
                const widthRatio = (currentContainerRect.width - 8) / wrappedTextRect.width;
                const heightRatio = (currentContainerRect.height - 8) / wrappedTextRect.height;
                const shrinkFactor = Math.min(widthRatio, heightRatio, 1);
                
                // Apply shrinking with a reasonable minimum (65%)
                const newFontSize = Math.max(shrinkFactor * 100, 65);
                setFontSize(newFontSize);
              }
            });
          } else {
            // Single word - just shrink without wrapping
            const shrinkFactor = (containerRect.width - 8) / textRect.width;
            const newFontSize = Math.max(shrinkFactor * 100, 65);
            setFontSize(newFontSize);
          }
        }
      });
    };

    // Check on mount and when text changes
    checkOverflow();

    // Check on window resize with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkOverflow, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [text]);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col justify-center h-full w-full ${className}`}
      style={style}
      data-testid={testId}
    >
      <div
        ref={textRef}
        className="font-medium text-center leading-tight"
        style={{
          fontSize: `${fontSize}%`,
          whiteSpace: shouldWrap ? 'normal' : 'nowrap',
          wordBreak: 'keep-all',
          hyphens: 'none',
          overflowWrap: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}