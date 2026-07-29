/**
 * Conditionally join class names without an external dependency.
 *
 * Falsy values are omitted so callers can write:
 * `cn("base", isActive && "active", className)`.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
