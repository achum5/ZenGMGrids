import React, { useState, useEffect } from 'react';
import './converging-light.css';

interface DOMRects {
  grid: DOMRect;
  rowHeader: DOMRect;
  colHeader: DOMRect;
  cell: DOMRect;
}

interface ConvergingLightProps {
  domRects: DOMRects;
  onAnimationEnd: () => void;
}

export const ConvergingLight: React.FC<ConvergingLightProps> = ({ domRects, onAnimationEnd }) => {
  const { grid, rowHeader, colHeader, cell } = domRects;

  // The animation is self-contained in CSS and runs for a fixed duration.
  // We'll notify the parent component when it's over.
  useEffect(() => {
    const timer = setTimeout(onAnimationEnd, 1600); // Match total animation time + buffer
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  // Calculate positions relative to the grid container
  const relative = (rect: DOMRect) => ({
    top: rect.top - grid.top,
    left: rect.left - grid.left,
    width: rect.width,
    height: rect.height,
  });

  const relRow = relative(rowHeader);
  const relCol = relative(colHeader);
  const relCell = relative(cell);

  return (
    <div className="converging-light-overlay">
      {/* 1. Header Flashes */}
      <div
        className="light-element header-flash"
        style={{
          top: `${relRow.top}px`,
          left: `${relRow.left}px`,
          width: `${relRow.width}px`,
          height: `${relRow.height}px`,
          boxShadow: '0 0 10px 3px currentColor', // Halo effect
          borderRadius: '50%',
        }}
      />
      <div
        className="light-element header-flash"
        style={{
          top: `${relCol.top + relCol.height - 2}px`, // Underline
          left: `${relCol.left}px`,
          width: `${relCol.width}px`,
          height: '2px',
        }}
      />

      {/* 2. Twin Travel Streams */}
      <div
        className="light-element light-stream-y"
        style={{
          top: `${relCol.top + relCol.height}px`,
          left: `${relCell.left + relCell.width / 2 - 1}px`,
          height: `${relCell.top - (relCol.top + relCol.height)}px`,
          transformOrigin: 'top',
        }}
      />
      <div
        className="light-element light-stream-x"
        style={{
          top: `${relCell.top + relCell.height / 2 - 1}px`,
          left: `${relRow.left + relRow.width}px`,
          width: `${relCell.left - (relRow.left + relRow.width)}px`,
          transformOrigin: 'left',
        }}
      />

      {/* 3 & 4. Cell Border Wrap & Bloom */}
      <div
        className="cell-border-wrap"
        style={{
          top: `${relCell.top}px`,
          left: `${relCell.left}px`,
          width: `${relCell.width}px`,
          height: `${relCell.height}px`,
        }}
      />
    </div>
  );
};
