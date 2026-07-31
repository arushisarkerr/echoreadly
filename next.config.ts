import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@napi-rs/canvas",
    "unpdf",
    "tesseract.js",
    "youtube-transcript",
    "linkedom",
    "@mozilla/readability",
  ],
};

export default nextConfig;
