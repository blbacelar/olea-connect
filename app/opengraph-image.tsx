/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { siteDescription, siteTitle } from "@/lib/site-metadata";

export const runtime = "edge";
export const alt = "Olea Connects governance platform for Canadian nonprofits";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  const logoUrl = createLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#F4EFE4",
          display: "flex",
          height: "100%",
          padding: 48,
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5DCCB",
            borderRadius: 40,
            boxShadow: "0 24px 80px rgba(15, 45, 30, 0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 48,
            width: "100%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
            <div
              style={{
                alignItems: "center",
                background: "#FFF7ED",
                border: "2px solid #D69A3A",
                borderRadius: 28,
                display: "flex",
                height: 94,
                justifyContent: "center",
                width: 94,
              }}
            >
              <img
                alt=""
                height={70}
                src={logoUrl}
                style={{ objectFit: "contain" }}
                width={70}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#173F2A",
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {siteTitle}
              </div>
              <div
                style={{
                  color: "#64748B",
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Governance, branded.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
            <div
              style={{
                color: "#94A3B8",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "0.16em",
                marginBottom: 22,
                textTransform: "uppercase",
              }}
            >
              Built for Canadian nonprofits
            </div>
            <div
              style={{
                color: "#0F172A",
                fontSize: 56,
                fontWeight: 850,
                letterSpacing: "-0.045em",
                lineHeight: 1.02,
              }}
            >
              Board-ready documents, community, webinars, and funding connections.
            </div>
            <div
              style={{
                background: "#D69A3A",
                borderRadius: 999,
                height: 8,
                marginTop: 28,
                width: 160,
              }}
            />
            <div
              style={{
                color: "#475569",
                fontSize: 21,
                lineHeight: 1.35,
                marginTop: 22,
              }}
            >
              {siteDescription}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function createLogoDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="54" fill="#FFF7ED" stroke="#D69A3A" stroke-width="6"/>
      <path d="M60 91V54" stroke="#173F2A" stroke-width="6" stroke-linecap="round"/>
      <path d="M60 58C45 56 35 45 31 31M60 58C75 56 85 45 89 31M60 67C44 67 32 75 25 88M60 67C76 67 88 75 95 88M60 48C52 42 48 35 48 25M60 48C68 42 72 35 72 25" stroke="#173F2A" stroke-width="5" stroke-linecap="round"/>
      <circle cx="31" cy="31" r="5" fill="#D69A3A"/>
      <circle cx="48" cy="25" r="5" fill="#D69A3A"/>
      <circle cx="72" cy="25" r="5" fill="#D69A3A"/>
      <circle cx="89" cy="31" r="5" fill="#D69A3A"/>
      <circle cx="25" cy="88" r="5" fill="#D69A3A"/>
      <circle cx="95" cy="88" r="5" fill="#D69A3A"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
