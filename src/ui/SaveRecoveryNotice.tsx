import { useGameStore } from '../game/core/gameStore';

/** Offers the unreadable data as a file, named after when it was found. */
function download(key: string): void {
  let data: string | null;
  try {
    data = window.localStorage.getItem(key);
  } catch {
    data = null;
  }
  if (data === null) return;
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `dandori-academy-unreadable-save-${key.slice(-24).replace(/[:.]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Shown once when the stored progress could not be read at start-up: a new save was started,
 * and the old data was kept, untouched, so it can be downloaded or sent with a bug report.
 */
export function SaveRecoveryNotice() {
  const backup = useGameStore((state) => state.saveBackup);
  const dismiss = useGameStore((state) => state.dismissSaveBackup);
  if (!backup) return null;
  return (
    <div
      className="screen overlay save-recovery"
      role="alertdialog"
      aria-labelledby="save-recovery-title"
    >
      <div className="panel">
        <p className="eyebrow">Your save</p>
        <h1 id="save-recovery-title">Your progress could not be read</h1>
        <p>
          The saved progress in this browser is damaged, or from a version this one cannot read. It
          has been kept safe, untouched, and a new save started so you can play.
        </p>
        <p className="note">
          Download it to keep a copy, or to send with a bug report. If you have a save file from
          Settings, you can load it there.
        </p>
        <button type="button" onClick={() => download(backup)} autoFocus>
          Download the old save
        </button>
        <button type="button" className="secondary" onClick={dismiss}>
          Start fresh
        </button>
      </div>
    </div>
  );
}
