import { useState, useEffect } from 'react';


export const AccentLine = ({ accentColor }: { accentColor?: string }) => {
  return (
    <div
      style={{ backgroundColor: accentColor || 'hsl(var(--primary))' }}
    />
  );
};
