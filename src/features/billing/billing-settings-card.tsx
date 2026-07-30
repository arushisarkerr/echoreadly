"use client";

import { useSearchParams } from "next/navigation";

import { useBilling } from "./use-billing";

function billingNoticeFromParams(flag: string | null): string | null {
  if (flag === "success") {
    return "Subscription updated.";
  }
  if (flag === "canceled") {
    return "Checkout canceled. Your plan was not changed.";
  }
  if (flag === "portal") {
    return "Returned from billing portal.";
  }
  return null;
}

/**
 * Account billing card — current plan status for personal use.
 */
export function BillingSettingsCard() {
  const billing = useBilling();
  const searchParams = useSearchParams();
  const notice = billingNoticeFromParams(searchParams.get("billing"));
  const busy =
    billing.status === "loading" || billing.status === "redirecting";

  const entitlement = billing.entitlement;

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5 sm:px-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Plan
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Personal use includes import, listen, translate, chat, and MP3
        downloads.
      </p>

      {notice ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground"
        >
          {notice}
        </p>
      ) : null}

      {billing.status === "loading" ? (
        <p role="status" className="mt-4 text-sm text-muted">
          Loading plan…
        </p>
      ) : null}

      {billing.error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {billing.error}
        </p>
      ) : null}

      {entitlement ? (
        <div className="mt-4 space-y-3">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Current plan
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {entitlement.planName}
                {entitlement.isTrialing ? " · Trial" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Status
              </dt>
              <dd className="mt-1 text-sm text-foreground capitalize">
                {entitlement.status.replaceAll("_", " ")}
              </dd>
            </div>
          </dl>

          {entitlement.stripeCustomerId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void billing.openPortal();
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 px-4 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
            >
              {billing.status === "redirecting"
                ? "Redirecting…"
                : "Manage subscription"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
