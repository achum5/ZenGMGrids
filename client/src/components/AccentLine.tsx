import { useState, useEffect } from 'react';
import './accent-line.css';

export const AccentLine = ({ isHovered }: { isHovered: boolean }) => {
  const [isBright, setIsBright] = useState(false);

  useEffect(() => {
    setIsBright(isHovered);
  }, [isHovered]);

  return (
    <div
      className={`header-accent-line ${isBright ? 'header-accent-line-bright' : ''}`}
    />
  );
};
