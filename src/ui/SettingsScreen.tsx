import { MenuNav } from './MenuNav';
import { SaveFilePanel } from './SaveFilePanel';
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
        <RevisionLog />
      </div>
    </main>
  );
}
