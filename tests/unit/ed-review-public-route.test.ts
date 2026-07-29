import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getPublicEdReviewCampaign = vi.fn();
const submitEdReviewResponse = vi.fn();

vi.mock("@/lib/data/ed-review", () => ({
  getPublicEdReviewCampaign,
  submitEdReviewResponse,
}));

const routeParams = {
  params: { token: "a".repeat(43) },
};

describe("public ED review survey API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPublicEdReviewCampaign.mockResolvedValue({
      kind: "staff",
      title: "Staff feedback",
      reviewTitle: "ED/CEO annual review",
    });
    submitEdReviewResponse.mockResolvedValue(undefined);
  });

  it("rejects a cross-origin submission before resolving a campaign", async () => {
    const { POST } = await import("@/app/api/v1/public/surveys/[token]/route");
    const response = await POST(
      new Request("https://app.oleaconnects.com/api/v1/public/surveys/token", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      routeParams,
    );

    expect(response.status).toBe(403);
    expect(getPublicEdReviewCampaign).not.toHaveBeenCalled();
    expect(submitEdReviewResponse).not.toHaveBeenCalled();
  });

  it("rejects identity-bearing and malformed survey payloads without persistence", async () => {
    const { POST } = await import("@/app/api/v1/public/surveys/[token]/route");
    const response = await POST(
      new Request("https://app.oleaconnects.com/api/v1/public/surveys/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: "f7fa3f21-cc69-4c6b-9179-a07a535c3aa7",
          ratings: { S1a: 5 },
          comments: {},
          overall: {
            greatest_strength: "",
            important_change: "",
            additional_comments: "",
          },
          email: "respondent@example.com",
        }),
      }),
      routeParams,
    );

    expect(response.status).toBe(400);
    expect(submitEdReviewResponse).not.toHaveBeenCalled();
  });

  it("binds the submission kind to the campaign, not a caller-supplied value", async () => {
    const { POST } = await import("@/app/api/v1/public/surveys/[token]/route");
    const response = await POST(
      new Request("https://app.oleaconnects.com/api/v1/public/surveys/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "partner",
          idempotencyKey: "f7fa3f21-cc69-4c6b-9179-a07a535c3aa7",
          ratings: { S1a: 5 },
          comments: { S1: "Clear leadership" },
          overall: {
            greatest_strength: "",
            important_change: "",
            additional_comments: "",
          },
        }),
      }),
      routeParams,
    );

    expect(response.status).toBe(201);
    expect(submitEdReviewResponse).toHaveBeenCalledWith({
      token: routeParams.params.token,
      answers: expect.objectContaining({ kind: "staff", ratings: { S1a: 5 } }),
    });
  });
});
