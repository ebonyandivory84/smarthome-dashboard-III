import { Suspense, lazy, useMemo, useCallback, useState, useRef } from 'react';
// @ts-ignore – @types/react-grid-layout uses export= which is incompatible with verbatimModuleSyntax; Vite bundles fine
import { ResponsiveGridLayout } from 'react-grid-layout';
// @ts-ignore
import type { Layout as RGLItem } from 'react-grid-layout';
import { useDashboard } from '../../context/DashboardContext';
import { WidgetEditorModal } from '../modals/WidgetEditorModal';
import type { WidgetConfig, GridPos, Breakpoint } from '../../types/dashboard';

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(window.innerWidth);
  const observe = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return { ref: observe, width };
}

// ── Lazy widget imports ────────────────────────────────────────────────────────
const StateWidget     = lazy(() => import('../widgets/StateWidget'));
const CameraWidget    = lazy(() => import('../widgets/CameraWidget'));
const CameraTalkWidget = lazy(() => import('../widgets/CameraTalkWidget'));
const SolarWidget     = lazy(() => import('../widgets/SolarWidget'));
const EnergyWidget    = lazy(() => import('../widgets/EnergyWidget'));
const WallboxWidget   = lazy(() => import('../widgets/WallboxWidget'));
const HeatingWidget   = lazy(() => import('../widgets/HeatingWidget'));
const GrafanaWidget   = lazy(() => import('../widgets/GrafanaWidget'));
const WeatherWidget   = lazy(() => import('../widgets/WeatherWidget'));
const NumpadWidget    = lazy(() => import('../widgets/NumpadWidget'));
const LinkWidget      = lazy(() => import('../widgets/LinkWidget'));
const LogWidget       = lazy(() => import('../widgets/LogWidget'));
const ScriptWidget    = lazy(() => import('../widgets/ScriptWidget'));
const SystemStatsWidget = lazy(() => import('../widgets/SystemStatsWidget'));

const WIDGET_MAP: Record<string, React.ComponentType<{ widget: WidgetConfig }>> = {
  state: StateWidget as React.ComponentType<{ widget: WidgetConfig }>,
  camera: CameraWidget as React.ComponentType<{ widget: WidgetConfig }>,
  cameraTalk: CameraTalkWidget as React.ComponentType<{ widget: WidgetConfig }>,
  solar: SolarWidget as React.ComponentType<{ widget: WidgetConfig }>,
  energy: EnergyWidget as React.ComponentType<{ widget: WidgetConfig }>,
  wallbox: WallboxWidget as React.ComponentType<{ widget: WidgetConfig }>,
  heating: HeatingWidget as React.ComponentType<{ widget: WidgetConfig }>,
  grafana: GrafanaWidget as React.ComponentType<{ widget: WidgetConfig }>,
  weather: WeatherWidget as React.ComponentType<{ widget: WidgetConfig }>,
  numpad: NumpadWidget as React.ComponentType<{ widget: WidgetConfig }>,
  link: LinkWidget as React.ComponentType<{ widget: WidgetConfig }>,
  log: LogWidget as React.ComponentType<{ widget: WidgetConfig }>,
  script: ScriptWidget as React.ComponentType<{ widget: WidgetConfig }>,
  systemStats: SystemStatsWidget as React.ComponentType<{ widget: WidgetConfig }>,
};

const BREAKPOINTS = { desktop: 1280, tablet: 768, phone: 0 } as const;
const COLS = { desktop: 3, tablet: 3, phone: 1 } as const;

function toRGLLayout(widget: WidgetConfig, bp: Breakpoint): RGLItem {
  const pos: GridPos = widget.layouts[bp] ?? widget.layouts.desktop ?? { x: 0, y: 0, w: 1, h: 2 };
  return { i: widget.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h, minW: 1, minH: 1 };
}

function fromRGLLayout(l: RGLItem): GridPos {
  return { x: l.x, y: l.y, w: l.w, h: l.h };
}

function WidgetFallback() {
  return <div className="widget-card" style={{ opacity: 0.3 }} />;
}

export function DashboardGrid() {
  const { config, pages, activePageId, editMode, updateLayouts } = useDashboard();
  const [editingWidget, setEditingWidget] = useState<{ widget: WidgetConfig; pageId: string } | null>(null);

  const page = pages.find(p => p.id === activePageId);
  const widgets = page?.widgets ?? [];
  const rowHeight = config.settings.rowHeight ?? 120;

  const layouts = useMemo(() => {
    const bps: (Breakpoint)[] = ['desktop', 'tablet', 'phone'];
    return Object.fromEntries(
      bps.map(bp => [bp, widgets.map(w => toRGLLayout(w, bp))])
    );
  }, [widgets]);

  const onLayoutChange = useCallback(
    (_: RGLItem[], allLayouts: Record<string, RGLItem[]>) => {
      if (!editMode) return;
      const bps = Object.keys(allLayouts) as Breakpoint[];
      for (const bp of bps) {
        const posMap: Record<string, GridPos> = {};
        for (const l of allLayouts[bp]) {
          posMap[l.i] = fromRGLLayout(l);
        }
        updateLayouts(activePageId, posMap, bp);
      }
    },
    [editMode, activePageId, updateLayouts],
  );

  const { ref: containerRef, width: containerWidth } = useContainerWidth();

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto overflow-x-hidden ${editMode ? 'layout-mode' : ''}`}
      style={{ background: page?.backgroundImage
        ? `linear-gradient(rgba(4,8,17,${1 - (page.backgroundOpacity ?? 0.3)}),rgba(4,8,17,${1 - (page.backgroundOpacity ?? 0.3)})), url(${page.backgroundImage}) center/cover`
        : undefined,
      }}
    >
      <ResponsiveGridLayout
        width={containerWidth}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={rowHeight}
        layouts={layouts}
        margin={[10, 10]}
        containerPadding={[10, 10]}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
        useCSSTransforms
      >
        {widgets.map(widget => {
          const Component = WIDGET_MAP[widget.type];
          if (!Component) return null;
          return (
            <div key={widget.id} style={{ position: 'relative' }}>
              <Suspense fallback={<WidgetFallback />}>
                <Component widget={widget} />
              </Suspense>
              {editMode && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setEditingWidget({ widget, pageId: page?.id ?? '' }); }}
                  style={{
                    position: 'absolute', top: 6, right: 6, zIndex: 10,
                    width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--panel-2)', color: 'var(--text-muted)',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Widget bearbeiten"
                >
                  ⚙
                </button>
              )}
            </div>
          );
        })}
      </ResponsiveGridLayout>
      <WidgetEditorModal
        open={editingWidget !== null}
        widget={editingWidget?.widget ?? null}
        pageId={editingWidget?.pageId ?? ''}
        onClose={() => setEditingWidget(null)}
      />
    </div>
  );
}
