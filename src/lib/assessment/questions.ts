// FluentBridges placement test: public question bank.
// This file is bundled into the browser, so it must NOT contain answers.
// The answer key and explanations live in server/assessment/answerKey.ts.
//
// Design: 30 multiple-choice items, 5 per CEFR band (A1–C2), plus one
// writing task chosen from three tiers after the multiple-choice section.
// Level tags reflect the target difficulty of each item as judged by the
// author; the test is an informal placement tool, not a validated exam.

export const TEST_VERSION = "fb-placement-v1";

export const CEFR_BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrBand = (typeof CEFR_BANDS)[number];
export const CEFR_LEVELS = ["Pre-A1", ...CEFR_BANDS] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type Category = "grammar" | "vocabulary" | "reading" | "usage";

export const CATEGORY_LABELS: Record<Category | "writing", string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading comprehension",
  usage: "Sentence construction & practical use",
  writing: "Written communication",
};

export type OptionId = "a" | "b" | "c" | "d";

export type Question = {
  id: string;
  band: CefrBand;
  category: Category;
  /** Short description of the skill, used in feedback. */
  skill: string;
  passageId?: string;
  prompt: string;
  options: { id: OptionId; text: string }[];
};

export type Passage = { id: string; title: string; text: string };

const opts = (a: string, b: string, c: string, d: string) => [
  { id: "a" as const, text: a },
  { id: "b" as const, text: b },
  { id: "c" as const, text: c },
  { id: "d" as const, text: d },
];

export const PASSAGES: Passage[] = [
  {
    id: "p-message",
    title: "A message to a friend",
    text:
      "Hi Omar,\n\nI'm sorry, but I can't meet you for lunch on Thursday. My manager has asked me to attend a training course all day. Are you free on Friday instead? We could meet at the café near your office at 1:30. Let me know.\n\nThanks,\nLaila",
  },
  {
    id: "p-policy",
    title: "An email from Human Resources",
    text:
      "Subject: New flexible working policy\n\nFrom 1 March, employees may work from home for up to two days per week, provided that their manager agrees and their role does not require them to be on site. Staff who wish to take part should submit a request through the HR portal at least two weeks before they intend to start.\n\nPlease note that core hours (10:00 to 15:00) still apply, and employees must be available by phone or video call during this time. The policy will be reviewed after six months, and feedback from staff will be considered before any permanent decision is made.",
  },
  {
    id: "p-technology",
    title: "Technology at work",
    text:
      "Many organisations assume that introducing new technology will automatically make their teams more productive. In practice, the results are often disappointing. Research on workplace change suggests that the tools themselves are rarely the problem; rather, it is the absence of clear processes and adequate training that prevents people from using them effectively.\n\nWhen employees are given a new system without understanding why it was chosen or how it fits into their daily work, they tend to return to familiar habits, sometimes running old and new methods side by side. Paradoxically, this can leave them busier than before. Successful adoption, therefore, depends less on the sophistication of the technology than on how thoughtfully it is introduced.",
  },
];

export const QUESTIONS: Question[] = [
  // ── Part 1: Grammar, vocabulary and practical use (ordered by difficulty) ──
  {
    id: "a1-g1",
    band: "A1",
    category: "grammar",
    skill: "the verb “to be”",
    prompt: "Hello, my name ___ Sara. I'm from Alexandria.",
    options: opts("am", "is", "are", "be"),
  },
  {
    id: "a1-v1",
    band: "A1",
    category: "vocabulary",
    skill: "family words",
    prompt: "My father's sister is my ___.",
    options: opts("cousin", "niece", "aunt", "uncle"),
  },
  {
    id: "a1-g2",
    band: "A1",
    category: "grammar",
    skill: "present simple questions",
    prompt: "“___ you like coffee?” “Yes, I do.”",
    options: opts("Do", "Are", "Does", "Is"),
  },
  {
    id: "a1-u1",
    band: "A1",
    category: "usage",
    skill: "everyday greetings",
    prompt: "Someone asks you, “How are you?” What is the best reply?",
    options: opts("I'm 25 years old.", "I'm from Cairo.", "It's three o'clock.", "I'm fine, thanks. And you?"),
  },
  {
    id: "a1-v2",
    band: "A1",
    category: "vocabulary",
    skill: "everyday vocabulary",
    prompt: "It's very cold today. Wear your ___.",
    options: opts("coat", "sunglasses", "sandals", "swimsuit"),
  },
  {
    id: "a2-g1",
    band: "A2",
    category: "grammar",
    skill: "the past simple",
    prompt: "Last weekend we ___ to the beach with our friends.",
    options: opts("go", "have gone", "went", "were go"),
  },
  {
    id: "a2-g2",
    band: "A2",
    category: "grammar",
    skill: "the present continuous",
    prompt: "Please be quiet. The baby ___.",
    options: opts("sleeps", "is sleeping", "sleep", "are sleeping"),
  },
  {
    id: "a2-v1",
    band: "A2",
    category: "vocabulary",
    skill: "common collocations (do / make)",
    prompt: "Can you ___ me a favour? I need help carrying these boxes.",
    options: opts("make", "give", "take", "do"),
  },
  {
    id: "b1-g1",
    band: "B1",
    category: "grammar",
    skill: "the present perfect with “since”",
    prompt: "I ___ for this company since 2019.",
    options: opts("have worked", "work", "am working", "worked"),
  },
  {
    id: "b1-g2",
    band: "B1",
    category: "grammar",
    skill: "first conditional",
    prompt: "If it ___ tomorrow, we'll stay at home.",
    options: opts("will rain", "rained", "rains", "would rain"),
  },
  {
    id: "b1-v1",
    band: "B1",
    category: "vocabulary",
    skill: "phrasal verbs",
    prompt: "The meeting has been ___ until next week because the manager is travelling.",
    options: opts("put on", "put off", "put up", "put out"),
  },
  {
    id: "b1-u1",
    band: "B1",
    category: "usage",
    skill: "connecting ideas with linking words",
    prompt: "I wanted to go to the concert, ___ the tickets were sold out.",
    options: opts("so", "because", "or", "but"),
  },
  {
    id: "b2-g1",
    band: "B2",
    category: "grammar",
    skill: "word order in reported questions",
    prompt: "She asked me where ___.",
    options: opts("I lived", "did I live", "do I live", "I do live"),
  },
  {
    id: "b2-g2",
    band: "B2",
    category: "grammar",
    skill: "third conditional",
    prompt: "If we had left earlier, we ___ the train.",
    options: opts("would catch", "had caught", "would have caught", "will have caught"),
  },
  {
    id: "b2-v1",
    band: "B2",
    category: "vocabulary",
    skill: "collocations in professional contexts",
    prompt: "The new manager made a strong first ___ on the team.",
    options: opts("opinion", "impression", "appearance", "effect"),
  },
  {
    id: "b2-u1",
    band: "B2",
    category: "usage",
    skill: "contrasting ideas in one sentence",
    prompt: "Which sentence correctly combines these ideas: “Sales increased. Profits fell.”?",
    options: opts(
      "Despite sales increased, profits fell.",
      "Sales increased, therefore profits fell.",
      "Because sales increased, profits fell.",
      "Although sales increased, profits fell.",
    ),
  },
  {
    id: "c1-g1",
    band: "C1",
    category: "grammar",
    skill: "inversion for emphasis",
    prompt: "___ had I arrived at the airport than I realised I had left my passport at home.",
    options: opts("No sooner", "Hardly", "As soon as", "Only when"),
  },
  {
    id: "c1-g2",
    band: "C1",
    category: "grammar",
    skill: "“would rather” with another subject",
    prompt: "I'd rather you ___ anyone about this until the contract is signed.",
    options: opts("don't tell", "wouldn't tell", "didn't tell", "not to tell"),
  },
  {
    id: "c1-v1",
    band: "C1",
    category: "vocabulary",
    skill: "advanced collocations",
    prompt: "The company's decision to cut costs ___ widespread criticism from employees.",
    options: opts("pulled", "drew", "gave", "took"),
  },
  {
    id: "c1-u1",
    band: "C1",
    category: "usage",
    skill: "polite, indirect requests in professional writing",
    prompt: "Which is the most appropriate and correct way to make a request to a senior client?",
    options: opts(
      "Would you mind to share the figures by Friday?",
      "I wonder if you can to share the figures by Friday.",
      "I was wondering whether you might be able to share the figures by Friday.",
      "I was wondering if you will share the figures by Friday?",
    ),
  },
  {
    id: "c2-g1",
    band: "C2",
    category: "grammar",
    skill: "conditional inversion with “should”",
    prompt: "___ the proposal be submitted in its current form, the board would almost certainly reject it.",
    options: opts("Were", "Should", "Had", "Would"),
  },
  {
    id: "c2-v1",
    band: "C2",
    category: "vocabulary",
    skill: "precise academic vocabulary",
    prompt: "His explanation was so ___ that even the experts struggled to follow it.",
    options: opts("concise", "candid", "convoluted", "cogent"),
  },
  {
    id: "c2-v2",
    band: "C2",
    category: "vocabulary",
    skill: "nuanced verbs",
    prompt: "The minister's comments were widely seen as an attempt to ___ the issue rather than address it.",
    options: opts("overstep", "sidestep", "outstrip", "undergo"),
  },
  {
    id: "c2-u1",
    band: "C2",
    category: "usage",
    skill: "formal relative structures (“whereby”)",
    prompt: "Which sentence is correct?",
    options: opts(
      "The company introduced whereby a system employees can exchange shifts online.",
      "The company introduced a system whereby employees they can exchange shifts online.",
      "The company introduced a system, whereby of employees exchange shifts online.",
      "The company introduced a system whereby employees can exchange shifts online.",
    ),
  },

  // ── Part 2: Reading ──
  {
    id: "a2-r1",
    band: "A2",
    category: "reading",
    skill: "understanding the main point of a short message",
    passageId: "p-message",
    prompt: "Why can't Laila meet Omar on Thursday?",
    options: opts("She is ill.", "She has a training course.", "Omar is busy.", "The café is closed."),
  },
  {
    id: "a2-r2",
    band: "A2",
    category: "reading",
    skill: "finding specific information in a short text",
    passageId: "p-message",
    prompt: "What does Laila suggest?",
    options: opts(
      "Meeting on Thursday evening instead.",
      "Having lunch at her office.",
      "Meeting on Friday at a café near Omar's office.",
      "Cancelling their lunch completely.",
    ),
  },
  {
    id: "b1-r1",
    band: "B1",
    category: "reading",
    skill: "understanding instructions in a workplace email",
    passageId: "p-policy",
    prompt: "What must employees do before they start working from home?",
    options: opts(
      "Submit a request through the HR portal at least two weeks in advance.",
      "Ask their colleagues for permission.",
      "Work in the office for six months first.",
      "Buy their own equipment.",
    ),
  },
  {
    id: "b2-r1",
    band: "B2",
    category: "reading",
    skill: "inferring meaning from a formal text",
    passageId: "p-policy",
    prompt: "Which statement is true, according to the email?",
    options: opts(
      "All employees can work from home every day.",
      "Employees can choose their own working hours freely.",
      "Feedback will be collected after two weeks.",
      "The policy is not yet permanent.",
    ),
  },
  {
    id: "c1-r1",
    band: "C1",
    category: "reading",
    skill: "identifying a writer's main argument",
    passageId: "p-technology",
    prompt: "What is the writer's main argument?",
    options: opts(
      "New technology usually makes teams less productive.",
      "How technology is introduced matters more than how advanced it is.",
      "Employees resist change because they do not want to work hard.",
      "Organisations should avoid buying new technology.",
    ),
  },
  {
    id: "c2-r1",
    band: "C2",
    category: "reading",
    skill: "understanding a writer's use of discourse markers",
    passageId: "p-technology",
    prompt: "In the second paragraph, the word “Paradoxically” shows that…",
    options: opts(
      "the writer finds the situation amusing.",
      "the research described is unreliable.",
      "employees prefer to be busy.",
      "the outcome is the opposite of what the new system was meant to achieve.",
    ),
  },
];

export const QUESTION_IDS = QUESTIONS.map((q) => q.id);

// ── Writing ──

export type WritingTier = "foundation" | "intermediate" | "advanced";

export type WritingPrompt = {
  id: string;
  tier: WritingTier;
  title: string;
  prompt: string;
  guidance: string[];
  targetWords: [number, number];
};

export const WRITING_PROMPTS: Record<WritingTier, WritingPrompt> = {
  foundation: {
    id: "w-intro",
    tier: "foundation",
    title: "Introduce yourself",
    prompt: "Write 5–8 sentences introducing yourself and explaining why you want to improve your English.",
    guidance: ["Where do you live?", "What do you do (study or work)?", "Why do you want to learn English?"],
    targetWords: [40, 100],
  },
  intermediate: {
    id: "w-challenge",
    tier: "intermediate",
    title: "Describe a challenge",
    prompt:
      "Describe a challenge you faced at work or in your studies. Explain what happened, what you did, and what you learned from the experience.",
    guidance: ["What was the situation?", "What did you do about it?", "What would you do differently next time?"],
    targetWords: [80, 150],
  },
  advanced: {
    id: "w-opinion",
    tier: "advanced",
    title: "Give your opinion",
    prompt:
      "Some people believe that working remotely is more productive than working in an office. To what extent do you agree? Give reasons and examples to support your view.",
    guidance: ["State your position clearly.", "Support it with two or three reasons or examples.", "Acknowledge an opposing view."],
    targetWords: [150, 220],
  },
};

export const WRITING_MAX_CHARS = 3000;

export const WRITING_RUBRIC = [
  { id: "grammar", label: "Grammar", descriptor: "Accuracy and range of grammatical structures." },
  { id: "vocabulary", label: "Vocabulary", descriptor: "Range, precision, and appropriacy of word choice." },
  { id: "structure", label: "Sentence structure", descriptor: "Variety and control of simple and complex sentences." },
  { id: "coherence", label: "Coherence and clarity", descriptor: "Logical organisation, linking, and ease of reading." },
  { id: "task", label: "Task completion", descriptor: "Answers every part of the prompt at a suitable length." },
] as const;

export type RubricCriterion = (typeof WRITING_RUBRIC)[number]["id"];
export const RUBRIC_MAX_PER_CRITERION = 4;
export const RUBRIC_SCALE = [
  "0: No evidence",
  "1: Very limited",
  "2: Developing",
  "3: Good",
  "4: Strong",
];

export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
