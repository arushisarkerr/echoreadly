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
  ],
};

export default nextConfig;
