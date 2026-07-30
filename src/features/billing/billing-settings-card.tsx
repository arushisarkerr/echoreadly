"use client";

import { useSearchParams } from "next/navigation";

import { PLAN_CATALOG } from "@/constants";
import { cn } from "@/utils";

import { useBilling } from "./use-billing";

function billingNoticeFromParams(
  flag: string | null,
): string | null {
  if (flag === "success") {
    return "Subscription updated. Welcome to Pro.";
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
 * Settings Plan & billing card — status, upgrade, manage portal.
 * Matches existing Settings section styling (no redesign).
 */
export function BillingSettingsCard() {
  const billing = useBilling();
  const searchParams = useSearchParams();
  const notice = billingNoticeFromParams(searchParams.get("billing"));
  const busy =
    billing.status === "loading" || billing.status === "redirecting";

  const entitlement = billing.entitlement;
  const pro = PLAN_CATALOG.pro;

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-5">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        Plan & billing
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        View your plan, upgrade to Pro, or manage payment methods and
        cancellation in the customer portal.
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
            <div>
              <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Billing interval
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {entitlement.billingInterval
                  ? entitlement.billingInterval === "year"
                    ? "Yearly"
                    : "Monthly"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-subtle uppercase">
                Renewal
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {entitlement.currentPeriodEnd
                  ? new Date(entitlement.currentPeriodEnd).toLocaleDateString()
                  : "—"}
                {entitlement.cancelAtPeriodEnd
                  ? " · Cancels at period end"
                  : ""}
              </dd>
            </div>
          </dl>

          {!entitlement.isPremium ? (
            <div className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Upgrade to {pro.name}
              </p>
              <p className="mt-1 text-sm text-muted">
                {pro.description} From {pro.prices.month.label}/month or{" "}
                {pro.prices.year.label}/year.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void billing.startCheckout("month");
                  }}
                  className={cn(
                    "inline-flex h-10 items-center justify-center rounded-full border border-foreground bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45",
                  )}
                >
                  {billing.status === "redirecting"
                    ? "Redirecting…"
                    : "Upgrade monthly"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void billing.startCheckout("year");
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 px-4 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Upgrade yearly
                </button>
              </div>
            </div>
          ) : (
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
          )}

          {entitlement.stripeCustomerId && !entitlement.isPremium ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void billing.openPortal();
              }}
              className="inline-flex h-9 items-center text-xs font-semibold text-muted underline-offset-2 hover:underline"
            >
              Open billing portal
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
