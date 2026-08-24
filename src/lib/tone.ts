/**
 * ══════════════════════════════════════════════════════════════
 *  TONES — the colour vocabulary of the dashboard.
 * ══════════════════════════════════════════════════════════════
 *
 *  The rule: colour carries MEANING, never decoration.
 *
 *    brand    → identity / the primary action / "this is ours"
 *    success  → it worked, it's on, it's paid
 *    warning  → needs attention, unsaved, sandbox/test mode
 *    danger   → it failed, it's destructive, it's overdue
 *    info     → a neutral explanation, a hint, a link out
 *    neutral  → everything else — which is most things
 *
 *  Anything that is merely "a card", "an icon" or "a section" is neutral
 *  or brand. Never reach for a hue to tell two sibling cards apart: use
 *  the label, spacing, weight and order instead. When a set genuinely is
 *  a scale (a funnel, a ranking), use one brand ramp — primary-300 →
 *  primary-800 — rather than unrelated hues.
 *
 *  Each tone is a CSS variable defined once in globals.css for light and
 *  dark, so `text-success` / `bg-brand/10` / `border-danger/25` are all
 *  theme-aware on their own. Never pair them with a `dark:` variant.
 *
 *  Third-party brand marks (a Tabby or Moyasar logo) are the one
 *  exception: those keep the vendor's own colour, inside a tile that
 *  matches every other tile.
 */
export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

/**
 * Icon tile — the small rounded square that precedes a title.
 * Written out in full so Tailwind's scanner can see every class.
 */
export const TONE_TILE: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-surface-sunken text-fg-muted",
};

/** The only two tones an on/off feature may use. */
export const stateTone = (on: boolean): Tone => (on ? "success" : "neutral");
