import type {
  PdfUploadResult,
  PdfUploadStatus,
  SelectedPdf,
  SelectedPdfMeta,
} from "@/features/import/types";

const OWNER_KEY = "echoreadly-import-owner-id";
const STATE_KEY = "echoreadly-pdf-upload-state";
const LEGACY_SESSION_KEY = "echoreadly-pdf-upload-state";

export type PdfUploadStoreState = {
  status: PdfUploadStatus;
  selected: SelectedPdf | null;
  selectedMeta: SelectedPdfMeta | null;
  progress: number;
  error: string | null;
  result: PdfUploadResult | null;
};

type PersistedPdfUploadState = {
  version: 1;
  status: "success";
  selectedMeta: SelectedPdfMeta;
  progress: 100;
  error: null;
  result: PdfUploadResult;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let memoryState: PdfUploadStoreState = {
  status: "idle",
  selected: null,
  selectedMeta: null,
  progress: 0,
  error: null,
  result: null,
};

let hydrated = false;
let revalidatePromise: Promise<void> | null = null;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `owner_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function placeholderFile(meta: SelectedPdfMeta): File {
  return new File([new Uint8Array(0)], meta.name, {
    type: meta.type || "application/pdf",
  });
}

function selectedFromMeta(meta: SelectedPdfMeta): SelectedPdf {
  return {
    file: placeholderFile(meta),
    name: meta.name,
    size: meta.size,
    type: meta.type || "application/pdf",
  };
}

function metaFromResult(result: PdfUploadResult): SelectedPdfMeta {
  return {
    name: result.name,
    size: result.size,
    type: "application/pdf",
  };
}

function isValidResult(value: unknown): value is PdfUploadResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Partial<PdfUploadResult>;
  return (
    typeof result.uploadId === "string" &&
    typeof result.documentId === "string" &&
    typeof result.name === "string" &&
    typeof result.size === "number" &&
    typeof result.stagedAt === "string" &&
    typeof result.path === "string" &&
    typeof result.storagePath === "string" &&
    typeof result.mimeType === "string" &&
    typeof result.ownerId === "string"
  );
}

function normalizePersisted(raw: unknown): PersistedPdfUploadState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<PersistedPdfUploadState> & {
    status?: PdfUploadStatus;
    selectedMeta?: SelectedPdfMeta | null;
    result?: PdfUploadResult | null;
  };

  if (candidate.status !== "success" || !isValidResult(candidate.result)) {
    return null;
  }

  const selectedMeta =
    candidate.selectedMeta &&
    typeof candidate.selectedMeta.name === "string" &&
    typeof candidate.selectedMeta.size === "number"
      ? {
          name: candidate.selectedMeta.name,
          size: candidate.selectedMeta.size,
          type: candidate.selectedMeta.type || "application/pdf",
        }
      : metaFromResult(candidate.result);

  return {
    version: 1,
    status: "success",
    selectedMeta,
    progress: 100,
    error: null,
    result: candidate.result,
  };
}

function readPersisted(): PersistedPdfUploadState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const localRaw = window.localStorage.getItem(STATE_KEY);
    if (localRaw) {
      return normalizePersisted(JSON.parse(localRaw));
    }

    // Migrate any legacy sessionStorage payload from the previous persistence pass.
    const sessionRaw = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!sessionRaw) {
      return null;
    }

    const migrated = normalizePersisted(JSON.parse(sessionRaw));
    if (migrated) {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(migrated));
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }
    return migrated;
  } catch {
    return null;
  }
}

function writePersisted(state: PdfUploadStoreState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (state.status === "success" && state.result) {
      const selectedMeta = state.selectedMeta ?? metaFromResult(state.result);
      const payload: PersistedPdfUploadState = {
        version: 1,
        status: "success",
        selectedMeta,
        progress: 100,
        error: null,
        result: state.result,
      };
      window.localStorage.setItem(STATE_KEY, JSON.stringify(payload));
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
      return;
    }

    // Non-success states are intentionally not durable across hard refresh.
    // Clear any previous success only when explicitly reset via clearPdfUploadState.
  } catch {
    // Persistence is best-effort; in-memory store still survives soft navigations.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function applySuccess(persisted: PersistedPdfUploadState) {
  memoryState = {
    status: "success",
    selected: selectedFromMeta(persisted.selectedMeta),
    selectedMeta: persisted.selectedMeta,
    progress: 100,
    error: null,
    result: persisted.result,
  };
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;

  const persisted = readPersisted();
  if (!persisted) {
    return;
  }

  applySuccess(persisted);
}

export function getImportOwnerId(): string {
  if (typeof window === "undefined") {
    return createId();
  }

  const existing = window.localStorage.getItem(OWNER_KEY);
  if (existing) {
    return existing;
  }

  const next = createId();
  window.localStorage.setItem(OWNER_KEY, next);
  return next;
}

export function getPdfUploadState(): PdfUploadStoreState {
  ensureHydrated();
  return memoryState;
}

export function subscribePdfUploadStore(listener: Listener): () => void {
  const alreadyHydrated = hydrated;
  ensureHydrated();
  listeners.add(listener);

  // React hydrates Client Components from the idle server snapshot. Notify once
  // after subscribe so a persisted success state replaces idle after hard refresh.
  if (!alreadyHydrated) {
    queueMicrotask(() => {
      listener();
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

export function setPdfUploadState(
  patch: Partial<PdfUploadStoreState>,
): PdfUploadStoreState {
  ensureHydrated();
  memoryState = {
    ...memoryState,
    ...patch,
  };

  if (memoryState.status === "success" && memoryState.result) {
    const selectedMeta = memoryState.selectedMeta ?? metaFromResult(memoryState.result);
    memoryState = {
      ...memoryState,
      selectedMeta,
      selected: memoryState.selected ?? selectedFromMeta(selectedMeta),
      progress: 100,
      error: null,
    };
    writePersisted(memoryState);
  }

  emit();
  return memoryState;
}

export function clearPdfUploadState(): void {
  memoryState = {
    status: "idle",
    selected: null,
    selectedMeta: null,
    progress: 0,
    error: null,
    result: null,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STATE_KEY);
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // Ignore storage failures.
    }
  }
  emit();
}

/**
 * Confirm a restored success still exists in Supabase Storage.
 * Clears local persistence only when the remote object is confirmed missing.
 */
export async function revalidatePersistedPdfUpload(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  ensureHydrated();
  const current = memoryState;
  if (current.status !== "success" || !current.result) {
    return;
  }

  if (revalidatePromise) {
    return revalidatePromise;
  }

  revalidatePromise = (async () => {
    try {
      const path = encodeURIComponent(current.result!.storagePath || current.result!.path);
      const response = await fetch(`/api/import/pdf?storagePath=${path}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        exists?: boolean;
      };

      if (payload.ok && payload.exists === false) {
        clearPdfUploadState();
      }
    } catch {
      // Keep restored local success if verification is temporarily unavailable.
    } finally {
      revalidatePromise = null;
    }
  })();

  return revalidatePromise;
}
