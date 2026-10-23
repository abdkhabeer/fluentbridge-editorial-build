import { CEFR_LEVELS, type CefrLevel } from "./questions";

/** The next CEFR level up, or null at the top (C2). */
export const nextLevel = (level: CefrLevel): CefrLevel | null => CEFR_LEVELS[CEFR_LEVELS.indexOf(level) + 1] ?? null;

/** What students see instead of a single level: "A1 to A2", or just "C2" at the top. */
export const levelRange = (level: CefrLevel) => {
  const next = nextLevel(level);
  return next ? `${level} to ${next}` : level;
};
