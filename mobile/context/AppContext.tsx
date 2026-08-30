import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchHealth } from "../lib/api";
import { loadProfile, saveProfile as persistProfile } from "../lib/db";
import type { AnalyzeResponse, HealthResponse, SessionRecord } from "../lib/types";

interface AppContextValue {
  session: SessionRecord | null;
  startSession: (name: string) => Promise<void>;
  lastResult: AnalyzeResponse | null;
  lastPhotoUri: string | null;
  setLastScreening: (result: AnalyzeResponse, photoUri: string) => void;
  health: HealthResponse | null;
  apiOnline: boolean;
  refreshHealth: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [lastResult, setLastResult] = useState<AnalyzeResponse | null>(null);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [apiOnline, setApiOnline] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setApiOnline(true);
    } catch {
      setHealth(null);
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    loadProfile().then((profile) => {
      if (profile) {
        setSession({ name: profile.name, accepted: true, at: Date.now() });
      }
    });
    refreshHealth();
  }, [refreshHealth]);

  const startSession = useCallback(async (name: string) => {
    const record: SessionRecord = { name, accepted: true, at: Date.now() };
    await persistProfile(name, true);
    setSession(record);
  }, []);

  const setLastScreening = useCallback((result: AnalyzeResponse, photoUri: string) => {
    setLastResult(result);
    setLastPhotoUri(photoUri);
  }, []);

  const value = useMemo(
    () => ({
      session,
      startSession,
      lastResult,
      lastPhotoUri,
      setLastScreening,
      health,
      apiOnline,
      refreshHealth,
    }),
    [
      session,
      startSession,
      lastResult,
      lastPhotoUri,
      setLastScreening,
      health,
      apiOnline,
      refreshHealth,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
