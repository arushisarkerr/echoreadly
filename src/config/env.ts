import { APP_DEFAULT_URL } from "@/constants";

/**
 * Public environment values safe for browser and server.
 */

function normalizeEnv(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

export const publicEnv = {
  get appUrl(): string {
    return normalizeEnv(process.env.NEXT_PUBLIC_APP_URL) ?? APP_DEFAULT_URL;
  },
} as const;

export type PublicEnv = typeof publicEnv;
