import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { compileEdReviewWithAi } from "@/lib/ed-review/compilation";
import type { SurveyAggregate } from "@/lib/ed-review/domain";

const aggregate: SurveyAggregate = {
  responseCount: 3,
  questionAverages: [],
  sectionAverages: [],
  deidentifiedComments: [
    "Jane Doe can be reached at jane@example.com or https://example.com.",
  ],
};

const modelSummary = {
  executive_summary:
    "Feedback indicates clear leadership with opportunities to delegate.",
  strengths: [
    { title: "Leadership", detail: "Clear direction was consistently noted." },
  ],
  growth_opportunities: [
    { title: "Delegation", detail: "More shared ownership would help." },
  ],
  cross_cutting_themes: [
    { title: "Communication", detail: "Respondents value timely updates." },
  ],
  recommended_discussion_questions: [
    "What support would enable stronger delegation?",
  ],
};

describe("ED review AI compilation", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
  });

  it("uses OpenRouter zero-retention settings and sends only re-scrubbed comments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(modelSummary) } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      compileEdReviewWithAi({
        staff: aggregate,
        partner: { ...aggregate, deidentifiedComments: [] },
      }),
    ).resolves.toEqual(modelSummary);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(options.body));
    expect(body.model).toBe("z-ai/glm-5.2");
    expect(body.provider).toEqual({
      zdr: true,
      data_collection: "deny",
      require_parameters: true,
    });
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(JSON.stringify(body)).not.toContain("Jane Doe");
    expect(JSON.stringify(body)).not.toContain("jane@example.com");
    expect(JSON.stringify(body)).not.toContain("example.com");
    expect(JSON.stringify(body)).toContain("[name removed]");
  });

  it("rejects a provider response that does not satisfy the strict summary schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({ executive_summary: "Only this" }),
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        ),
    );

    await expect(
      compileEdReviewWithAi({ staff: aggregate, partner: aggregate }),
    ).rejects.toThrow();
  });
});
