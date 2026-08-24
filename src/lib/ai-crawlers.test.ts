import { describe, expect, it } from "vitest";
import {
  AI_ANSWER_AGENTS,
  AI_ON_DEMAND_AGENTS,
  AI_TRAINING_AGENTS,
  aiRobotRules,
} from "./ai-crawlers";

const PRIVATE = ["/admin/", "/api/", "/checkout"];

/** Flattens the rules into "which agents may read the site at all". */
const allowedAgents = (policy: Parameters<typeof aiRobotRules>[0]) =>
  aiRobotRules(policy, PRIVATE)
    .filter((r) => r.allow?.includes("/"))
    .flatMap((r) => r.userAgent);

const blockedAgents = (policy: Parameters<typeof aiRobotRules>[0]) =>
  aiRobotRules(policy, PRIVATE)
    .filter((r) => r.disallow?.includes("/"))
    .flatMap((r) => r.userAgent);

describe("aiRobotRules", () => {
  it("lets answer engines in and keeps trainers out by default", () => {
    // This is the whole point of the "answers" policy: be citable, not trainable.
    const allowed = allowedAgents("answers");
    const blocked = blockedAgents("answers");

    for (const agent of AI_ANSWER_AGENTS) expect(allowed).toContain(agent);
    for (const agent of AI_ON_DEMAND_AGENTS) expect(allowed).toContain(agent);
    for (const agent of AI_TRAINING_AGENTS) expect(blocked).toContain(agent);
  });

  it("admits every crawler when the policy is open", () => {
    const allowed = allowedAgents("open");
    for (const agent of [...AI_TRAINING_AGENTS, ...AI_ANSWER_AGENTS, ...AI_ON_DEMAND_AGENTS]) {
      expect(allowed).toContain(agent);
    }
    expect(blockedAgents("open")).toHaveLength(0);
  });

  it("turns every crawler away when the policy is blocked", () => {
    const blocked = blockedAgents("blocked");
    for (const agent of [...AI_TRAINING_AGENTS, ...AI_ANSWER_AGENTS, ...AI_ON_DEMAND_AGENTS]) {
      expect(blocked).toContain(agent);
    }
    expect(allowedAgents("blocked")).toHaveLength(0);
  });

  it("never exposes private paths to an allowed crawler", () => {
    for (const policy of ["open", "answers"] as const) {
      for (const rule of aiRobotRules(policy, PRIVATE)) {
        if (!rule.allow?.includes("/")) continue;
        for (const path of PRIVATE) expect(rule.disallow).toContain(path);
      }
    }
  });

  it("keeps a user-initiated fetch working wherever citation is allowed", () => {
    // If ChatGPT-User is blocked, a customer who pastes a product link is told
    // the assistant cannot open the site — the worst possible outcome.
    for (const policy of ["open", "answers"] as const) {
      expect(allowedAgents(policy)).toContain("ChatGPT-User");
      expect(allowedAgents(policy)).toContain("Claude-User");
    }
  });

  it("lists no agent as both allowed and blocked", () => {
    for (const policy of ["open", "answers", "blocked"] as const) {
      const overlap = allowedAgents(policy).filter((a) => blockedAgents(policy).includes(a));
      expect(overlap).toEqual([]);
    }
  });
});
