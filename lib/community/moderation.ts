import "server-only";

export type ModerationResult = {
  approved: boolean;
  reason?: string;
  source: "local" | "openrouter";
};

const blockedPatterns = [
  /\b(?:fuck|shit|bitch|asshole|bastard)\b/i,
  /\bkill\s+yourself\b/i,
  /\bi\s+hope\s+you\s+die\b/i,
  /\byou\s+should\s+die\b/i,
  /\b(?:idiot|moron|stupid)\b/i,
];

const suspiciousDownloadExtensions = /\.(?:apk|app|bat|cmd|com|dmg|exe|js|msi|pkg|scr|sh|vbs|wsf)(?:$|[?#])/i;
const urlShortenerHosts = new Set([
  "bit.ly",
  "cutt.ly",
  "is.gd",
  "rebrand.ly",
  "shorturl.at",
  "t.co",
  "tinyurl.com",
  "tiny.cc",
  "goo.gl",
]);
const openRouterModerationModel = "z-ai/glm-5.2";
const openRouterModerationTimeoutMs = 10_000;

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type LlmModerationDecision = {
  approved?: boolean;
  reason?: string;
};

function runLocalModeration(content: string): ModerationResult {
  const hasBlockedLanguage = blockedPatterns.some((pattern) =>
    pattern.test(content),
  );

  if (hasBlockedLanguage) {
    return {
      approved: false,
      reason:
        "Your post includes language that does not match our community guidelines. Please rewrite it in a respectful tone.",
      source: "local",
    };
  }

  return { approved: true, source: "local" };
}

function inspectResourceUrl(resourceUrl?: string | null): ModerationResult {
  if (!resourceUrl) return { approved: true, source: "local" };

  try {
    const url = new URL(resourceUrl);
    const host = url.hostname.toLowerCase();

    if (url.username || url.password) {
      return {
        approved: false,
        reason:
          "This resource link looks suspicious because it includes embedded login information. Please share a safer link.",
        source: "local",
      };
    }

    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.startsWith("xn--")) {
      return {
        approved: false,
        reason:
          "This resource link looks suspicious. Please use a clear, trusted domain.",
        source: "local",
      };
    }

    if (
      suspiciousDownloadExtensions.test(url.pathname) ||
      suspiciousDownloadExtensions.test(url.search)
    ) {
      return {
        approved: false,
        reason:
          "This resource link appears to point to a downloadable program or script. For community safety, please share a normal web page instead.",
        source: "local",
      };
    }

    if (urlShortenerHosts.has(host)) {
      return {
        approved: false,
        reason:
          "Shortened links hide the final destination. Please share the direct resource link so members can see where they are going.",
        source: "local",
      };
    }
  } catch {
    return {
      approved: false,
      reason: "Enter a valid resource link.",
      source: "local",
    };
  }

  return { approved: true, source: "local" };
}

function parseModerationDecision(content?: string): LlmModerationDecision | null {
  if (!content) return null;

  try {
    return JSON.parse(content) as LlmModerationDecision;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]) as LlmModerationDecision;
    } catch {
      return null;
    }
  }
}

export async function moderateCommunityPost(input: {
  body: string;
  resourceUrl?: string | null;
  title: string;
}): Promise<ModerationResult> {
  const content = `${input.title}\n\n${input.body}`.trim();
  const localResult = runLocalModeration(content);
  if (!localResult.approved) return localResult;

  const linkResult = inspectResourceUrl(input.resourceUrl);
  if (!linkResult.approved) return linkResult;

  if (process.env.COMMUNITY_MODERATION_DISABLE_AI === "true") {
    return localResult;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return localResult;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(openRouterModerationTimeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL ?? "https://oleaconnects.com",
      "X-OpenRouter-Title": "Olea Connects™",
    },
    body: JSON.stringify({
      model: openRouterModerationModel,
      messages: [
        {
          role: "system",
          content:
            "You are a strict but fair community safety moderator for a private nonprofit leadership community. Return only compact JSON in this exact shape: {\"approved\": boolean, \"reason\": string}. Reject harassment, hate, threats, sexual content, profanity directed at people, demeaning insults, spam, scams, unsafe instructions, suspicious links, malware, phishing, or links that appear likely to harm a user's computer. Approve ordinary disagreement when it is respectful.",
        },
        {
          role: "user",
          content: `Moderate this community post:\n\n${content}\n\nResource URL: ${input.resourceUrl ?? "none"}`,
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    console.error("OpenRouter moderation request failed", {
      status: response.status,
    });
    return {
      approved: false,
      reason:
        "We could not complete the safety check right now. Please try posting again in a moment.",
      source: "openrouter",
    };
  }

  const payload = (await response.json()) as OpenRouterChatCompletionResponse;
  const decision = parseModerationDecision(payload.choices?.[0]?.message?.content);

  if (!decision?.approved) {
    return {
      approved: false,
      reason:
        decision?.reason ??
        "Your post needs a quick rewrite before it can be shared. Please keep the conversation friendly, respectful, and safe for the community.",
      source: "openrouter",
    };
  }

  return { approved: true, source: "openrouter" };
}
