export function buildPackageIndexCss(primaryColor: string, secondaryColor: string) {
  return `
    :root {
      --brand-primary: ${primaryColor};
      --brand-secondary: ${secondaryColor};
      --ink: #1f2937;
      --muted: #52637a;
      --line: #d8dee8;
      --soft: #f5f8f6;
    }
    * { box-sizing: border-box; }
    body {
      background: #f3f6f8;
      color: var(--ink);
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
    }
    main {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10);
      overflow: hidden;
    }
    .accent { background: var(--brand-secondary); height: 12px; }
    .page { padding: 40px; }
    .brand-header {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 16px;
      padding-bottom: 24px;
    }
    .logo {
      align-items: center;
      background: var(--brand-primary);
      border-radius: 999px;
      color: #fff;
      display: flex;
      font-weight: 800;
      height: 56px;
      justify-content: center;
      letter-spacing: 0.08em;
      overflow: hidden;
      width: 56px;
    }
    .logo img { height: 100%; object-fit: cover; width: 100%; }
    .eyebrow {
      color: var(--brand-primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.14em;
      margin: 0 0 4px;
      text-transform: uppercase;
    }
    .org-name { color: #10233f; font-size: 20px; font-weight: 800; margin: 0; }
    h1 { color: #10233f; font-size: 34px; line-height: 1.1; margin: 32px 0 8px; }
    p { color: var(--muted); line-height: 1.5; }
    .meta {
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 14px;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 24px;
      padding: 16px;
    }
    .meta span {
      color: #74839a;
      display: block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .meta strong { color: #10233f; display: block; margin-top: 4px; }
    table { border-collapse: collapse; margin-top: 24px; width: 100%; }
    th, td {
      border: 1px solid #d8dee8;
      padding: 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--soft);
      color: var(--brand-primary);
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .warning {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      color: #7c2d12;
      margin-top: 24px;
      padding: 16px;
    }
    footer {
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      margin-top: 32px;
      padding-top: 16px;
      text-align: center;
    }
    a { color: var(--brand-primary); }
  `;
}
