import { describe, expect, it } from "vitest";
import { levelRange, nextLevel } from "./levels";

describe("level range", () => {
  it("shows the estimated band to the next band", () => {
    expect(levelRange("A1")).toBe("A1 to A2");
    expect(levelRange("B2")).toBe("B2 to C1");
    expect(levelRange("Pre-A1")).toBe("Pre-A1 to A1");
    expect(nextLevel("C1")).toBe("C2");
  });

  it("shows no range at the top band", () => {
    expect(levelRange("C2")).toBe("C2");
    expect(nextLevel("C2")).toBeNull();
  });
});
