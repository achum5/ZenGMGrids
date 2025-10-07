import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'bbgm-grid-theme',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Enhanced mobile touch handling
    document.body.style.touchAction = 'manipulation';
    (document.body.style as any).webkitTouchCallout = 'none';
    (document.body.style as any).webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';
    
    // Prevent any potential focus issues on mobile
    const handleTouchStart = (e: TouchEvent) => {
      // Don't interfere with actual form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      // Clear any stuck focus states
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });

    root.classList.remove('light', 'dark');
    root.classList.add('dark');
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  const value = {
    theme,
    setTheme: () => {},
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};