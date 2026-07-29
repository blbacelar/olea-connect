export type EmbeddedLogo =
  | {
      extension: "jpg" | "png" | "svg";
      mimeType: "image/jpeg" | "image/png" | "image/svg+xml";
      dataUrl: string;
      buffer: Buffer;
    }
  | null;

const supportedLogoTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
} as const;

export const docxSvgFallbackPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export function getEmbeddedLogo(logoUrl?: string): EmbeddedLogo {
  if (!logoUrl?.startsWith("data:")) return null;

  const match =
    /^data:(image\/png|image\/jpeg|image\/svg\+xml);base64,([a-zA-Z0-9+/=]+)$/.exec(
      logoUrl,
    );
  if (!match) return null;

  const [, mimeType, base64] = match;
  return {
    extension: supportedLogoTypes[mimeType as keyof typeof supportedLogoTypes],
    mimeType: mimeType as "image/jpeg" | "image/png",
    dataUrl: logoUrl,
    buffer: Buffer.from(base64, "base64"),
  };
}
