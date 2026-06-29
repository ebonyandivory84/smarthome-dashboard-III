import { useState, useEffect } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { TopBar } from './components/layout/TopBar';
import { DashboardGrid } from './components/grid/DashboardGrid';
import { SettingsModal } from './components/modals/SettingsModal';
import { WidgetLibraryModal } from './components/modals/WidgetLibraryModal';
import { initSounds } from './utils/sounds';

function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Init sounds on first user interaction
  useEffect(() => {
    const handler = () => { initSounds(); document.removeEventListener('pointerdown', handler); };
    document.addEventListener('pointerdown', handler, { once: true });
  }, []);

  return (
    <>
      <TopBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      <DashboardGrid />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WidgetLibraryModal open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  );
}
