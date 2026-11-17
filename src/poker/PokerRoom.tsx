import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { ACESFilmicToneMapping } from 'three';
import { audio } from '../game/audio/audioManager';
import { useGameStore } from '../game/core/gameStore';
import { decide } from './ai';
import { cardLabel, isRed } from './cards';
import { HANDS_PER_LEVEL, PokerGame, type Action } from './game';
import { evaluate } from './hand';
import { PokerScene, type TableView } from './PokerScene';
import { useTouchDevice } from '../ui/useTouchDevice';
import { PLAYERS, STARTING_STACK, WARDEN } from './table';

const NAMES = [WARDEN, ...PLAYERS.map((player) => player.name)];
/** How long a regular takes to decide, and how long the table waits before the next card. */
const THINK_MS = [900, 1900] as const;
const DEAL_MS = 1000;
/** With the Warden out of the hand the regulars play it out briskly. */
const HURRY = 0.45;
const SPEECH_MS = 2600;

function newGame(): PokerGame {
  const game = new PokerGame(NAMES, STARTING_STACK, Math.random);
  game.startHand();
  return game;
}

function newView(): TableView {
  return {
    glow: NAMES.map(() => 0.4),
    speech: NAMES.map(() => ({ text: '', until: 0 })),
    winners: [],
  };
}

const pick = (lines: readonly string[]): string => lines[Math.floor(Math.random() * lines.length)];
const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

interface TableState {
  game: PokerGame;
  view: TableView;
}

function newTable(): TableState {
  return { game: newGame(), view: newView() };
}

function say(view: TableView, index: number, text: string): void {
  view.speech[index] = { text, until: performance.now() + SPEECH_MS };
  // Each regular squeaks at its own pitch.
  audio.play('voice', {
    pitch: 0.75 + index * 0.13,
    pan: Math.sin(PLAYERS[index - 1].angle) * -0.8,
  });
}

/** The noise an action makes, from the side of the table it was made on. */
function soundFor(game: PokerGame, index: number, potBefore: number): void {
  const acted = game.seats[index];
  const pan = index === 0 ? 0 : Math.sin(PLAYERS[index - 1].angle) * -0.8;
  if (acted.lastAction.startsWith('All in')) audio.play('allIn', { pan });
  else if (acted.lastAction === 'Fold') audio.play('fold', { pan });
  else if (acted.lastAction === 'Check') audio.play('check', { pan });
  else audio.play(game.pot - potBefore > game.blinds[1] * 4 ? 'chips' : 'chip', { pan });
}

/** The hand is over: who won, what they say about it, who has to leave, and what it earns. */
function finishHand({ game, view }: TableState, grant: (id: string) => boolean): void {
  view.winners = [...new Set(game.results.flatMap((pot) => pot.winners))];
  const won = view.winners.includes(0);
  audio.play(won ? 'pokerWin' : 'pokerLose');
  window.setTimeout(() => audio.play('rake'), 700);
  if (
    game.results.some((pot) => pot.winners.includes(0) && /^(Straight|Royal) flush/.test(pot.hand))
  ) {
    grant('royal-flush');
  }
  for (const index of view.winners) {
    if (index > 0 && Math.random() < 0.7) say(view, index, pick(PLAYERS[index - 1].quips.win));
  }
  game.seats.forEach((other, index) => {
    if (index > 0 && other.out && other.lastAction !== 'Out') {
      other.lastAction = 'Out';
      say(view, index, PLAYERS[index - 1].quips.out);
    }
  });
  if (game.champion === 0) grant('card-shark');
}

/**
 * The back room: a full no-limit Texas Hold'em table seen from the Warden's chair.
 * The rules live in PokerGame; this component gives the regulars time to think,
 * makes the noises, and puts the Warden's choices on screen.
 */
export function PokerRoom() {
  const closePoker = useGameStore((state) => state.closePoker);
  const grant = useGameStore((state) => state.grant);
  const graphics = useGameStore((state) => state.settings.graphics);
  const touch = useTouchDevice();
  // Phones get a lighter room: no shadows, fewer lights, fewer pixels.
  const lite = touch || graphics === 'low';
  const [table, setTable] = useState(newTable);
  const { game, view } = table;
  // The game object is mutated in place; this counter is what tells React it changed.
  const [version, setVersion] = useState(0);
  const [wanted, setWanted] = useState(0);
  const [found, setFound] = useState(false);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Finding the room is its own reward.
  useEffect(() => {
    if (grant('back-room')) setFound(true);
  }, [grant]);

  const seat = game.seats[0];
  const myTurn = game.toAct === 0 && !game.handOver;
  const legal = myTurn ? game.legal() : null;
  const raiseTo = legal ? clamp(wanted, legal.minRaiseTo, legal.maxRaiseTo) : 0;
  const champion = game.champion;
  const bust = seat.out;
  const { handNumber } = game;

  // The sound of a hand being dealt, once per hand.
  useEffect(() => {
    audio.play('shuffle');
    const timers = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
      window.setTimeout(
        () => audio.play('cardDeal', { pan: ((i % 4) - 1.5) * 0.4, gain: 0.8 }),
        420 + i * 130,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [game, handNumber]);

  // The regulars' turns, and the dealing of each street, on a timer.
  useEffect(() => {
    if (game.handOver || game.toAct === 0) return;
    const me = game.seats[0];
    const hurry = me.folded || me.out || me.allIn ? HURRY : 1;
    if (game.toAct > 0) {
      const index = game.toAct;
      const player = PLAYERS[index - 1];
      const delay = (THINK_MS[0] + Math.random() * (THINK_MS[1] - THINK_MS[0])) * hurry;
      const timer = window.setTimeout(() => {
        const before = game.pot;
        const choice = decide(game, player.persona, Math.random);
        // The tell: most embers burn brighter over a good hand. Hers flares when she is lying.
        view.glow[index] = player.flareOnBluff
          ? choice.bluffing
            ? 1
            : 0.35 + choice.strength * 0.2
          : 0.25 + choice.strength * 0.75;
        game.act(choice.action);
        const last = game.seats[index].lastAction;
        if (last === 'Fold' && Math.random() < 0.3) say(view, index, pick(player.quips.fold));
        if (/Raise|Bet|All in/.test(last) && Math.random() < 0.45) {
          say(view, index, pick(player.quips.raise));
        }
        soundFor(game, index, before);
        if (game.handOver) finishHand({ game, view }, grant);
        bump();
      }, delay);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      game.advance();
      if (game.handOver) finishHand({ game, view }, grant);
      else audio.play('cardFlip');
      bump();
    }, DEAL_MS * hurry);
    return () => window.clearTimeout(timer);
  }, [game, view, version, grant, bump]);

  // A soft chime when the action comes round to the Warden.
  useEffect(() => {
    if (myTurn) audio.play('yourTurn');
  }, [myTurn, handNumber]);

  const act = useCallback(
    (action: Action) => {
      if (game.toAct !== 0 || game.handOver) return;
      const before = game.pot;
      game.act(action);
      soundFor(game, 0, before);
      if (game.handOver) finishHand({ game, view }, grant);
      bump();
    },
    [game, view, grant, bump],
  );

  const nextHand = useCallback(() => {
    if (!game.handOver || game.champion >= 0 || game.seats[0].out) return;
    view.winners = [];
    game.startHand();
    bump();
  }, [game, view, bump]);

  const restart = useCallback(() => setTable(newTable()), []);

  const leave = useCallback(() => {
    audio.play('doorOpen');
    closePoker();
  }, [closePoker]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Escape') leave();
      else if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        nextHand();
      } else if (event.code === 'KeyF') act({ type: 'fold' });
      else if (event.code === 'KeyC') act({ type: 'call' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave, nextHand, act]);

  const myHand =
    seat.cards.length === 2 && !seat.folded && game.community.length >= 3
      ? evaluate([...seat.cards, ...game.community]).name
      : '';
  const [small, big] = game.blinds;
  const handsLeft = HANDS_PER_LEVEL - ((game.handNumber - 1) % HANDS_PER_LEVEL);
  const pot = game.pot;
  const acting = game.toAct > 0 ? game.seats[game.toAct].name : null;
  const summary = game.handOver
    ? game.results
        .map((result) => {
          const who = result.winners
            .map((index) => (index === 0 ? 'You' : NAMES[index]))
            .join(' and ');
          const verb = result.winners.length === 1 && result.winners[0] !== 0 ? 'wins' : 'win';
          return `${who} ${result.winners.length > 1 ? 'split' : verb} ${result.amount}${result.hand ? ` with ${result.hand}` : ''}.`;
        })
        .join(' ')
    : '';
  const presets = legal
    ? ([
        ['Min', legal.minRaiseTo],
        ['Half pot', game.currentBet + Math.round(pot / 2 / 5) * 5],
        ['Pot', game.currentBet + pot],
        ['All in', legal.maxRaiseTo],
      ] as const)
    : [];

  return (
    <div className="poker">
      <Canvas
        shadows={lite ? false : 'soft'}
        dpr={lite ? [1, 1.5] : graphics === 'high' ? [1, 2] : [1, 1.5]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        camera={{ fov: 62, near: 0.05, far: 40, position: [0, 1.62, 2.95] }}
      >
        <PokerScene game={game} view={view} version={version} lite={lite} />
      </Canvas>
      <div className="poker-vignette" />
      <div className="poker-top">
        <div className="chip">
          The Back Room · Hand {game.handNumber} · Blinds {small}/{big}
          <small> · up in {handsLeft}</small>
        </div>
        <div className="chip poker-board" aria-label="Board">
          {game.community.length === 0
            ? 'No cards on the board yet'
            : game.community.map((card) => (
                <span key={card} className={isRed(card) ? 'card-glyph red' : 'card-glyph'}>
                  {cardLabel(card)}
                </span>
              ))}
          {pot > 0 && !game.handOver && <strong>Pot {pot}</strong>}
        </div>
        <button type="button" className="chip quit" onClick={leave}>
          Leave the table <kbd>Esc</kbd>
        </button>
      </div>
      {found && <p className="poker-found">Achievement unlocked: Five Knocks</p>}

      <div className="poker-bottom">
        <div className="poker-me">
          <span>
            Your chips <strong>{seat.stack}</strong>
          </span>
          <span className="poker-cards">
            {seat.cards.map((card) => (
              <span key={card} className={isRed(card) ? 'card-glyph red' : 'card-glyph'}>
                {cardLabel(card)}
              </span>
            ))}
          </span>
          {myHand && <span className="poker-hand">{myHand}</span>}
          {seat.folded && <span className="poker-hand">Folded</span>}
        </div>

        {champion === 0 ? (
          <div className="poker-actions">
            <p className="poker-status">
              You cleaned out the table. The regulars would like it known that this never happened.
            </p>
            <button type="button" onClick={restart}>
              Play again
            </button>
          </div>
        ) : bust ? (
          <div className="poker-actions">
            <p className="poker-status">You are out of chips. {summary}</p>
            <button type="button" onClick={restart}>
              Buy back in
            </button>
          </div>
        ) : game.handOver ? (
          <div className="poker-actions">
            <p className="poker-status">{summary}</p>
            <button type="button" onClick={nextHand} autoFocus>
              Deal the next hand <kbd>Space</kbd>
            </button>
          </div>
        ) : legal ? (
          <div className="poker-actions">
            <div className="poker-buttons">
              {!legal.canCheck && (
                <button type="button" className="secondary" onClick={() => act({ type: 'fold' })}>
                  Fold <kbd>F</kbd>
                </button>
              )}
              <button type="button" onClick={() => act({ type: 'call' })}>
                {legal.canCheck
                  ? 'Check'
                  : legal.callAmount >= seat.stack
                    ? `Call all in ${legal.callAmount}`
                    : `Call ${legal.callAmount}`}{' '}
                <kbd>C</kbd>
              </button>
              {legal.canRaise && (
                <button
                  type="button"
                  className="raise"
                  onClick={() => act({ type: 'raise', to: raiseTo })}
                >
                  {raiseTo >= legal.maxRaiseTo
                    ? `All in ${legal.maxRaiseTo}`
                    : game.currentBet === 0
                      ? `Bet ${raiseTo}`
                      : `Raise to ${raiseTo}`}
                </button>
              )}
            </div>
            {legal.canRaise && legal.maxRaiseTo > legal.minRaiseTo && (
              <div className="poker-raise">
                <input
                  type="range"
                  aria-label="Raise amount"
                  min={legal.minRaiseTo}
                  max={legal.maxRaiseTo}
                  step={5}
                  value={raiseTo}
                  onChange={(event) => setWanted(Number(event.target.value))}
                />
                {presets.map(([label, amount]) => (
                  <button
                    key={label}
                    type="button"
                    className="secondary small"
                    onClick={() => setWanted(amount)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="poker-actions">
            <p className="poker-status">
              {acting ? `${acting} is thinking...` : 'The dealer turns a card...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
