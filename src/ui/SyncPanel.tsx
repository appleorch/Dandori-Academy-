import { useEffect, useState } from 'react';
import { useGameStore } from '../game/core/gameStore';
import {
  chooseSyncFile,
  readSyncFile,
  rememberedSyncFile,
  resumeSync,
  stopSync,
  syncFileName,
  syncSoon,
  syncSupported,
} from '../game/save/fileSync';

/** Writes every change of the save to the synced file, if one is chosen. */
export function useSaveSync(): void {
  const save = useGameStore((state) => state.save);
  useEffect(() => syncSoon(save), [save]);
}

/** Settings: keep the save in a file of your own, written as you play. */
export function SyncPanel() {
  const save = useGameStore((state) => state.save);
  const replaceSave = useGameStore((state) => state.replaceSave);
  const [name, setName] = useState<string | null>(syncFileName());
  const [waiting, setWaiting] = useState<Awaited<ReturnType<typeof rememberedSyncFile>>>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!name) void rememberedSyncFile().then(setWaiting);
  }, [name]);
  if (!syncSupported()) return null;
  return (
    <section className="settings-group">
      <h2>Sync to a file</h2>
      <p className="note">
        Choose a file and your progress is written to it as you play. Keep it in a folder a cloud
        drive syncs to carry your save between computers. Nothing goes to any server of ours.
      </p>
      {name ? (
        <>
          <p>
            Syncing to <strong>{name}</strong>.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="secondary small"
              onClick={() =>
                void readSyncFile().then((found) => {
                  if (found) {
                    replaceSave(found);
                    setNote('Loaded the save in the file.');
                  } else setNote('The file holds no save yet.');
                })
              }
            >
              Load from the file
            </button>
            <button
              type="button"
              className="secondary small"
              onClick={() => void stopSync().then(() => setName(null))}
            >
              Stop syncing
            </button>
          </div>
        </>
      ) : waiting ? (
        <button
          type="button"
          className="secondary small"
          onClick={() =>
            void resumeSync(waiting).then((ok) => {
              if (ok) setName(waiting.name);
              else setNote('The browser did not allow it.');
            })
          }
        >
          Resume syncing to {waiting.name}
        </button>
      ) : (
        <button
          type="button"
          className="secondary small"
          onClick={() =>
            void chooseSyncFile(save)
              .then(setName)
              .catch(() => setNote('No file chosen.'))
          }
        >
          Choose a file
        </button>
      )}
      {note && <p className="note">{note}</p>}
    </section>
  );
}
