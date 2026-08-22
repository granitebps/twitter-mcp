import { describe, expect, it, vi } from "vitest";

import { OfficialApiProvider } from "../../../src/providers/api/provider.js";
import { providerContract, type ContractErrorCode } from "../contract.js";

const context = () => ({ signal: new AbortController().signal, deadline: Date.now() + 1_000 });

function client() {
  return {
    v2: {
      singleTweet: vi.fn(),
      search: vi.fn(),
      userByUsername: vi.fn(),
    },
  };
}

providerContract({
  name: "Official API",
  providerName: "api",
  createProvider() {
    const fake = client();
    fake.v2.singleTweet.mockResolvedValue({ data: { id: "1", text: "one" } });
    fake.v2.search.mockResolvedValue({
      data: {
        data: [
          { id: "1", text: "one" },
          { id: "2", text: "two" },
          { id: "3", text: "three" },
        ],
      },
    });
    fake.v2.userByUsername.mockResolvedValue({
      data: { id: "42", name: "Example", username: "example" },
    });
    return new OfficialApiProvider(fake);
  },
  createErrorProvider(code: ContractErrorCode) {
    const fake = client();
    const upstream =
      code === "TIMEOUT"
        ? new Error("request timeout")
        : Object.assign(new Error("upstream failure"), {
            code: code === "NOT_FOUND" ? 404 : code === "AUTH_FAILED" ? 401 : 429,
          });
    fake.v2.singleTweet.mockRejectedValue(upstream);
    return new OfficialApiProvider(fake);
  },
});

describe("OfficialApiProvider", () => {
  it("requests the API minimum but returns the requested search count", async () => {
    const fake = client();
    fake.v2.search.mockResolvedValue({
      data: {
        data: [
          { id: "1", text: "one" },
          { id: "2", text: "two" },
          { id: "3", text: "three" },
        ],
      },
    });
    const provider = new OfficialApiProvider(fake);

    const result = await provider.searchTweets({ query: "mcp", maxResults: 2 }, context());

    expect(fake.v2.search).toHaveBeenCalledWith(
      "mcp",
      expect.objectContaining({ max_results: 10 }),
    );
    expect(result.items.map(({ id }) => id)).toEqual(["1", "2"]);
  });

  it("returns NOT_FOUND when a profile is absent", async () => {
    const fake = client();
    fake.v2.userByUsername.mockResolvedValue({ data: undefined });
    const provider = new OfficialApiProvider(fake);

    await expect(provider.getUserProfile({ username: "missing" }, context())).rejects.toMatchObject(
      { code: "NOT_FOUND", provider: "api" },
    );
  });
});
