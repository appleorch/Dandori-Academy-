import { useState } from 'react';
import { clearErrors, errorReport, readErrors } from '../game/core/errorLog';
import { t } from '../i18n/i18n';

/**
 * The local error log: how many errors the game has noted, a button to copy them for a bug
 * report, and one to clear them. Nothing here is ever sent anywhere by the game.
 */
export function ErrorLogPanel() {
  const [errors, setErrors] = useState(() => readErrors());
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(errorReport(errors, navigator.userAgent));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="save-file" aria-labelledby="errors-heading">
      <h2 id="errors-heading">{t('errorLog.title')}</h2>
      <p>
        {errors.length === 0
          ? t('errorLog.none')
          : t(errors.length === 1 ? 'errorLog.one' : 'errorLog.some', {
              count: errors.length,
              when: new Date(errors[errors.length - 1].at).toLocaleString(),
            })}
      </p>
      {errors.length > 0 && (
        <div className="button-row">
          <button type="button" className="secondary" onClick={() => void copy()}>
            {copied ? t('errorLog.copied') : t('errorLog.copy')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              clearErrors();
              setErrors([]);
            }}
          >
            {t('errorLog.clear')}
          </button>
        </div>
      )}
    </section>
  );
}
