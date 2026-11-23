-- The Academy board. One row per player per board, lesson and difficulty: their best run.
CREATE TABLE IF NOT EXISTS posts (
  key TEXT PRIMARY KEY,          -- player|mode|level|difficulty
  player TEXT NOT NULL,
  mode TEXT NOT NULL,
  level TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  code TEXT NOT NULL,            -- the signed post, checked again by every reader
  posted TEXT NOT NULL           -- when the server took it
);
CREATE INDEX IF NOT EXISTS posts_lesson ON posts (mode, level, difficulty);

-- Players struck off the board: 16 hex digits, the first four shown as #abcd in the game.
CREATE TABLE IF NOT EXISTS banned (player TEXT PRIMARY KEY, note TEXT);
