import { describe, expect, it } from "vitest";
import path from "path";

/**
 * Mirrors the containment check in the uploads route. Serving files by a
 * user-supplied path is only safe if the resolved target provably stays inside
 * the uploads directory — this suite is what proves it.
 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function isInsideUploads(segments: string[]): boolean {
  const target = path.resolve(UPLOAD_DIR, ...segments);
  const root = path.resolve(UPLOAD_DIR);
  return target === root || target.startsWith(root + path.sep);
}

describe("uploads path containment", () => {
  it("accepts an ordinary filename", () => {
    expect(isInsideUploads(["upload-123.png"])).toBe(true);
  });

  it("accepts a nested path", () => {
    expect(isInsideUploads(["2026", "upload-123.png"])).toBe(true);
  });

  it("rejects climbing out with ..", () => {
    expect(isInsideUploads(["..", "..", ".env"])).toBe(false);
    expect(isInsideUploads(["..", "package.json"])).toBe(false);
  });

  it("rejects a .. buried mid-path", () => {
    expect(isInsideUploads(["a", "..", "..", "..", "etc", "passwd"])).toBe(false);
  });

  it("rejects an absolute path", () => {
    // path.resolve discards earlier segments when it meets an absolute one.
    expect(isInsideUploads([path.resolve("/etc/passwd")])).toBe(false);
  });

  it("rejects a sibling directory that merely shares the prefix", () => {
    // `…/uploads-secret` starts with `…/uploads`, so a bare startsWith without
    // the separator would have let it through.
    expect(isInsideUploads(["..", "uploads-secret", "x.png"])).toBe(false);
  });

  it("stays inside for a name containing dots", () => {
    expect(isInsideUploads(["my..file.png"])).toBe(true);
  });
});
