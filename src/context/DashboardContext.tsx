import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { api, statePush } from '../services/iobroker';
import { createDefaultConfig } from '../utils/defaultConfig';
import { setSoundEnabled, setSoundVolume } from '../utils/sounds';
import type { DashboardConfig, DashboardPage, WidgetConfig, GridPos, Breakpoint, Layouts } from '../types/dashboard';

type ConnState = 'connecting' | 'online' | 'offline';

// Grid ging von 3 auf 9 Spalten (desktop/tablet) bzw. 1 auf 3 (phone) — ×3 skaliert
// bestehende Layouts verlustfrei auf die neue, feinere Auflösung.
function migrateGridV2(cfg: DashboardConfig): DashboardConfig {
  if ((cfg.version ?? 0) >= 4) return cfg;
  const scaleLayouts = (layouts: Layouts): Layouts => {
    const out: Layouts = {};
    (Object.keys(layouts) as Breakpoint[]).forEach(bp => {
      const pos = layouts[bp];
      if (pos) out[bp] = { ...pos, x: pos.x * 3, w: pos.w * 3 };
    });
    return out;
  };
  return {
    ...cfg,
    version: 4,
    pages: cfg.pages.map(p => ({
      ...p,
      widgets: p.widgets.map(w => ({ ...w, layouts: scaleLayouts(w.layouts) })) as WidgetConfig[],
    })),
  };
}

type DashboardContextValue = {
  config: DashboardConfig;
  pages: DashboardPage[];
  activePageId: string;
  setActivePageId: (id: string) => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  conn: ConnState;

  // Config mutation
  updateSettings: (patch: Partial<DashboardConfig['settings']>) => void;
  createPage: (label: string) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, label: string) => void;

  // Widget mutation
  addWidget: (pageId: string, widget: WidgetConfig) => void;
  updateWidget: (pageId: string, widgetId: string, patch: Partial<WidgetConfig>) => void;
  removeWidget: (pageId: string, widgetId: string) => void;
  updateLayouts: (pageId: string, layouts: Record<string, GridPos>, bp: Breakpoint) => void;
  moveWidgetToPage: (fromPageId: string, toPageId: string, widgetId: string) => void;

  // Named dashboards
  savedNames: string[];
  saveDashboard: (name: string) => Promise<void>;
  loadDashboard: (name: string) => Promise<void>;
  deleteSavedDashboard: (name: string) => Promise<void>;
  refreshSaved: () => void;
};

const Ctx = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DashboardConfig>(createDefaultConfig);
  const [activePageId, setActivePageId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [conn, setConn] = useState<ConnState>('connecting');
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    statePush.connect();
    api.getConfig()
      .then(cfg => {
        const migrated = migrateGridV2(cfg);
        setConfig(migrated);
        setActivePageId(migrated.pages[0]?.id ?? '');
        const s = migrated.settings.soundSettings;
        if (s) { setSoundEnabled(s.enabled); setSoundVolume(s.volume); }
        setConn('online');
        if (migrated !== cfg) api.saveConfig(migrated).catch(console.error);
      })
      .catch(() => {
        setActivePageId(createDefaultConfig().pages[0].id);
        setConn('offline');
      });
    refreshSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist (debounced) ───────────────────────────────────────────────────
  const persist = useCallback((cfg: DashboardConfig) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveConfig(cfg).catch(console.error);
    }, 800);
  }, []);

  const patch = useCallback((updater: (prev: DashboardConfig) => DashboardConfig) => {
    setConfig(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  // ── Settings ───────────────────────────────────────────────────────────────
  const updateSettings = useCallback((p: Partial<DashboardConfig['settings']>) => {
    patch(c => ({ ...c, settings: { ...c.settings, ...p } }));
    if (p.soundSettings) {
      setSoundEnabled(p.soundSettings.enabled);
      setSoundVolume(p.soundSettings.volume);
    }
  }, [patch]);

  // ── Pages ──────────────────────────────────────────────────────────────────
  const createPage = useCallback((label: string) => {
    const id = `page-${Date.now()}`;
    patch(c => ({ ...c, pages: [...c.pages, { id, label, widgets: [] }] }));
    setActivePageId(id);
  }, [patch]);

  const deletePage = useCallback((id: string) => {
    patch(c => {
      const pages = c.pages.filter(p => p.id !== id);
      if (pages.length === 0) pages.push({ id: 'page-1', label: 'Home', widgets: [] });
      return { ...c, pages };
    });
    setActivePageId(prev => (prev === id ? config.pages.find(p => p.id !== id)?.id ?? '' : prev));
  }, [patch, config.pages]);

  const renamePage = useCallback((id: string, label: string) => {
    patch(c => ({ ...c, pages: c.pages.map(p => p.id === id ? { ...p, label } : p) }));
  }, [patch]);

  // ── Widgets ────────────────────────────────────────────────────────────────
  const addWidget = useCallback((pageId: string, widget: WidgetConfig) => {
    patch(c => ({
      ...c,
      pages: c.pages.map(p => p.id === pageId ? { ...p, widgets: [...p.widgets, widget] } : p),
    }));
  }, [patch]);

  const updateWidget = useCallback((pageId: string, widgetId: string, p: Partial<WidgetConfig>) => {
    patch(c => ({
      ...c,
      pages: c.pages.map(pg =>
        pg.id === pageId
          ? { ...pg, widgets: pg.widgets.map(w => w.id === widgetId ? { ...w, ...p } as WidgetConfig : w) }
          : pg,
      ),
    }));
  }, [patch]);

  const removeWidget = useCallback((pageId: string, widgetId: string) => {
    patch(c => ({
      ...c,
      pages: c.pages.map(p =>
        p.id === pageId ? { ...p, widgets: p.widgets.filter(w => w.id !== widgetId) } : p,
      ),
    }));
  }, [patch]);

  const updateLayouts = useCallback((pageId: string, layouts: Record<string, GridPos>, bp: Breakpoint) => {
    patch(c => ({
      ...c,
      pages: c.pages.map(p =>
        p.id !== pageId ? p : {
          ...p,
          widgets: p.widgets.map(w => {
            const pos = layouts[w.id];
            if (!pos) return w;
            return { ...w, layouts: { ...w.layouts, [bp]: pos } };
          }),
        },
      ),
    }));
  }, [patch]);

  const moveWidgetToPage = useCallback((fromId: string, toId: string, widgetId: string) => {
    patch(c => {
      let widget: WidgetConfig | undefined;
      const pages = c.pages.map(p => {
        if (p.id === fromId) {
          widget = p.widgets.find(w => w.id === widgetId);
          return { ...p, widgets: p.widgets.filter(w => w.id !== widgetId) };
        }
        return p;
      });
      if (!widget) return c;
      return {
        ...c,
        pages: pages.map(p => p.id === toId ? { ...p, widgets: [...p.widgets, widget!] } : p),
      };
    });
  }, [patch]);

  // ── Named dashboards ───────────────────────────────────────────────────────
  const refreshSaved = useCallback(() => {
    api.listDashboards().then(setSavedNames).catch(() => {});
  }, []);

  const saveDashboard = useCallback(async (name: string) => {
    await api.saveDashboard(name, config);
    refreshSaved();
  }, [config, refreshSaved]);

  const loadDashboard = useCallback(async (name: string) => {
    const cfg = await api.loadDashboard(name);
    const migrated = migrateGridV2(cfg);
    setConfig(migrated);
    setActivePageId(migrated.pages[0]?.id ?? '');
    if (migrated !== cfg) api.saveConfig(migrated).catch(console.error);
  }, []);

  const deleteSavedDashboard = useCallback(async (name: string) => {
    await api.deleteDashboard(name);
    refreshSaved();
  }, [refreshSaved]);

  const value = useMemo<DashboardContextValue>(() => ({
    config,
    pages: config.pages,
    activePageId,
    setActivePageId,
    editMode,
    setEditMode,
    conn,
    updateSettings,
    createPage,
    deletePage,
    renamePage,
    addWidget,
    updateWidget,
    removeWidget,
    updateLayouts,
    moveWidgetToPage,
    savedNames,
    saveDashboard,
    loadDashboard,
    deleteSavedDashboard,
    refreshSaved,
  }), [
    config, activePageId, editMode, conn,
    updateSettings, createPage, deletePage, renamePage,
    addWidget, updateWidget, removeWidget, updateLayouts, moveWidgetToPage,
    savedNames, saveDashboard, loadDashboard, deleteSavedDashboard, refreshSaved,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider');
  return ctx;
}
