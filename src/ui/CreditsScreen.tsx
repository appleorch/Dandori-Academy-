import { GAME_VERSION } from '../game/core/changelog';
import { t } from '../i18n/i18n';
import { MenuNav } from './MenuNav';

/** Who made the game and what it is made with. */
export function CreditsScreen() {
  return (
    <main className="screen">
      <div className="panel wide credits">
        <MenuNav />
        <h1>{t('credits.title')}</h1>
        <p className="brief">{t('credits.intro')}</p>
        <section>
          <h2>{t('credits.made')}</h2>
          <p>{t('credits.madeBody')}</p>
        </section>
        <section>
          <h2>{t('credits.tech')}</h2>
          <p>{t('credits.techBody')}</p>
        </section>
        <section>
          <h2>{t('credits.thanks')}</h2>
          <p>{t('credits.thanksBody')}</p>
        </section>
        <p className="note">{t('credits.version', { version: GAME_VERSION })}</p>
      </div>
    </main>
  );
}
