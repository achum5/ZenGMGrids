import { useState, useEffect } from 'react';
import './accent-line.css';

export const AccentLine = ({ isHovered, color }: { isHovered: boolean; color?: string }) => {
  const [isBright, setIsBright] = useState(false);

  useEffect(() => {
    setIsBright(isHovered);
  }, [isHovered]);

  return (
    <div
      className={`header-accent-line ${isBright ? 'header-accent-line-bright' : ''}`}
      style={color ? { background: color, boxShadow: 'none', animation: 'none' } : {}}
    />
  );
};
