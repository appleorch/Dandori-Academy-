import { PHOTO_FILTERS, useGameStore, type PhotoFilter } from '../game/core/gameStore';

const FILTER_NAMES: Record<PhotoFilter, string> = {
  none: 'None',
  warm: 'Warm',
  cool: 'Cool',
  mono: 'Black and white',
  sepia: 'Sepia',
  vivid: 'Vivid',
};

/**
 * Photo mode's controls, over a picture with no HUD: a filter, a depth of field, Sproutlings
 * cheering, and a button to save the picture. The filter and the blur shown are the ones saved.
 */
export function PhotoPanel() {
  const photo = useGameStore((state) => state.photo);
  const setPhoto = useGameStore((state) => state.setPhoto);
  const takePhoto = useGameStore((state) => state.takePhoto);
  if (!photo) return null;
  return (
    <>
      <style>{`.game canvas { filter: ${PHOTO_FILTERS[photo.filter]}; }`}</style>
      {photo.depth && <div className="photo-depth" aria-hidden="true" />}
      <div className="photo-panel" role="toolbar" aria-label="Photo mode">
        <strong>Photo mode</strong>
        <label>
          Filter{' '}
          <select
            value={photo.filter}
            onChange={(event) => setPhoto({ ...photo, filter: event.target.value as PhotoFilter })}
          >
            {(Object.keys(FILTER_NAMES) as PhotoFilter[]).map((filter) => (
              <option key={filter} value={filter}>
                {FILTER_NAMES[filter]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={photo.depth}
            onChange={(event) => setPhoto({ ...photo, depth: event.target.checked })}
          />{' '}
          Depth of field
        </label>
        <label>
          <input
            type="checkbox"
            checked={photo.cheer}
            onChange={(event) => setPhoto({ ...photo, cheer: event.target.checked })}
          />{' '}
          Sproutlings cheer
        </label>
        <button type="button" className="chip" onClick={takePhoto}>
          Save picture
        </button>
        <button type="button" className="chip" onClick={() => setPhoto(null)}>
          Back
        </button>
        <small className="note">WASD or drag to move · Q/E to turn · wheel to zoom</small>
      </div>
    </>
  );
}
