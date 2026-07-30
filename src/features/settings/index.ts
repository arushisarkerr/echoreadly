/**
 * Settings feature — client-safe exports.
 * Server helpers: import from `@/features/settings/preferences-service` directly.
 */

export { PreferencesBootstrap } from "./preferences-bootstrap";
export {
  loadUserPreferences,
  saveUserPreferences,
} from "./preferences-client";
export { SettingsWorkspace } from "./settings-workspace";
export {
  applyReadingPreferences,
  applyThemePreference,
  persistThemePreference,
  readStoredThemePreference,
} from "./theme";
export type {
  ExportFormatPreference,
  FontSizePreference,
  ReadingWidthPreference,
  ThemePreference,
  UserPreferences,
  UserPreferencesUpdateInput,
} from "./types";
export {
  EXPORT_FORMAT_PREFERENCES,
  FONT_SIZE_PREFERENCES,
  MAX_DISPLAY_NAME_LENGTH,
  READING_WIDTH_PREFERENCES,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from "./types";
export { useSettings, type UseSettingsState } from "./use-settings";
export { useStudioPreferences } from "./use-studio-preferences";
