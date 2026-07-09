import { existsSync } from "node:fs";

const localChromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

export async function renderHtmlToPdfBuffer(
  html: string,
  options: { footerText?: string } = {},
) {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  const executablePath = await getChromiumExecutablePath(chromium);
  const browser = await puppeteer.launch({
    args: executablePath.local
      ? ["--no-sandbox", "--disable-setuid-sandbox"]
      : chromium.args,
    executablePath: executablePath.path,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => {
      // Logo URLs are best-effort; the PDF should still render if an image host is slow.
    });
    const pdf = await page.pdf({
      displayHeaderFooter: true,
      format: "Letter",
      footerTemplate: buildFooterTemplate(options.footerText),
      headerTemplate: "<div></div>",
      margin: {
        bottom: "0.72in",
        left: "0.45in",
        right: "0.45in",
        top: "0.55in",
      },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30_000,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function buildFooterTemplate(footerText = "") {
  return `<div style="color:#52637a;font-family:Arial,sans-serif;font-size:8px;line-height:1;width:100%;padding:0 0.45in;text-align:center;">
    ${escapeHtml(footerText)}${footerText ? " | " : ""}Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;
}

async function getChromiumExecutablePath(chromium: {
  executablePath(input?: string): Promise<string>;
}) {
  for (const candidate of localChromeCandidates) {
    if (candidate && existsSync(candidate)) {
      return { local: true, path: candidate };
    }
  }

  return { local: false, path: await chromium.executablePath() };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
