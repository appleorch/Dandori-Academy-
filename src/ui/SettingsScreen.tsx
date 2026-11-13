import { MenuNav } from './MenuNav';
import { SaveFilePanel } from './SaveFilePanel';
import { SettingsPanel } from './SettingsPanel';

export function SettingsScreen() {
  return (
    <main className="screen">
      <div className="panel wide">
        <MenuNav />
        <SettingsPanel />
        <SaveFilePanel />
      </div>
    </main>
  );
}
