import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { storageService } from '../services/storageService';
import { getPalette } from '../theme/theme';
import type { AppSettings, ThemeMode } from '../types';

interface ThemeContextValue {
  mode: ThemeMode;
  palette: ReturnType<typeof getPalette>;
  notificationsEnabled: boolean;
  toggleTheme: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    themeMode: 'light',
    notificationsEnabled: true,
  });

  useEffect(() => {
    storageService.getSettings().then(setSettings).catch(() => undefined);
  }, []);

  const persistSettings = async (next: AppSettings) => {
    setSettings(next);
    await storageService.saveSettings(next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: settings.themeMode,
      palette: getPalette(settings.themeMode),
      notificationsEnabled: settings.notificationsEnabled,
      toggleTheme: async () => {
        const next: AppSettings = {
          ...settings,
          themeMode: settings.themeMode === 'light' ? 'dark' : 'light',
        };
        await persistSettings(next);
      },
      toggleNotifications: async () => {
        const next: AppSettings = {
          ...settings,
          notificationsEnabled: !settings.notificationsEnabled,
        };
        await persistSettings(next);
      },
    }),
    [settings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider.');
  }

  return context;
}
