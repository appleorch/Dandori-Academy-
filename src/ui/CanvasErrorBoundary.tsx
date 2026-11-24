import { Component, Fragment, type ReactNode } from 'react';
import { GAME_VERSION } from '../game/core/changelog';
import { recordError } from '../game/core/errorLog';
import { t } from '../i18n/i18n';

interface Props {
  children: ReactNode;
  /** Leaves the day for its menu. */
  onLeave: () => void;
}

interface State {
  error: Error | null;
  /** Bumped by Try again, to rebuild the view from scratch. */
  attempt: number;
}

/**
 * Catches a crash in the 3D view (a lost graphics context, a shader that will not compile) so it
 * never blanks the whole game: the player can try again or leave, and the error is kept in the
 * local error log for a bug report.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    recordError('3D view', error, GAME_VERSION);
  }

  override render(): ReactNode {
    if (!this.state.error)
      return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
    return (
      <div className="screen overlay" role="alertdialog" aria-labelledby="canvas-error-title">
        <div className="panel">
          <p className="eyebrow">{t('error.eyebrow')}</p>
          <h1 id="canvas-error-title">{t('error.title')}</h1>
          <p>{t('error.body')}</p>
          <p className="note">{t('error.noted')}</p>
          <button
            type="button"
            onClick={() => this.setState((state) => ({ error: null, attempt: state.attempt + 1 }))}
            autoFocus
          >
            {t('error.retry')}
          </button>
          <button type="button" className="secondary" onClick={this.props.onLeave}>
            {t('error.back')}
          </button>
        </div>
      </div>
    );
  }
}
