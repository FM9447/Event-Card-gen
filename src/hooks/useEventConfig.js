import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchConfig, saveConfig, resetConfig as apiResetConfig } from '../services/api';

const getDefaultConfig = (slug) => ({
  slug,
  eventName: 'Poster Gen Event',
  location: 'KOZHIKODE – IOCOD, Sahya Building, Govt. Cyber Park',
  date: 'Sunday, June 21, 2026',
  time: '10:30 AM',
  headerLogo: null,
  headerLogoHeight: 40,
  templateUrl: null,
  templatePublicId: null,
  templates: [],
  backgroundImageUrl: null,
  backgroundImagePublicId: null,
  bannerUrl: null,
  bannerPublicId: null,
  photoX: 540,
  photoY: 470,
  photoRadius: 200,
  photoWidth: 400,
  photoHeight: 400,
  photoShape: 'circle',
  photoRotation: 0,
  photoBorderEnabled: false,
  photoBorderWidth: 8,
  photoBorderType: 'solid',
  photoBorderColor: '#4285F4',
  photoBorderGradientStart: '#4285F4',
  photoBorderGradientEnd: '#34A853',
  photoBackgroundEnabled: false,
  photoBackgroundType: 'solid',
  photoBackgroundColor: '#E8F0FE',
  photoBackgroundGradientStart: '#4285F4',
  photoBackgroundGradientEnd: '#34A853',
  backgroundOpacity: 93,
  themePrimary: '#4285F4',
  themeSecondary: '#34A853',
  themeDark: '#1A1A1A',
  themeCardBg: '#FFFFFF',
  themeCardOpacity: 75,
  themeHeaderBg: '#F8F9FA',
  themeHeaderBgOpacity: 85,
  themeHeaderText: '#1A1A1A',
  partners: [],
});

// Debounce helper — avoids a PUT on every single keystroke
function useDebouncedCallback(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export function useEventConfig(slug, sessionEmail, sessionPassword) {
  const STORAGE_KEY = `event-config-${slug}`;
  const DEFAULT_CONFIG = getDefaultConfig(slug);

  // Start from localStorage so the UI renders immediately (no loading flash)
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [syncing, setSyncing] = useState(false); // true while saving to MongoDB
  const [apiOk,   setApiOk]   = useState(true);  // false if server unreachable

  // Reset config locally if slug changes to avoid displaying state of previous slug
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setConfig(stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG);
    } catch {
      setConfig(DEFAULT_CONFIG);
    }
  }, [slug]);

  // ── On mount/slug change: fetch from MongoDB (authoritative source) ───────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchConfig(slug);
        if (!cancelled && remote) {
          const merged = { ...DEFAULT_CONFIG, ...remote };
          setConfig(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          setApiOk(true);
        }
      } catch (err) {
        console.warn('Could not reach API, using cached config:', err.message);
        setApiOk(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Persist to MongoDB (debounced 800ms) ──────────────────────────────────
  const persistToServer = useDebouncedCallback(
    useCallback(async (nextConfig) => {
      setSyncing(true);
      try {
        await saveConfig(slug, nextConfig, sessionEmail, sessionPassword);
        setApiOk(true);
      } catch (err) {
        console.warn('API save failed, changes stored locally:', err.message);
        setApiOk(false);
      } finally {
        setSyncing(false);
      }
    }, [slug, sessionEmail, sessionPassword]),
    800
  );

  // Core setter — updates state, localStorage, and schedules a server sync
  const applyUpdate = useCallback((nextConfig) => {
    setConfig(nextConfig);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig)); } catch {}
    persistToServer(nextConfig);
  }, [persistToServer, STORAGE_KEY]);

  // ── Public API ────────────────────────────────────────────────────────────

  const updateConfig = useCallback((patch) =>
    applyUpdate(prev => ({ ...prev, ...patch })),
  [applyUpdate]);

  // Needed because applyUpdate depends on prev state via closure
  const updateConfigFn = (patch) =>
    setConfig(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistToServer(next);
      return next;
    });

  const updatePartner = (id, patch) =>
    setConfig(prev => {
      const next = {
        ...prev,
        partners: prev.partners.map(p => p.id === id ? { ...p, ...patch } : p),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistToServer(next);
      return next;
    });

  const addPartner = (name = 'New Partner', logo = null) =>
    setConfig(prev => {
      const next = {
        ...prev,
        partners: [...prev.partners, { id: Date.now().toString(), name, logo }],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistToServer(next);
      return next;
    });

  const removePartner = (id) =>
    setConfig(prev => {
      const next = { ...prev, partners: prev.partners.filter(p => p.id !== id) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistToServer(next);
      return next;
    });

  const reorderPartners = (newOrder) =>
    setConfig(prev => {
      const next = { ...prev, partners: newOrder };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistToServer(next);
      return next;
    });

  const resetConfig = async () => {
    try {
      const fresh = await apiResetConfig(slug, sessionEmail, sessionPassword);
      const merged = { ...DEFAULT_CONFIG, ...fresh };
      setConfig(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Fallback: reset locally
      setConfig(DEFAULT_CONFIG);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
    }
  };

  return {
    config,
    syncing,
    apiOk,
    updateConfig: updateConfigFn,
    updatePartner,
    addPartner,
    removePartner,
    reorderPartners,
    resetConfig,
  };
}
