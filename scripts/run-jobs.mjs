#!/usr/bin/env node
/**
 * Dedicated worker tick — calls POST /api/jobs/worker with JOB_WORKER_SECRET.
 *
 * Usage:
 *   JOB_WORKER_SECRET=... NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run jobs:worker
 */

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const secret = process.env.JOB_WORKER_SECRET;

if (!secret) {
  console.error("JOB_WORKER_SECRET is required for jobs:worker");
  process.exit(1);
}

const response = await fetch(`${appUrl}/api/jobs/worker`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ limit: 2, runCleanup: true }),
});

const text = await response.text();
if (!response.ok) {
  console.error("Worker tick failed", response.status, text);
  process.exit(1);
}

console.log(text);
