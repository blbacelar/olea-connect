import { afterEach, describe, expect, it, vi } from "vitest";

import { brandName } from "@/lib/brand";
vi.mock("server-only", () => ({}));

import { moderateCommunityPost } from "@/lib/community/moderation";

describe("community post moderation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("blocks disrespectful language locally before publishing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");

    await expect(
      moderateCommunityPost({
        title: "Community question",
        body: "This is stupid and should not be part of the conversation.",
      }),
    ).resolves.toMatchObject({
      approved: false,
      source: "local",
    });
  });

  it("allows respectful posts when the OpenRouter moderation key is not configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");

    await expect(
      moderateCommunityPost({
        title: "Board package workflow ideas",
        body: "We are looking for kind, practical ways to prepare board packages faster.",
      }),
    ).resolves.toEqual({
      approved: true,
      source: "local",
    });
  });

  it("blocks suspicious executable resource links locally", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");

    await expect(
      moderateCommunityPost({
        title: "Useful resource",
        body: "Sharing this link for the community.",
        resourceUrl: "https://example.org/downloads/community-tool.exe",
      }),
    ).resolves.toMatchObject({
      approved: false,
      source: "local",
    });
  });

  it("uses OpenRouter moderation when configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-test-key");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.oleaconnects.com");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  approved: false,
                  reason: "Please use more respectful wording.",
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      moderateCommunityPost({
        title: "Community question",
        body: "This wording passed the local guard but the model rejected it.",
      }),
    ).resolves.toEqual({
      approved: false,
      reason: "Please use more respectful wording.",
      source: "openrouter",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer openrouter-test-key",
          "HTTP-Referer": "https://staging.oleaconnects.com",
          "X-OpenRouter-Title": brandName,
        }),
      }),
    );
  });
});
