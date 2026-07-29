/**
 * Lightweight browser event so the library can refresh after an upload.
 */

export const LIBRARY_CHANGED_EVENT = "echoreadly:library-changed";

export function notifyLibraryChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT));
}
