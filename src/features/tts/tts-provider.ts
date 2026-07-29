/**
 * Provider-agnostic text-to-speech abstraction.
 */

import type { TtsSynthesizeInput, TtsSynthesizeResult } from "./types";

export interface TtsProvider {
  readonly name: string;
  isConfigured(): boolean;
  synthesize(input: TtsSynthesizeInput): Promise<TtsSynthesizeResult>;
}
