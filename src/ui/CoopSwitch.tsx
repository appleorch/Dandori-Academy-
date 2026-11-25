import { useGameStore } from '../game/core/gameStore';
import { t } from '../i18n/i18n';

/** The co-op switch, where co-op is offered (the story and the challenges). */
export function CoopSwitch() {
  const coop = useGameStore((state) => state.coop);
  const setCoop = useGameStore((state) => state.setCoop);
  return (
    <div className="coop-switch">
      <label>
        <input type="checkbox" checked={coop} onChange={(event) => setCoop(event.target.checked)} />
        {t('coop.toggle')}
      </label>
      {coop && <p className="note">{t('coop.help')}</p>}
    </div>
  );
}
