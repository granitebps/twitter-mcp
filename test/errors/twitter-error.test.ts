import { describe, expect, it } from "vitest";

import { TwitterError, redactSecrets, toTwitterError } from "../../src/errors/twitter-error.js";

describe("redactSecrets", () => {
  it.each([
    ["Authorization: Bearer abc.def.ghi", "Authorization: [REDACTED]"],
    ["auth_token=secret-value", "auth_token=[REDACTED]"],
    ["ct0=csrf-value", "ct0=[REDACTED]"],
    ["RETTIWT_API_KEY=session-value", "RETTIWT_API_KEY=[REDACTED]"],
  ])("redacts %s", (input, expected) => {
    expect(redactSecrets(input)).toBe(expected);
  });
});

describe("toTwitterError", () => {
  it("preserves an existing stable error", () => {
    const error = new TwitterError({
      code: "NOT_FOUND",
      safeMessage: "Post not found",
      provider: "rettiwt",
      retryable: false,
    });

    expect(toTwitterError(error, "rettiwt")).toBe(error);
  });

  it("maps unknown failures without exposing the raw message", () => {
    const result = toTwitterError(new Error("auth_token=top-secret upstream exploded"), "api");

    expect(result).toMatchObject({
      code: "INTERNAL_ERROR",
      safeMessage: "Unexpected provider failure",
      provider: "api",
      retryable: false,
    });
    expect(result.safeMessage).not.toContain("top-secret");
  });
});
