import type { DashboardConfig } from '../types/dashboard';

export function createDefaultConfig(): DashboardConfig {
  return {
    version: 4,
    settings: {
      title: 'SmartHome',
      homeLabel: 'Home',
      rowHeight: 120,
      soundSettings: { enabled: true, volume: 0.55 },
    },
    pages: [
      {
        id: 'page-1',
        label: 'Home',
        widgets: [],
      },
    ],
  };
}
