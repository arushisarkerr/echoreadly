/**
 * Style-instruction presets for Listen (localStorage only).
 */

export type StylePresetId =
  | "warm_friendly"
  | "professional_news"
  | "audiobook"
  | "slow_learning"
  | "energetic"
  | "calm_storytelling"
  | "child_friendly"
  | "custom";

export type StylePreset = {
  id: StylePresetId;
  label: string;
  instruction: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "warm_friendly",
    label: "Warm & Friendly",
    instruction: "Read in a warm, friendly and welcoming tone.",
  },
  {
    id: "professional_news",
    label: "Professional News",
    instruction:
      "Read like a professional news presenter with clear pronunciation.",
  },
  {
    id: "audiobook",
    label: "Audiobook",
    instruction: "Narrate like a professional audiobook narrator.",
  },
  {
    id: "slow_learning",
    label: "Slow Learning",
    instruction: "Read slowly and clearly for language learners.",
  },
  {
    id: "energetic",
    label: "Energetic",
    instruction: "Read with excitement and high energy.",
  },
  {
    id: "calm_storytelling",
    label: "Calm Storytelling",
    instruction: "Tell the story in a calm, relaxing storytelling style.",
  },
  {
    id: "child_friendly",
    label: "Child Friendly",
    instruction: "Read like a gentle storyteller for children.",
  },
];

export const STYLE_PRESET_STORAGE_KEY = "echoreadly.listen.stylePresetId";
export const STYLE_CUSTOM_STORAGE_KEY = "echoreadly.listen.styleCustomText";

export function resolveStyleInstruction(
  presetId: StylePresetId,
  customText: string,
): string {
  if (presetId === "custom") {
    return customText.trim();
  }
  return (
    STYLE_PRESETS.find((item) => item.id === presetId)?.instruction ??
    STYLE_PRESETS[0].instruction
  );
}

export function readStoredStylePresetId(): StylePresetId {
  if (typeof window === "undefined") {
    return "warm_friendly";
  }
  try {
    const raw = window.localStorage.getItem(STYLE_PRESET_STORAGE_KEY)?.trim();
    if (
      raw === "custom" ||
      STYLE_PRESETS.some((item) => item.id === raw)
    ) {
      return raw as StylePresetId;
    }
  } catch {
    // ignore
  }
  return "warm_friendly";
}

export function readStoredStyleCustomText(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return window.localStorage.getItem(STYLE_CUSTOM_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeStylePresetId(id: StylePresetId): void {
  try {
    window.localStorage.setItem(STYLE_PRESET_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function storeStyleCustomText(text: string): void {
  try {
    window.localStorage.setItem(STYLE_CUSTOM_STORAGE_KEY, text);
  } catch {
    // ignore
  }
}
