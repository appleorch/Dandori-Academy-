import { CHANGELOG, GAME_VERSION } from '../game/core/changelog';

function formatDate(isoDay: string): string {
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** The running version and what it changed. */
export function VersionCallout() {
  const latest = CHANGELOG[0];
  return (
    <aside className="version-callout" aria-labelledby="version-heading">
      <p className="version-line">
        <strong id="version-heading">Version {GAME_VERSION}</strong>
        <span>Released {formatDate(latest.date)}</span>
      </p>
      <ul>
        {latest.changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </aside>
  );
}

/** Every release, newest first, each one expandable. */
export function RevisionLog() {
  return (
    <section className="revision-log" aria-labelledby="revisions-heading">
      <h2 id="revisions-heading">Revision history</h2>
      {CHANGELOG.map((release, index) => (
        <details key={release.version} open={index === 0}>
          <summary>
            <span className="release-version">{release.version}</span>
            <span className="release-date">{formatDate(release.date)}</span>
          </summary>
          <ul>
            {release.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
