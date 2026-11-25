import { Wardrobe } from './Wardrobe';
import { MenuNav } from './MenuNav';
import { SaveFilePanel } from './SaveFilePanel';
import { SyncPanel } from './SyncPanel';
import { ErrorLogPanel } from './ErrorLogPanel';
import { SettingsPanel } from './SettingsPanel';
import { RevisionLog, VersionCallout } from './VersionInfo';

export function SettingsScreen() {
  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <VersionCallout />
        <SettingsPanel />
        <SaveFilePanel />
        <SyncPanel />
        <ErrorLogPanel />
        <RevisionLog />
      </div>
    </main>
  );
}

/** The Wardrobe on its own screen, among the Extras. */
export function WardrobeScreen() {
  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <Wardrobe />
      </div>
    </main>
  );
}
