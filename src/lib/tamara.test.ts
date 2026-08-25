import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { isValidTamaraNotification } from "./tamara";

/**
 * Security-critical: this verifier is the ONLY thing standing between a forged
 * webhook and an order being marked PAYMENT_APPROVED for free. These tests pin
 * that it accepts a genuinely-signed HS256 token and rejects every forgery
 * class. Pure (crypto only) — runs with the database and network off.
 */

const KEY = "test-notification-token-secret";

function signHs256(payload: object, key: string, header: object = { alg: "HS256", typ: "JWT" }) {
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

describe("isValidTamaraNotification", () => {
  it("accepts a token correctly signed with the notification key", () => {
    const token = signHs256({ order_reference_id: "ORD-1", event_type: "approved" }, KEY);
    expect(isValidTamaraNotification(token, KEY)).toBe(true);
  });

  it("rejects a token signed with the wrong key", () => {
    const token = signHs256({ order_reference_id: "ORD-1" }, "attacker-guessed-key");
    expect(isValidTamaraNotification(token, KEY)).toBe(false);
  });

  it("rejects an alg:none forgery (algorithm-confusion)", () => {
    const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const p = Buffer.from(JSON.stringify({ event_type: "approved" })).toString("base64url");
    expect(isValidTamaraNotification(`${h}.${p}.`, KEY)).toBe(false);
  });

  it("rejects a tampered payload with the original signature", () => {
    const token = signHs256({ order_reference_id: "ORD-1", event_type: "declined" }, KEY);
    const [h, , sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ order_reference_id: "ORD-1", event_type: "approved" })).toString("base64url");
    expect(isValidTamaraNotification(`${h}.${forgedPayload}.${sig}`, KEY)).toBe(false);
  });

  it("rejects an arbitrary non-JWT string (the old bug accepted any token)", () => {
    expect(isValidTamaraNotification("literally-anything", KEY)).toBe(false);
  });

  it("rejects empty/missing token and missing key", () => {
    const token = signHs256({ x: 1 }, KEY);
    expect(isValidTamaraNotification("", KEY)).toBe(false);
    expect(isValidTamaraNotification(null, KEY)).toBe(false);
    expect(isValidTamaraNotification(token, "")).toBe(false);
  });

  it("rejects a malformed token (wrong segment count)", () => {
    expect(isValidTamaraNotification("a.b", KEY)).toBe(false);
    expect(isValidTamaraNotification("a.b.c.d", KEY)).toBe(false);
  });
});
