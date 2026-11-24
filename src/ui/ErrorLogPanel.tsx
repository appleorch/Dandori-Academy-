import { useState } from 'react';
import { clearErrors, errorReport, readErrors } from '../game/core/errorLog';

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
      <h2 id="errors-heading">Error log</h2>
      <p>
        {errors.length === 0
          ? 'No errors noted. If something goes wrong, it is noted here, on this device only, to paste into a bug report.'
          : `${errors.length} ${errors.length === 1 ? 'error' : 'errors'} noted on this device, the latest on ${new Date(errors[errors.length - 1].at).toLocaleString()}.`}
      </p>
      {errors.length > 0 && (
        <div className="button-row">
          <button type="button" className="secondary" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy the log'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              clearErrors();
              setErrors([]);
            }}
          >
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
