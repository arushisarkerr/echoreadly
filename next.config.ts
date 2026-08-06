import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@napi-rs/canvas",
    "unpdf",
    "tesseract.js",
    "youtube-transcript",
    "youtubei.js",
    "openai",
    "linkedom",
    "@mozilla/readability",
    "pdf-lib",
    // Keep ffmpeg-static external so its platform binary is not tree-shaken away.
    "ffmpeg-static",
  ],
  // Ensure the static FFmpeg binary is included in the TTS serverless trace (Vercel).
  outputFileTracingIncludes: {
    "/api/documents/tts": ["./node_modules/ffmpeg-static/**/*"],
  },
};

export default nextConfig;
