import { useGameStore } from '../game/core/gameStore';
import { OUTFITS } from '../game/progression/outfits';

/** The Warden's outfits: earned by medals and feats, chosen here. */
export function Wardrobe() {
  const save = useGameStore((state) => state.save);
  const chosen = useGameStore((state) => state.settings.outfit);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const earned = OUTFITS.filter((outfit) => outfit.unlocked(save)).length;

  return (
    <section className="wardrobe" aria-labelledby="wardrobe-heading">
      <h2 id="wardrobe-heading">
        Wardrobe{' '}
        <small>
          {earned} of {OUTFITS.length} earned
        </small>
      </h2>
      <div className="outfits" role="radiogroup" aria-labelledby="wardrobe-heading">
        {OUTFITS.map((outfit) => {
          const open = outfit.unlocked(save);
          const worn = open && outfit.id === chosen;
          return (
            <button
              key={outfit.id}
              type="button"
              role="radio"
              aria-checked={worn}
              disabled={!open}
              className={worn ? 'outfit worn' : 'outfit'}
              onClick={() => updateSettings({ outfit: outfit.id })}
              title={outfit.requirement}
            >
              <svg viewBox="0 0 40 48" aria-hidden="true">
                <path d="M6 22 L20 10 L34 22 Z" fill={open ? outfit.hat : '#3a332c'} />
                <circle cx="20" cy="26" r="7" fill={open ? '#f2d3b1' : '#4a423a'} />
                <rect
                  x="10"
                  y="32"
                  width="20"
                  height="14"
                  rx="7"
                  fill={open ? outfit.suit : '#3a332c'}
                />
                <rect x="10" y="36" width="20" height="2.5" fill={open ? outfit.trim : '#4a423a'} />
                <circle cx="33" cy="38" r="3" fill={open ? outfit.lamp : '#4a423a'} />
              </svg>
              <strong>{open ? outfit.name : 'Locked'}</strong>
              <small>{open ? (worn ? 'Wearing' : 'Wear') : outfit.requirement}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
