import { t } from '../i18n/i18n';
/** Proctor Ashwick: a soot-grey coat, a flat cap, a moustache and very little patience. */
export function AshwickPortrait() {
  return (
    <svg
      className="portrait"
      viewBox="0 0 64 64"
      role="img"
      aria-label={t('ui.portrait.proctorAshwick')}
    >
      <circle cx="32" cy="32" r="31" fill="#2c3a34" stroke="#ffb347" strokeWidth="2" />
      <path d="M12 62c2-16 10-22 20-22s18 6 20 22z" fill="#55525e" />
      <path d="M28 40h8l-4 10z" fill="#ffb347" />
      <circle cx="32" cy="27" r="12" fill="#e2b48c" />
      <path d="M18 23c2-9 8-13 14-13s12 4 14 13c-8-3-20-3-28 0z" fill="#3c3a44" />
      <rect x="16" y="21" width="32" height="3.5" rx="1.75" fill="#2a2830" />
      <path d="M24 33c3-3 5-3 8-1 3-2 5-2 8 1-3 1-5 1-8 0-3 1-5 1-8 0z" fill="#f2efe6" />
      <circle cx="27" cy="27.5" r="1.4" fill="#2a1c14" />
      <circle cx="37" cy="27.5" r="1.4" fill="#2a1c14" />
      <path
        d="M23.5 24.5l6 1M40.5 24.5l-6 1"
        stroke="#f2efe6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Tindle: an Emberling, and proud of it. */
export function TindlePortrait() {
  return (
    <svg
      className="portrait small"
      viewBox="0 0 64 64"
      role="img"
      aria-label={t('ui.portrait.tindleTheEmberling')}
    >
      <circle cx="32" cy="32" r="31" fill="#3a2a22" stroke="#ffb347" strokeWidth="2" />
      <path d="M32 6c5 5 5 9 0 13-5-4-5-8 0-13z" fill="#ffd27a" />
      <rect x="31" y="17" width="2" height="7" fill="#7a4a1c" />
      <ellipse cx="32" cy="40" rx="15" ry="17" fill="#f0652c" />
      <circle cx="26" cy="36" r="4.2" fill="#fff6dc" />
      <circle cx="38" cy="36" r="4.2" fill="#fff6dc" />
      <circle cx="27" cy="37" r="2" fill="#1c1410" />
      <circle cx="37" cy="37" r="2" fill="#1c1410" />
      <path
        d="M27 46c3 3 7 3 10 0"
        stroke="#7a2a10"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Headmaster Professor Sprocket: round spectacles, a white moustache, and a tall top hat with
 * a clock set into its band and a sprig growing out of the top.
 */
export function SprocketPortrait({ mood = 'cheer' }: { mood?: 'cheer' | 'alarm' | 'muse' }) {
  return (
    <svg
      className={`portrait sprocket ${mood}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label={t('ui.portrait.headmasterSprocket')}
    >
      <circle cx="32" cy="32" r="31" fill="#2a2440" stroke="#e8c15a" strokeWidth="2" />
      <path d="M12 63c2-14 10-19 20-19s18 5 20 19z" fill="#5a2a3a" />
      <path d="M27 44l5 6 5-6z" fill="#fff6dc" />
      <path d="M31 47h2v8h-2z" fill="#e8c15a" />
      <circle cx="32" cy="33" r="11.5" fill="#f2c6a0" />
      <circle cx="26.5" cy="31" r="4.2" fill="#dff4ff" stroke="#c89a48" strokeWidth="1.6" />
      <circle cx="37.5" cy="31" r="4.2" fill="#dff4ff" stroke="#c89a48" strokeWidth="1.6" />
      <circle cx="26.5" cy="31.5" r={mood === 'alarm' ? 2.2 : 1.3} fill="#2a1c14" />
      <circle cx="37.5" cy="31.5" r={mood === 'alarm' ? 2.2 : 1.3} fill="#2a1c14" />
      <path d="M30.7 31h2.6" stroke="#c89a48" strokeWidth="1.4" />
      <path d="M24 38c3 2 5 1 8-1 3 2 5 3 8 1-1 3-4 4-8 2-4 2-7 1-8-2z" fill="#f4f0e8" />
      {mood === 'alarm' ? (
        <ellipse cx="32" cy="41.5" rx="2.4" ry="2" fill="#5a1c1c" />
      ) : (
        <path
          d="M29 41.5c2 1.4 4 1.4 6 0"
          stroke="#5a1c1c"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
      <rect x="20" y="20" width="24" height="3" rx="1.5" fill="#1c1824" />
      <rect x="24" y="4" width="16" height="17" rx="1" fill="#221c2c" />
      <rect x="24" y="15" width="16" height="3.5" fill="#8a2a3a" />
      <circle cx="32" cy="10.5" r="4" fill="#f4e8c8" stroke="#e8c15a" strokeWidth="1.2" />
      <path d="M32 10.5V8M32 10.5h2" stroke="#2a1c14" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M37 4c2-3 5-3 6-1-2 1-4 2-6 1z" fill="#6ab04a" />
    </svg>
  );
}

/** Warden Quill: the Academy's other Warden, in a blue coat with a feather in the cap. */
export function QuillPortrait() {
  return (
    <svg
      className="portrait"
      viewBox="0 0 64 64"
      role="img"
      aria-label={t('ui.portrait.wardenQuill')}
    >
      <circle cx="32" cy="32" r="31" fill="#1e2c44" stroke="#7ac8ff" strokeWidth="2" />
      <path d="M12 62c2-16 10-22 20-22s18 6 20 22z" fill="#2f5a8a" />
      <circle cx="32" cy="28" r="12" fill="#e8c0a0" />
      <path d="M18 22c3-8 9-11 14-11s11 3 14 11z" fill="#2a3a5a" />
      <path d="M44 14c4-6 10-8 14-6-4 2-8 6-10 12z" fill="#f4ecdc" />
      <circle cx="27" cy="28" r="1.4" fill="#2a1c14" />
      <circle cx="37" cy="28" r="1.4" fill="#2a1c14" />
      <path
        d="M27 34c3 2 7 2 10 0"
        stroke="#7a4a3a"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
