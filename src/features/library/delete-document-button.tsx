"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/utils";

import { requestDeleteDocument } from "./delete-document";
import { notifyLibraryChanged } from "./library-events";

type DeleteDocumentButtonProps = {
  storagePath: string;
  fileName: string;
  className?: string;
  onDeleted?: (storagePath: string) => void;
};

type Phase = "idle" | "confirm" | "deleting";

/**
 * Delete control with confirm step, loading lock, and status messaging.
 */
export function DeleteDocumentButton({
  storagePath,
  fileName,
  className,
  onDeleted,
}: DeleteDocumentButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusId = useId();

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  function clearConfirmTimer() {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
  }

  function armConfirm() {
    setError(null);
    setSuccess(false);
    setPhase("confirm");
    clearConfirmTimer();
    confirmTimeoutRef.current = setTimeout(() => {
      setPhase((current) => (current === "confirm" ? "idle" : current));
    }, 8000);
  }

  function cancelConfirm() {
    clearConfirmTimer();
    setPhase("idle");
  }

  async function confirmDelete() {
    if (phase === "deleting") {
      return;
    }

    clearConfirmTimer();
    setPhase("deleting");
    setError(null);
    setSuccess(false);

    const result = await requestDeleteDocument({ storagePath });

    if (!result.ok) {
      setError(result.error);
      setPhase("idle");
      return;
    }

    setSuccess(true);
    onDeleted?.(storagePath);
    if (!onDeleted) {
      notifyLibraryChanged();
    }  }

  if (phase === "confirm") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <button
          type="button"
          onClick={() => {
            void confirmDelete();
          }}
          className="inline-flex h-10 min-h-10 items-center justify-center rounded-full bg-[color:var(--danger)] px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-describedby={statusId}
        >
          Confirm delete
        </button>
        <button
          type="button"
          onClick={cancelConfirm}
          className="inline-flex h-10 min-h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancel
        </button>
        <p id={statusId} className="basis-full text-[0.7rem] text-muted">
          Permanently remove “{fileName}”? This cannot be undone.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-stretch gap-1", className)}>
      <button
        type="button"
        disabled={phase === "deleting"}
        aria-busy={phase === "deleting"}
        aria-describedby={error || success ? statusId : undefined}
        onClick={armConfirm}
        className={cn(
          "inline-flex h-10 min-h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          phase === "deleting"
            ? "cursor-wait text-muted opacity-70"
            : "text-foreground hover:border-danger/40 hover:text-danger",
        )}
      >
        {phase === "deleting" ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <p id={statusId} role="alert" className="text-[0.7rem] text-danger">
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p id={statusId} role="status" className="text-[0.7rem] text-muted">
          Deleted
        </p>
      ) : null}
    </div>
  );
}
