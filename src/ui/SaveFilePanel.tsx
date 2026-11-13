import { useRef, useState, type ChangeEvent } from 'react';
import { useGameStore } from '../game/core/gameStore';
import { ACHIEVEMENTS } from '../game/progression/achievements';
import {
  MAX_SAVE_FILE_BYTES,
  readSaveFile,
  SAVE_FILE_EXTENSION,
  saveFileName,
  writeSaveFile,
} from '../game/save/saveFile';
import { emptySave, type SaveData } from '../game/save/saveManager';
import { LEVELS } from '../game/world/level';

type Status = { kind: 'ok' | 'error'; text: string } | null;
type Pending = { kind: 'load'; save: SaveData; fileName: string } | { kind: 'erase' } | null;

function describe(save: SaveData): string {
  const lessons = Math.min(save.stage, LEVELS.length);
  const achievements = Object.keys(save.achievements).length;
  return `${lessons} of ${LEVELS.length} lessons open, ${achievements} of ${ACHIEVEMENTS.length} achievements, academy total ${save.score} pts`;
}

/** Download progress to a file, load it back, or start over. */
export function SaveFilePanel() {
  const save = useGameStore((state) => state.save);
  const replaceSave = useGameStore((state) => state.replaceSave);
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState<Pending>(null);

  const download = (): void => {
    const now = new Date();
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const bytes = writeSaveFile(save, now, nonce);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = saveFileName(now);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus({ kind: 'ok', text: `Downloading ${link.download}.` });
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPending(null);
    if (file.size > MAX_SAVE_FILE_BYTES) {
      setStatus({ kind: 'error', text: 'That file is too large to be a save file.' });
      return;
    }
    const result = readSaveFile(new Uint8Array(await file.arrayBuffer()));
    if (result.ok) {
      setStatus(null);
      setPending({ kind: 'load', save: result.save, fileName: file.name });
    } else {
      setStatus({ kind: 'error', text: result.error });
    }
  };

  const confirm = (): void => {
    if (!pending) return;
    if (pending.kind === 'load') {
      replaceSave(pending.save);
      setStatus({ kind: 'ok', text: `Loaded ${pending.fileName}.` });
    } else {
      replaceSave(emptySave());
      setStatus({ kind: 'ok', text: 'Progress erased.' });
    }
    setPending(null);
  };

  return (
    <section className="save-file" aria-labelledby="save-heading">
      <h2 id="save-heading">Save file</h2>
      <p>
        Progress saves in this browser after every day. Download it as a {SAVE_FILE_EXTENSION} file
        to keep a backup or move it to another computer. Save files are sealed: one that has been
        edited is refused.
      </p>
      <p className="save-summary">Current progress: {describe(save)}.</p>
      <div className="button-row">
        <button type="button" onClick={download}>
          Download save file
        </button>
        <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
          Load save file…
        </button>
        <input
          ref={fileInput}
          id="save-file-input"
          type="file"
          accept={SAVE_FILE_EXTENSION}
          hidden
          onChange={(event) => void choose(event)}
        />
      </div>
      {pending && (
        <div className="confirm" role="alertdialog" aria-labelledby="confirm-text">
          <p id="confirm-text">
            {pending.kind === 'load'
              ? `Load ${pending.fileName}? It has ${describe(pending.save)}. This replaces your current progress.`
              : 'Erase all progress? Lessons, ranks, scores and achievements will be reset. Download a save file first if you might want them back.'}
          </p>
          <div className="button-row">
            <button
              type="button"
              className={pending.kind === 'erase' ? 'danger' : undefined}
              onClick={confirm}
              autoFocus
            >
              {pending.kind === 'load' ? 'Load this save' : 'Erase progress'}
            </button>
            <button type="button" className="secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {status && (
        <p className={status.kind === 'error' ? 'status error' : 'status'} role="status">
          {status.text}
        </p>
      )}
      <button
        type="button"
        className="secondary small"
        onClick={() => {
          setStatus(null);
          setPending({ kind: 'erase' });
        }}
      >
        Erase all progress…
      </button>
    </section>
  );
}
