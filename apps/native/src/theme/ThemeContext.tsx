import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import {
  type NetwatchThemeColors,
  type NetwatchThemeName,
  THEME_STORAGE_KEY,
  colorsForTheme,
  obsidianColors,
} from './tokens';

type ThemeContextValue = {
  theme: NetwatchThemeName;
  colors: NetwatchThemeColors;
  isDark: boolean;
  ready: boolean;
  setTheme: (next: NetwatchThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parseStored(value: string | null): NetwatchThemeName | null {
  if (value === 'luminous' || value === 'obsidian') return value;
  return null;
}

export function NetwatchThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<NetwatchThemeName>('obsidian');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await safeGetItem(THEME_STORAGE_KEY);
        const parsed = parseStored(saved);
        if (parsed) setThemeState(parsed);
      } catch {
        /* default obsidian */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setTheme = useCallback((next: NetwatchThemeName) => {
    setThemeState(next);
    void safeSetItem(THEME_STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'obsidian' ? 'luminous' : 'obsidian';
      void safeSetItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: colorsForTheme(theme),
      isDark: theme === 'obsidian',
      ready,
      setTheme,
      toggleTheme,
    }),
    [theme, ready, setTheme, toggleTheme]
  );

  if (!ready) {
    return (
      <ThemeContext.Provider
        value={{
          theme: 'obsidian',
          colors: obsidianColors,
          isDark: true,
          ready: false,
          setTheme,
          toggleTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useNetwatchTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useNetwatchTheme must be used within NetwatchThemeProvider');
  }
  return ctx;
}
