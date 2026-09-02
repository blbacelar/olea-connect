import { writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { test, expect } from "../fixtures/authenticated.fixture";
import { localeCookieName } from "@/lib/i18n/locales";

type AuditFinding = {
  field: "text" | "placeholder" | "aria-label" | "title";
  label: string;
  snippets: string[];
};

type RouteAuditResult = {
  path: string;
  finalUrl: string;
  htmlLang: string | null;
  title: string;
  status: number | null;
  findings: AuditFinding[];
};

const routesToAudit = [
  "/",
  "/signup",
  "/signup/account",
  "/login",
  "/reset-password",
  "/verify-email",
  "/update-password",
  "/signup/payment",
  "/signup/success",
  "/referrals",
  "/referrals/dashboard",
  "/sponsorship",
  "/legal/terms",
  "/legal/privacy",
  "/legal/data-ownership",
  "/legal/confidentiality",
  "/dashboard",
  "/templates",
  "/team",
  "/subscription",
  "/settings/brand",
  "/settings/integrations",
  "/settings/referrals",
  "/community",
  "/grants",
  "/help",
  "/sponsors",
  "/consulting",
  "/modules/board-calendar",
  "/modules/kpi-dashboard",
  "/modules/board-recruitment",
  "/modules/ed-review/survey/unavailable",
  "/modules/ed-review",
  "/modules/grant-platform",
  "/modules/accreditation",
  "/onboarding/brand-setup",
  "/onboarding/template-selection",
  "/templates/board-self-evaluation",
  "/templates/grant-platform",
  "/templates/board-calendar-operational-workflow",
  "/webinars",
  "/webinars/manage",
  "/webinars/new",
  "/whats-new",
] as const;

const auditedEnglishPatterns = [
  ["primary navigation", /\b(Dashboard|Templates|Board Calendar|Community|Grants|Sponsors|Consulting|Brand Profile|Team|Subscription|Help|What's new|Workspace settings)\b/g],
  ["module tabs", /\b(Board Dashboard|Board Packages|Directory|Audit Log|Settings|Milestones & Risks|Annual Summary|Overview|Campaigns|Access & audit|Q[1-4] Tracker)\b/g],
  ["common actions", /\b(Browse templates|Open module|Open template|Set up now|Manage seats|Manage subscription|Send reset link|Create your account|Continue to payment|Submit|Save|Cancel|Archive|Edit|Delete|Close)\b/g],
  ["dashboard copy", /\b(Good morning|Good afternoon|Good evening|Your templates|available to you|new mentions|Recent in community|Here's what's happening|Applications upcoming|Review the current round)\b/g],
  ["subscription copy", /\b(Current Plan|Next billing date|Payment Method|Manage your membership and billing|Cancel membership|Update payment method)\b/g],
  ["form/help copy", /\b(Choose a workspace member|Required|Optional|No file chosen|Choose File|Search templates|Search posts|Search resources|No results found)\b/g],
  ["onboarding copy", /\b(Templates are coming soon|Ready to confirm|Choose more|No templates are available for selection yet|Your selections are locked|Want all templates)\b/g],
  ["webinar copy", /\b(Manage webinars|Create webinar|Back to webinars|Past recordings available to your tier|Upgrade required|No recordings available)\b/g],
  ["template editor copy", /\b(Save now|Save this template before generating document exports|Board Calendar Operational Workflow)\b/g],
  ["board calendar actions", /\b(Edit entry|Delete entry|Add Entry|Choose track|Choose category|Choose status|Choose confirmation|Cancel edit|Delete this calendar entry)\b/g],
  ["grant and sponsor actions", /\b(Submit application|Payment status|Payment reference|Create award|No grant round is available|Applications open quarterly|Create new sponsor|Choose sponsor|Choose package|Choose sponsorship)\b/g],
] as const;

function getMatchingSnippets(value: string, pattern: RegExp) {
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matches = new Set<string>();

  for (const line of lines) {
    pattern.lastIndex = 0;
    if (pattern.test(line)) {
      matches.add(line.slice(0, 220));
    }
  }

  return Array.from(matches).slice(0, 6);
}

test.describe("French Canadian full localization audit", () => {
  test.skip(
    process.env.FRENCH_AUDIT !== "1",
    "Run with FRENCH_AUDIT=1 for the manual French audit sweep.",
  );

  test("crawls public and authenticated routes for untranslated UI strings", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    expect(baseURL).toBeTruthy();
    const appUrl = new URL(baseURL!);
    await context.addCookies([
      {
        name: localeCookieName,
        value: "fr-CA",
        domain: appUrl.hostname,
        path: "/",
        sameSite: "Lax",
      },
    ]);

    const results: RouteAuditResult[] = [];

    for (const route of routesToAudit) {
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(300);
      const htmlLang = await page.locator("html").getAttribute("lang");
      expect(response?.status() ?? 0, `${route} should load successfully`).toBeLessThan(
        400,
      );
      expect(htmlLang, `${route} should keep the French Canadian document locale`).toBe(
        "fr-CA",
      );

      const pageContent = await page.evaluate(() => {
        const attributeValues = Array.from(document.querySelectorAll("*")).map(
          (element) => ({
            ariaLabel: element.getAttribute("aria-label") ?? "",
            placeholder: element.getAttribute("placeholder") ?? "",
            title: element.getAttribute("title") ?? "",
          }),
        );

        return {
          text: document.body.innerText,
          ariaLabel: attributeValues.map((item) => item.ariaLabel).join("\n"),
          placeholder: attributeValues.map((item) => item.placeholder).join("\n"),
          title: attributeValues.map((item) => item.title).join("\n"),
        };
      });

      const findings: AuditFinding[] = [];
      for (const [label, pattern] of auditedEnglishPatterns) {
        const textSnippets = getMatchingSnippets(pageContent.text, pattern);
        if (textSnippets.length > 0) {
          findings.push({ field: "text", label, snippets: textSnippets });
        }

        const placeholderSnippets = getMatchingSnippets(
          pageContent.placeholder,
          pattern,
        );
        if (placeholderSnippets.length > 0) {
          findings.push({
            field: "placeholder",
            label,
            snippets: placeholderSnippets,
          });
        }

        const ariaSnippets = getMatchingSnippets(pageContent.ariaLabel, pattern);
        if (ariaSnippets.length > 0) {
          findings.push({ field: "aria-label", label, snippets: ariaSnippets });
        }

        const titleSnippets = getMatchingSnippets(pageContent.title, pattern);
        if (titleSnippets.length > 0) {
          findings.push({ field: "title", label, snippets: titleSnippets });
        }
      }

      results.push({
        path: route,
        finalUrl: page.url(),
        htmlLang,
        title: await page.title(),
        status: response?.status() ?? null,
        findings,
      });
    }

    const outputDir = path.join(process.cwd(), "test-results");
    await mkdir(outputDir, { recursive: true });
    writeFileSync(
      path.join(outputDir, "french-full-audit.json"),
      JSON.stringify(results, null, 2),
    );

    const routesWithFindings = results.filter((result) => result.findings.length > 0);
    expect(
      routesWithFindings,
      `Untranslated French UI audit findings:\n${JSON.stringify(routesWithFindings, null, 2)}`,
    ).toHaveLength(0);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
  });
});
