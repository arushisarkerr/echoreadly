import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

/**
 * Apple touch icon — Er mark for home screen.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1210",
          color: "#eef3f1",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        Er
      </div>
    ),
    { ...size },
  );
}
