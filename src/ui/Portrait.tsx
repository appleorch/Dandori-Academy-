/** Proctor Ashwick: a soot-grey coat, a flat cap, a moustache and very little patience. */
export function AshwickPortrait() {
  return (
    <svg className="portrait" viewBox="0 0 64 64" role="img" aria-label="Proctor Ashwick">
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
      aria-label="Tindle the Emberling"
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
