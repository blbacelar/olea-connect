import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildSignupAlertMessage, sendSignupSlackAlert } from "@/lib/slack/signup-alert";

const signup = {
  email: "new.member@example.org",
  fullName: "New Member",
  organizationName: "Community Foundation",
  tier: "roots" as const,
  referralCode: "OLEA-JESSICA",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Slack signup alerts", () => {
  it("sends one private notification with plain-text signup details", async () => {
    vi.stubEnv("SLACK_SIGNUP_BOT_TOKEN", "xoxb-test-token");
    vi.stubEnv("SLACK_SIGNUP_DESTINATION_ID", "C0CGLK5U6EN");
    vi.stubEnv("SLACK_SIGNUP_NOTIFY_USER_ID", "U0BD2RBB736");
    const send = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, ts: "123.456" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", send);

    await expect(sendSignupSlackAlert(signup)).resolves.toEqual({
      status: "sent",
      messageId: "123.456",
    });
    expect(send).toHaveBeenCalledTimes(1);
    const [url, options] = send.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect(options.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer xoxb-test-token",
    }));
    const body = JSON.parse(String(options.body));
    expect(body.channel).toBe("C0CGLK5U6EN");
    expect(body.blocks[1].text.text).toBe("<@U0BD2RBB736> a new account was created.");
    expect(body.blocks[2].text).toEqual(expect.objectContaining({
      type: "plain_text",
      text: expect.stringContaining("Email: new.member@example.org"),
    }));
    expect(body.blocks[2].text.text).toContain("Referral code: OLEA-JESSICA");
    expect(body.blocks[2].text.text).toContain("payment may still be pending");
  });

  it("does not make a network call without a configured bot and destination", async () => {
    vi.stubEnv("SLACK_SIGNUP_BOT_TOKEN", "");
    vi.stubEnv("SLACK_SIGNUP_DESTINATION_ID", "");
    vi.stubEnv("SLACK_SIGNUP_NOTIFY_USER_ID", "");
    const send = vi.fn();
    vi.stubGlobal("fetch", send);

    await expect(sendSignupSlackAlert(signup)).resolves.toEqual({ status: "not_configured" });
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a partial configuration and an API-level failure", async () => {
    vi.stubEnv("SLACK_SIGNUP_BOT_TOKEN", "xoxb-test-token");
    vi.stubEnv("SLACK_SIGNUP_DESTINATION_ID", "");
    vi.stubEnv("SLACK_SIGNUP_NOTIFY_USER_ID", "U0BD2RBB736");
    await expect(sendSignupSlackAlert(signup)).rejects.toThrow("configuration");

    vi.stubEnv("SLACK_SIGNUP_DESTINATION_ID", "C0CGLK5U6EN");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: false, error: "not_in_channel" }),
      { status: 200 },
    )));
    await expect(sendSignupSlackAlert(signup)).rejects.toThrow("not_in_channel");
  });

  it("keeps user text on one line and does not interpret Slack markup", () => {
    const message = buildSignupAlertMessage({
      ...signup,
      fullName: "Person\n<@U123456789>",
    }, "U0BD2RBB736");

    expect(message.blocks[2].text.type).toBe("plain_text");
    expect(message.blocks[2].text.text).toContain("Name: Person <@U123456789>");
    expect(message.blocks[2].text.text).not.toContain("Name: Person\n");
  });
});
