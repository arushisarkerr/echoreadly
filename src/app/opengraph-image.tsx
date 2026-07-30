import { ImageResponse } from "next/og";

import { siteConfig } from "@/config";

export const alt = `${siteConfig.name} — natural AI audio from your documents`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/**
 * Default Open Graph share image.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background:
            "linear-gradient(165deg, #eef3f1 0%, #dde6e2 55%, #eef3f1 100%)",
          color: "#0a1210",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#0a1210",
              color: "#eef3f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.04em",
            }}
          >
            Er
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              maxWidth: 920,
            }}
          >
            Import → Listen
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#52605b",
              lineHeight: 1.35,
              maxWidth: 860,
            }}
          >
            Drop any file. Paste any link. We will turn it into natural AI
            audio — Bangla first.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            color: "#0f766e",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Natural AI audio
        </div>
      </div>
    ),
    { ...size },
  );
}
