import { MenuNav } from './MenuNav';
import { SaveFilePanel } from './SaveFilePanel';
import { ErrorLogPanel } from './ErrorLogPanel';
import { SettingsPanel } from './SettingsPanel';
import { Wardrobe } from './Wardrobe';
import { RevisionLog, VersionCallout } from './VersionInfo';

export function SettingsScreen() {
  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <VersionCallout />
        <Wardrobe />
        <SettingsPanel />
        <SaveFilePanel />
        <ErrorLogPanel />
        <RevisionLog />
      </div>
    </main>
  );
}
