// SERVER ONLY. Never import this file from src/ (it would ship answers to the browser).
// Answer key and explanations for src/lib/assessment/questions.ts (fb-placement-v1).

import type { OptionId } from "../../src/lib/assessment/questions";

export type AnswerKeyEntry = { correct: OptionId; explanation: string };

export const ANSWER_KEY: Record<string, AnswerKeyEntry> = {
  "a1-g1": { correct: "b", explanation: "“My name” is third person singular, so we use “is”." },
  "a1-v1": { correct: "c", explanation: "Your father's or mother's sister is your aunt." },
  "a1-g2": { correct: "a", explanation: "Present simple questions with “you” use “Do”." },
  "a1-u1": { correct: "d", explanation: "“I'm fine, thanks. And you?” is the natural reply to “How are you?”." },
  "a1-v2": { correct: "a", explanation: "A coat keeps you warm in cold weather." },
  "a2-g1": { correct: "c", explanation: "“Last weekend” is a finished past time, so we use the past simple “went”." },
  "a2-g2": { correct: "b", explanation: "The action is happening now, so we use the present continuous “is sleeping”." },
  "a2-v1": { correct: "d", explanation: "The fixed expression is “do someone a favour”." },
  "b1-g1": { correct: "a", explanation: "With “since” + a point in time we use the present perfect: “have worked”." },
  "b1-g2": { correct: "c", explanation: "First conditional: if + present simple, will + verb." },
  "b1-v1": { correct: "b", explanation: "“Put off” means postpone." },
  "b1-u1": { correct: "d", explanation: "“But” introduces a contrast between wanting to go and not being able to." },
  "b2-g1": { correct: "a", explanation: "Reported questions use statement word order: “where I lived”." },
  "b2-g2": { correct: "c", explanation: "Third conditional: if + past perfect, would have + past participle." },
  "b2-v1": { correct: "b", explanation: "The collocation is “make an impression (on someone)”." },
  "b2-u1": { correct: "d", explanation: "“Although” + clause shows contrast. “Despite” must be followed by a noun or -ing form." },
  "c1-g1": { correct: "a", explanation: "“No sooner … than” is the correct pairing. “Hardly” is followed by “when”." },
  "c1-g2": { correct: "c", explanation: "“Would rather” + another subject takes a past form: “I'd rather you didn't tell”." },
  "c1-v1": { correct: "b", explanation: "The collocation is “draw criticism”." },
  "c1-u1": {
    correct: "c",
    explanation: "“I was wondering whether you might be able to…” is polite and grammatically correct. “Would you mind” takes an -ing form.",
  },
  "c2-g1": { correct: "b", explanation: "“Should + subject + verb” is an inverted first conditional (= If the proposal is submitted…)." },
  "c2-v1": { correct: "c", explanation: "“Convoluted” means extremely complex and difficult to follow." },
  "c2-v2": { correct: "b", explanation: "To “sidestep” an issue is to avoid dealing with it." },
  "c2-u1": { correct: "d", explanation: "“Whereby” (= by which) introduces a relative clause directly after the noun it describes." },
  "a2-r1": { correct: "b", explanation: "Laila says her manager asked her to attend a training course all day." },
  "a2-r2": { correct: "c", explanation: "She suggests Friday at 1:30 at the café near Omar's office." },
  "b1-r1": { correct: "a", explanation: "Staff must submit a request through the HR portal at least two weeks before starting." },
  "b2-r1": { correct: "d", explanation: "The policy will be reviewed after six months before any permanent decision is made." },
  "c1-r1": {
    correct: "b",
    explanation: "The final sentence states that adoption depends less on sophistication than on how the technology is introduced.",
  },
  "c2-r1": {
    correct: "d",
    explanation: "“Paradoxically” signals a contradiction: a system meant to save time leaves people busier.",
  },
};
