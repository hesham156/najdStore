/**
 * ══════════════════════════════════════════════════════════════
 *  AI crawler groups.
 * ══════════════════════════════════════════════════════════════
 *
 *  Not all "AI bots" do the same job, and lumping them together is why
 *  so many stores accidentally make themselves invisible to ChatGPT and
 *  Perplexity while trying to protect their catalogue from training.
 *
 *  TRAINING  – reads pages to train a model. Blocking costs you nothing
 *              today; it also earns you nothing.
 *  ANSWERS   – powers live answers WITH a citation and a link back.
 *              This is the group that makes an assistant recommend you.
 *  ON_DEMAND – fetches a page only because a user asked the assistant to
 *              look at it. Blocking it means a customer who pastes your
 *              link gets "I can't access that site".
 *
 *  Agent names are the ones the vendors publish for robots.txt. Names are
 *  matched case-insensitively by crawlers, and legacy aliases are kept so
 *  older bots still honour the rule.
 */

export const AI_TRAINING_AGENTS = [
  "GPTBot",              // OpenAI — model training
  "Google-Extended",     // Google — Gemini training
  "ClaudeBot",           // Anthropic — model training
  "anthropic-ai",        // Anthropic — legacy
  "Claude-Web",          // Anthropic — legacy
  "Applebot-Extended",   // Apple — Apple Intelligence training
  "CCBot",               // Common Crawl — feeds many training sets
  "Bytespider",          // ByteDance
  "meta-externalagent",  // Meta
  "Amazonbot",           // Amazon
  "cohere-ai",           // Cohere
  "Diffbot",
  "Omgilibot",
  "Timpibot",
];

export const AI_ANSWER_AGENTS = [
  "OAI-SearchBot",       // OpenAI — powers ChatGPT search results
  "PerplexityBot",       // Perplexity — indexes for cited answers
  "Claude-SearchBot",    // Anthropic — search indexing
  "DuckAssistBot",       // DuckDuckGo AI answers
  "YouBot",              // You.com
];

export const AI_ON_DEMAND_AGENTS = [
  "ChatGPT-User",        // OpenAI — user asked ChatGPT to open a link
  "Claude-User",         // Anthropic — user asked Claude to open a link
  "Perplexity-User",     // Perplexity — user-initiated fetch
  "MistralAI-User",      // Mistral — user-initiated fetch
];

export type AiPolicy = "open" | "answers" | "blocked";

export interface AiRule {
  userAgent: string[];
  allow?: string[];
  disallow?: string[];
}

/**
 * Turns a policy into robots.txt rules.
 *
 * `answers` is the default and the one most stores want: assistants may read
 * and cite your pages, but your catalogue does not become training data.
 */
export function aiRobotRules(policy: AiPolicy, privatePaths: string[]): AiRule[] {
  if (policy === "open") {
    return [
      {
        userAgent: [...AI_TRAINING_AGENTS, ...AI_ANSWER_AGENTS, ...AI_ON_DEMAND_AGENTS],
        allow: ["/"],
        disallow: privatePaths,
      },
    ];
  }

  if (policy === "blocked") {
    return [
      {
        userAgent: [...AI_TRAINING_AGENTS, ...AI_ANSWER_AGENTS, ...AI_ON_DEMAND_AGENTS],
        disallow: ["/"],
      },
    ];
  }

  // "answers": cite me, don't train on me.
  return [
    {
      userAgent: [...AI_ANSWER_AGENTS, ...AI_ON_DEMAND_AGENTS],
      allow: ["/"],
      disallow: privatePaths,
    },
    {
      userAgent: AI_TRAINING_AGENTS,
      disallow: ["/"],
    },
  ];
}
